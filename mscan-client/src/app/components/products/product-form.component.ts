import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../services/products.service';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../models/rewards.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css']
})
export class ProductFormComponent implements OnInit {
  productForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  isEditMode = false;
  productId: number | null = null;
  categories: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      product_name: ['', [Validators.required, Validators.minLength(2)]],
      product_sku: [''],
      description: [''],
      category_id: [''],
      price: ['', [Validators.min(0)]],
      currency: ['USD'],
      image_url: [''],
      is_active: [true]
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = +params['id'];
        this.loadProduct();
      }
    });
  }

  loadCategories() {
    this.categoriesService.getCategories({ limit: 100 }).subscribe({
      next: (response) => {
        this.categories = response.categories.filter((c: Category) => c.is_active);
      },
      error: (err) => {
        console.error('Load categories error:', err);
      }
    });
  }

  loadProduct() {
    if (!this.productId) return;
    
    this.loading = true;
    this.productsService.getProduct(this.productId).subscribe({
      next: (response) => {
        this.productForm.patchValue(response.product);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load product';
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.controls[key].markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = this.productForm.value;

    const request = this.isEditMode && this.productId
      ? this.productsService.updateProduct(this.productId, formData)
      : this.productsService.createProduct(formData);

    request.subscribe({
      next: (response) => {
        this.success = response.message;
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/tenant/products']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to save product';
        this.loading = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/tenant/products']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.productForm.get(fieldName);
    if (field?.errors?.['required']) return `${fieldName} is required`;
    if (field?.errors?.['minlength']) return `${fieldName} is too short`;
    if (field?.errors?.['min']) return `${fieldName} must be positive`;
    return '';
  }
}
