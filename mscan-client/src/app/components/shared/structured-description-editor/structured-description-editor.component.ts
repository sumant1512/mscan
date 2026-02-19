import { Component, Input, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TemplateAttribute, StructuredDescriptionSection } from '../../../models/templates.model';

@Component({
  selector: 'app-structured-description-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './structured-description-editor.component.html',
  styleUrls: ['./structured-description-editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StructuredDescriptionEditorComponent),
      multi: true
    }
  ]
})
export class StructuredDescriptionEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() attribute!: TemplateAttribute;

  sectionsForm: FormArray;
  onChange: any = () => {};
  onTouched: any = () => {};
  disabled = false;

  constructor(private fb: FormBuilder) {
    this.sectionsForm = this.fb.array([]);
  }

  ngOnInit() {
    // Subscribe to form changes to propagate values
    this.sectionsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onChange(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get sections(): FormArray {
    return this.sectionsForm;
  }

  get minSections(): number {
    return this.attribute?.validation_rules?.min_sections || 1;
  }

  get maxSections(): number {
    return this.attribute?.validation_rules?.max_sections || 10;
  }

  get minPoints(): number {
    return this.attribute?.validation_rules?.min_points_per_section || 1;
  }

  get maxPoints(): number {
    return this.attribute?.validation_rules?.max_points_per_section || 20;
  }

  get canAddSection(): boolean {
    return this.sections.length < this.maxSections;
  }

  get canRemoveSection(): boolean {
    return this.sections.length > this.minSections;
  }

  addSection(): void {
    const sectionGroup = this.createSectionFormGroup();
    this.sections.push(sectionGroup);
    this.onChange(this.sectionsForm.value);
  }

  removeSection(index: number): void {
    if (this.canRemoveSection) {
      this.sections.removeAt(index);
      this.onChange(this.sectionsForm.value);
    }
  }

  getBulletPoints(sectionIndex: number): FormArray {
    return this.sections.at(sectionIndex).get('bullet_points') as FormArray;
  }

  canAddPoint(sectionIndex: number): boolean {
    return this.getBulletPoints(sectionIndex).length < this.maxPoints;
  }

  canRemovePoint(sectionIndex: number): boolean {
    return this.getBulletPoints(sectionIndex).length > this.minPoints;
  }

  addBulletPoint(sectionIndex: number): void {
    if (this.canAddPoint(sectionIndex)) {
      const bulletPoints = this.getBulletPoints(sectionIndex);
      bulletPoints.push(this.fb.control('', Validators.required));
      this.onChange(this.sectionsForm.value);
    }
  }

  removeBulletPoint(sectionIndex: number, pointIndex: number): void {
    if (this.canRemovePoint(sectionIndex)) {
      const bulletPoints = this.getBulletPoints(sectionIndex);
      bulletPoints.removeAt(pointIndex);
      this.onChange(this.sectionsForm.value);
    }
  }

  private createSectionFormGroup(sectionData?: StructuredDescriptionSection): FormGroup {
    const bulletPointsArray = this.fb.array<string>([]);

    if (sectionData?.bullet_points && sectionData.bullet_points.length > 0) {
      sectionData.bullet_points.forEach((point: string) => {
        bulletPointsArray.push(this.fb.control(point, Validators.required));
      });
    } else {
      // Add minimum required bullet points
      for (let i = 0; i < this.minPoints; i++) {
        bulletPointsArray.push(this.fb.control('', Validators.required));
      }
    }

    return this.fb.group({
      heading: [sectionData?.heading || '', Validators.required],
      bullet_points: bulletPointsArray
    });
  }

  isHeadingInvalid(sectionIndex: number): boolean {
    const control = this.sections.at(sectionIndex).get('heading');
    return !!(control && control.invalid && control.touched);
  }

  isBulletPointInvalid(sectionIndex: number, pointIndex: number): boolean {
    const control = this.getBulletPoints(sectionIndex).at(pointIndex);
    return !!(control && control.invalid && control.touched);
  }

  // ControlValueAccessor implementation
  writeValue(value: StructuredDescriptionSection[]): void {
    this.sections.clear();

    if (value && Array.isArray(value)) {
      value.forEach(section => {
        this.sections.push(this.createSectionFormGroup(section));
      });
    } else if (this.minSections > 0) {
      // Add minimum required sections
      for (let i = 0; i < this.minSections; i++) {
        this.addSection();
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.sections.disable();
    } else {
      this.sections.enable();
    }
  }
}
