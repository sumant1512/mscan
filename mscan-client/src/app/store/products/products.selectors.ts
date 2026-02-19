import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProductState } from './products.models';

export const selectProductsState = createFeatureSelector<ProductState>('products');

export const selectAllProducts = createSelector(
  selectProductsState,
  (state: ProductState) => state.products
);

export const selectSelectedProduct = createSelector(
  selectProductsState,
  (state: ProductState) => state.selectedProduct
);

export const selectProductsLoading = createSelector(
  selectProductsState,
  (state: ProductState) => state.loading
);

export const selectProductsError = createSelector(
  selectProductsState,
  (state: ProductState) => state.error
);

export const selectProductsTotalCount = createSelector(
  selectProductsState,
  (state: ProductState) => state.totalCount
);

export const selectProductById = (id: string) =>
  createSelector(selectAllProducts, (products) =>
    products.find((product) => product.id === id)
  );
