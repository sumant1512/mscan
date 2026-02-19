import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductsFacade } from '../../store/products/products.facade';
import { Product } from '../../store/products/products.models';
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
  private destroy$ = new Subject<void>();
  private productsFacade = inject(ProductsFacade);

  products$ = this.productsFacade.products$;
  loading$ = this.productsFacade.loading$;
  error$ = this.productsFacade.error$;

  successMessage = '';
  searchQuery = '';
  selectedProduct: Product | null = null;
  showDeleteModal = false;

  // Permission flags
  canCreateProduct = false;
  canEditProduct = false;
  canDeleteProduct = false;

  constructor(
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
    this.appContextService.appContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadProducts();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    this.successMessage = '';
    this.productsFacade.clearError();

    // Get selected app ID
    const selectedAppId = this.appContextService.getSelectedAppId();

    const filter: any = {
      search: this.searchQuery
    };

    // Only add app_id filter if a specific app is selected
    if (selectedAppId !== null) {
      filter.app_id = selectedAppId;
    }

    this.productsFacade.loadProducts(filter);
  }

  onSearch() {
    this.loadProducts();
  }

  createProduct() {
    this.router.navigate(['/tenant/products/create']);
  }

  viewProduct(product: Product) {
    this.router.navigate(['/tenant/products', product.id]);
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

    this.productsFacade.deleteProduct(this.selectedProduct.id);
    this.successMessage = 'Product deleted successfully';
    this.showDeleteModal = false;
    this.selectedProduct = null;
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
