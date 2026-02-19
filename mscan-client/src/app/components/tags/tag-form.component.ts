import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core'
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TagService } from '../../services/tag.service';
import { CreateTagRequest } from '../../models/templates.model';
import { VerificationApp, VerificationAppsFacade } from '../../store/verification-apps';
import { tagsMaterialIcons } from './tags-icons';
import { AppContextService } from '../../services/app-context.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tag-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-form.component.html',
  styleUrls: ['./tag-form.component.css'],
})
export class TagFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isEditMode = false;
  tagId: string | null = null;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error: string | null = null;
  successMessage = '';
  availableApps$: Observable<VerificationApp[]>;

  // Form model
  tag = {
    name: '',
    description: '',
    icon: 'label',
    verification_app_id: '',
    is_active: true,
  };

  // Icon picker
  showIconPicker = false;
  selectedIcon = 'label';
  iconSearchTerm = '';

  // Verification apps (would come from a service in production)
  verificationApps: Array<{ id: string; name: string }> = [];

  // Material Icons list (commonly used icons)
  materialIcons = tagsMaterialIcons;

  constructor(
    private tagService: TagService,
    private route: ActivatedRoute,
    private router: Router,
    private verificationAppsFacade: VerificationAppsFacade,
    private appContextService: AppContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.availableApps$ = this.verificationAppsFacade.allApps$;
  }

  ngOnInit(): void {
    this.tagId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.tagId;

    if (this.isEditMode && this.tagId) {
      this.loadTag(this.tagId);
    } else {
      this.tag.verification_app_id = this.appContextService.getSelectedAppId() as string;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTag(id: string): void {
    this.error = null;

    this.tagService.getTagById(id)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          const tag = response.data;
          this.tag = {
            name: tag.name,
            description: tag.description || '',
            icon: tag.icon || 'label',
            verification_app_id: tag.verification_app_id,
            is_active: tag.is_active,
          };
          this.selectedIcon = this.tag.icon;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load tag');
          this.cdr.detectChanges();
        },
      });
  }

  toggleIconPicker(): void {
    this.showIconPicker = !this.showIconPicker;
  }

  selectIcon(icon: string): void {
    this.selectedIcon = icon;
    this.tag.icon = icon;
    this.showIconPicker = false;
  }

  getFilteredIcons(): string[] {
    if (!this.iconSearchTerm) {
      return this.materialIcons;
    }
    return this.materialIcons.filter((icon) =>
      icon.toLowerCase().includes(this.iconSearchTerm.toLowerCase()),
    );
  }

  validateForm(): string | null {
    if (!this.tag.name.trim()) {
      return 'Tag name is required';
    }

    if (this.tag.name.length > 100) {
      return 'Tag name must be 100 characters or less';
    }

    if (!this.tag.verification_app_id) {
      return 'Please select a verification app';
    }

    if (this.tag.description && this.tag.description.length > 250) {
      return 'Description must be 250 characters or less';
    }

    return null;
  }

  onSubmit(): void {
    const validationError = this.validateForm();
    if (validationError) {
      this.error = validationError;
      return;
    }

    this.error = null;
    this.successMessage = '';

    const request: CreateTagRequest = {
      verification_app_id: this.tag.verification_app_id,
      name: this.tag.name,
      description: this.tag.description || undefined,
      icon: this.tag.icon,
      is_active: this.tag.is_active,
    };

    if (this.isEditMode && this.tagId) {
      this.updateTag(request);
    } else {
      this.createTag(request);
    }
  }

  createTag(request: CreateTagRequest): void {
    this.tagService.createTag(request)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.successMessage = 'Tag created successfully';
          setTimeout(() => {
            this.router.navigate(['/tenant/tags']);
          }, 1500);
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to create tag');
        },
      });
  }

  updateTag(request: Partial<CreateTagRequest>): void {
    if (!this.tagId) return;

    this.tagService.updateTag(this.tagId, request)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.successMessage = 'Tag updated successfully';
          setTimeout(() => {
            this.router.navigate(['/tenant/tags']);
          }, 1500);
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to update tag');
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/tenant/tags']);
  }

  getRemainingChars(): number {
    return 250 - (this.tag.description?.length || 0);
  }
}
