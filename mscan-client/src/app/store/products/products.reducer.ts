import { createReducer, on } from '@ngrx/store';
import { ProductState } from './products.models';
import * as ProductsActions from './products.actions';

export const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10
};

export const productsReducer = createReducer(
  initialState,

  // Load Products
  on(ProductsActions.loadProducts, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProductsActions.loadProductsSuccess, (state, { products, totalCount }) => ({
    ...state,
    products,
    totalCount,
    loading: false,
    error: null
  })),
  on(ProductsActions.loadProductsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Product
  on(ProductsActions.loadProduct, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProductsActions.loadProductSuccess, (state, { product }) => ({
    ...state,
    selectedProduct: product,
    loading: false,
    error: null
  })),
  on(ProductsActions.loadProductFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Product
  on(ProductsActions.createProduct, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProductsActions.createProductSuccess, (state, { product }) => ({
    ...state,
    products: [...state.products, product],
    loading: false,
    error: null
  })),
  on(ProductsActions.createProductFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Product
  on(ProductsActions.updateProduct, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProductsActions.updateProductSuccess, (state, { product }) => ({
    ...state,
    products: state.products.map(p => p.id === product.id ? product : p),
    selectedProduct: product,
    loading: false,
    error: null
  })),
  on(ProductsActions.updateProductFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Product
  on(ProductsActions.deleteProduct, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProductsActions.deleteProductSuccess, (state, { id }) => ({
    ...state,
    products: state.products.filter(p => p.id !== id),
    loading: false,
    error: null
  })),
  on(ProductsActions.deleteProductFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Product
  on(ProductsActions.selectProduct, (state, { product }) => ({
    ...state,
    selectedProduct: product
  })),

  // Clear Selected Product
  on(ProductsActions.clearSelectedProduct, (state) => ({
    ...state,
    selectedProduct: null
  })),

  // Clear Error
  on(ProductsActions.clearProductError, (state) => ({
    ...state,
    error: null
  }))
);
