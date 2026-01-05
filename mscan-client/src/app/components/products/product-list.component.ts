import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/rewards.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  selectedProduct: Product | null = null;
  showDeleteModal = false;

  constructor(
    private productsService: ProductsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    this.productsService.getProducts({ search: this.searchQuery }).subscribe({
      next: (response) => {
        this.products = response.products;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load products';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch() {
    this.loadProducts();
  }

  createProduct() {
    this.router.navigate(['/tenant/products/create']);
  }

  editProduct(product: Product) {
    this.router.navigate(['/tenant/products/edit', product.id]);
  }

  confirmDelete(product: Product) {
    this.selectedProduct = product;
    this.showDeleteModal = true;
  }

  deleteProduct() {
    if (!this.selectedProduct) return;
    
    this.productsService.deleteProduct(this.selectedProduct.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.loadProducts();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to delete product';
        this.showDeleteModal = false;
      }
    });
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedProduct = null;
  }
}
