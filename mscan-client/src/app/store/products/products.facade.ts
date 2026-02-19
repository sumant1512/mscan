import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductsFilter
} from './products.models';
import * as ProductsActions from './products.actions';
import * as ProductsSelectors from './products.selectors';

@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  store = inject(Store);

  products$ = this.store.select(ProductsSelectors.selectAllProducts);
  selectedProduct$ = this.store.select(ProductsSelectors.selectSelectedProduct);
  loading$ = this.store.select(ProductsSelectors.selectProductsLoading);
  error$ = this.store.select(ProductsSelectors.selectProductsError);
  totalCount$ = this.store.select(ProductsSelectors.selectProductsTotalCount);


  loadProducts(filter?: ProductsFilter): void {
    this.store.dispatch(ProductsActions.loadProducts({ filter }));
  }

  loadProduct(id: string): void {
    this.store.dispatch(ProductsActions.loadProduct({ id }));
  }

  createProduct(request: CreateProductRequest): void {
    this.store.dispatch(ProductsActions.createProduct({ request }));
  }

  updateProduct(id: string, request: UpdateProductRequest): void {
    this.store.dispatch(ProductsActions.updateProduct({ id, request }));
  }

  deleteProduct(id: string): void {
    this.store.dispatch(ProductsActions.deleteProduct({ id }));
  }

  selectProduct(product: Product | null): void {
    this.store.dispatch(ProductsActions.selectProduct({ product }));
  }

  clearSelectedProduct(): void {
    this.store.dispatch(ProductsActions.clearSelectedProduct());
  }

  clearError(): void {
    this.store.dispatch(ProductsActions.clearProductError());
  }

  getProductById(id: string): Observable<Product | undefined> {
    return this.store.select(ProductsSelectors.selectProductById(id));
  }
}
