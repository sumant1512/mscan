import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoriesService } from '../../services/categories.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.css']
})
export class CategoryFormComponent implements OnInit {
  categoryForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  isEditMode = false;
  categoryId: number | null = null;

  materialIcons = [
    'category', 'shopping_cart', 'local_offer', 'store', 'inventory',
    'devices', 'computer', 'phone_iphone', 'headphones', 'watch',
    'checkroom', 'child_care', 'toys', 'sports_soccer', 'fitness_center',
    'restaurant', 'local_cafe', 'cake', 'local_pizza', 'fastfood',
    'home', 'kitchen', 'weekend', 'deck', 'grass',
    'palette', 'brush', 'auto_stories', 'music_note', 'movie',
    'pets', 'spa', 'self_improvement', 'favorite', 'health_and_safety'
  ];

  constructor(
    private fb: FormBuilder,
    private categoriesService: CategoriesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      icon: ['category'],
      is_active: [true]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.categoryId = +id;
      this.loadCategory();
    }
  }

  loadCategory() {
    if (!this.categoryId) return;
    
    this.loading = true;
    this.categoriesService.getCategory(this.categoryId).subscribe({
      next: (response) => {
        this.categoryForm.patchValue(response.category);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load category';
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid) {
      Object.keys(this.categoryForm.controls).forEach(key => {
        this.categoryForm.controls[key].markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';
    
    const data = this.categoryForm.value;
    
    const request = this.isEditMode && this.categoryId
      ? this.categoriesService.updateCategory(this.categoryId, data)
      : this.categoriesService.createCategory(data);
    
    request.subscribe({
      next: (response) => {
        this.success = `Category ${this.isEditMode ? 'updated' : 'created'} successfully!`;
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/tenant/categories']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.error || `Failed to ${this.isEditMode ? 'update' : 'create'} category`;
        this.loading = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/tenant/categories']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.categoryForm.get(fieldName);
    if (field?.errors?.['required']) {
      return 'This field is required';
    }
    if (field?.errors?.['minlength']) {
      return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    return '';
  }
}
