import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/rewards.model';
import { AppContextService } from '../../services/app-context.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  selectedProduct: Product | null = null;
  showDeleteModal = false;
  private appContextSubscription?: Subscription;

  // Permission flags
  canCreateProduct = false;
  canEditProduct = false;
  canDeleteProduct = false;

  constructor(
    private productsService: ProductsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private appContextService: AppContextService,
    private authService: AuthService
  ) {
    this.canCreateProduct = this.authService.hasPermission('create_product');
    this.canEditProduct = this.authService.hasPermission('edit_product');
    this.canDeleteProduct = this.authService.hasPermission('delete_product');
  }

  ngOnInit() {
    this.loadProducts();
    
    // Reload products when app selection changes
    this.appContextSubscription = this.appContextService.appContext$.subscribe(() => {
      this.loadProducts();
    });
  }

  ngOnDestroy() {
    this.appContextSubscription?.unsubscribe();
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    
    // Get selected app ID
    const selectedAppId = this.appContextService.getSelectedAppId();
    
    const params: any = {
      search: this.searchQuery
    };
    
    // Only add app_id filter if a specific app is selected
    if (selectedAppId !== null) {
      params.app_id = selectedAppId;
    }
    
    this.productsService.getProducts(params).subscribe({
      next: (response) => {
        this.products = response.products || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load products';
        this.products = [];
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

  // Helper methods for variant pricing display
  getProductPriceDisplay(product: any): string {
    // Check if product has variants in attributes
    const variants = product.attributes?.product_variants;

    if (variants && Array.isArray(variants) && variants.length > 0) {
      // Get prices from all variants
      const prices = variants
        .map((v: any) => parseFloat(v.price) || 0)
        .filter((p: number) => p > 0);

      if (prices.length === 0) {
        return product.price ? `${product.currency || 'USD'} ${product.price}` : 'Price varies';
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        return `${product.currency || 'USD'} ${minPrice.toFixed(2)}`;
      }

      return `${product.currency || 'USD'} ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
    }

    // Fallback to standard price if no variants
    return product.price ? `${product.currency || 'USD'} ${product.price}` : '';
  }

  hasVariants(product: any): boolean {
    const variants = product.attributes?.product_variants;
    return variants && Array.isArray(variants) && variants.length > 1;
  }

  getVariantCount(product: any): number {
    const variants = product.attributes?.product_variants;
    return variants && Array.isArray(variants) ? variants.length : 0;
  }
}
