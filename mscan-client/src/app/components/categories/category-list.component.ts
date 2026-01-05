import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../models/rewards.model';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.css']
})
export class CategoryListComponent implements OnInit {
  categories: Category[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  selectedCategory: Category | null = null;
  showDeleteModal = false;

  constructor(
    private categoriesService: CategoriesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.error = '';
    
    const params: any = {};
    if (this.searchQuery) {
      params.search = this.searchQuery;
    }
    
    this.categoriesService.getCategories(params).subscribe({
      next: (response) => {
        this.categories = response.categories;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load categories';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch() {
    this.loadCategories();
  }

  createCategory() {
    this.router.navigate(['/tenant/categories/create']);
  }

  editCategory(id: number) {
    this.router.navigate(['/tenant/categories/edit', id]);
  }

  confirmDelete(category: Category) {
    this.selectedCategory = category;
    this.showDeleteModal = true;
  }

  deleteCategory() {
    if (!this.selectedCategory) return;
    
    this.categoriesService.deleteCategory(this.selectedCategory.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.selectedCategory = null;
        this.loadCategories();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to delete category';
        this.showDeleteModal = false;
      }
    });
  }
}
