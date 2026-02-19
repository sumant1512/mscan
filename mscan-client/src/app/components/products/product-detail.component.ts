import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { ProductsFacade } from '../../store/products/products.facade';
import { Product } from '../../store/products/products.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private productsFacade = inject(ProductsFacade);
  private authService = inject(AuthService);

  product: Product | null = null;
  loading$ = this.productsFacade.loading$;
  error$ = this.productsFacade.error$;

  canEditProduct = false;
  canDeleteProduct = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.canEditProduct = this.authService.hasPermission('edit_product');
    this.canDeleteProduct = this.authService.hasPermission('delete_product');
  }

  ngOnInit(): void {
    // Get product ID from route
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.productsFacade.loadProduct(params['id']);
        }
      });

    // Subscribe to selected product
    this.productsFacade.selectedProduct$
      .pipe(
        takeUntil(this.destroy$),
        filter(product => product !== null)
      )
      .subscribe(product => {
        this.product = product;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productsFacade.clearSelectedProduct();
  }

  editProduct(): void {
    if (this.product) {
      this.router.navigate(['/tenant/products/edit', this.product.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/tenant/products']);
  }

  getVariantDisplay(variant: any): string {
    if (!variant) return '';
    const entries = Object.entries(variant)
      .filter(([key]) => !['id', 'product_id'].includes(key))
      .map(([key, value]) => `${this.formatKey(key)}: ${value}`);
    return entries.join(', ');
  }

  formatKey(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getCustomFieldValue(field: any): string {
    if (Array.isArray(field)) {
      return field.join(', ');
    }
    if (typeof field === 'object' && field !== null) {
      return JSON.stringify(field);
    }
    return field?.toString() || '';
  }
}
