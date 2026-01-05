/**
 * Category Management Component
 * Manages product categories for tenant admin
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Category {
  id: string;
  name: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface CategoryResponse {
  success: boolean;
  message?: string;
  data?: {
    category?: Category;
    categories?: Category[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.css']
})
export class CategoryManagementComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  
  // Pagination
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  limit = 10;
  
  // Form state
  showCreateForm = signal<boolean>(false);
  editingCategory = signal<Category | null>(null);
  categoryName = signal<string>('');

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Load categories with pagination
   */
  loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<CategoryResponse>(
      `${this.apiUrl}/categories?page=${this.currentPage()}&limit=${this.limit}`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories.set(response.data.categories || []);
          if (response.data.pagination) {
            this.totalPages.set(response.data.pagination.totalPages);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load categories');
        this.loading.set(false);
      }
    });
  }

  /**
   * Open create category form
   */
  openCreateForm(): void {
    this.showCreateForm.set(true);
    this.editingCategory.set(null);
    this.categoryName.set('');
    this.error.set(null);
    this.success.set(null);
  }

  /**
   * Open edit category form
   */
  editCategory(category: Category): void {
    this.editingCategory.set(category);
    this.categoryName.set(category.name);
    this.showCreateForm.set(true);
    this.error.set(null);
    this.success.set(null);
  }

  /**
   * Save category (create or update)
   */
  saveCategory(): void {
    const name = this.categoryName().trim();
    if (!name) {
      this.error.set('Category name is required');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const editing = this.editingCategory();
    const request = editing
      ? this.http.put<CategoryResponse>(
          `${this.apiUrl}/categories/${editing.id}`,
          { name },
          { headers }
        )
      : this.http.post<CategoryResponse>(
          `${this.apiUrl}/categories`,
          { name },
          { headers }
        );

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set(
            editing
              ? 'Category updated successfully'
              : 'Category created successfully'
          );
          this.showCreateForm.set(false);
          this.categoryName.set('');
          this.editingCategory.set(null);
          this.loadCategories();
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save category');
        this.loading.set(false);
      }
    });
  }

  /**
   * Delete category
   */
  deleteCategory(id: string): void {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.delete<CategoryResponse>(
      `${this.apiUrl}/categories/${id}`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set('Category deleted successfully');
          this.loadCategories();
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to delete category');
        this.loading.set(false);
      }
    });
  }

  /**
   * Cancel form
   */
  cancelForm(): void {
    this.showCreateForm.set(false);
    this.editingCategory.set(null);
    this.categoryName.set('');
    this.error.set(null);
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadCategories();
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadCategories();
    }
  }
}
