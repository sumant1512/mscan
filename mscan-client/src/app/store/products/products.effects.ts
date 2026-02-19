import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ProductsService } from '../../services/products.service';
import * as ProductsActions from './products.actions';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Injectable()
export class ProductsEffects {
  private actions$ = inject(Actions);
  private productsService = inject(ProductsService);

  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.loadProducts),
      switchMap(({ filter }) =>
        this.productsService.getProducts(filter).pipe(
          map((response: any) =>
            ProductsActions.loadProductsSuccess({
              products: response.data?.products || response.products || [],
              totalCount: response.data?.total || response.total || 0
            })
          ),
          catchError((error) =>
            of(
              ProductsActions.loadProductsFailure({
                error: HttpErrorHandler.getMessage(error, 'Failed to load products')
              })
            )
          )
        )
      )
    )
  );

  loadProduct$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.loadProduct),
      switchMap(({ id }) =>
        this.productsService.getProduct(id).pipe(
          map((response: any) =>
            ProductsActions.loadProductSuccess({
              product: response.data?.product || response.product || response
            })
          ),
          catchError((error) =>
            of(
              ProductsActions.loadProductFailure({
                error: HttpErrorHandler.getMessage(error, 'Failed to load product')
              })
            )
          )
        )
      )
    )
  );

  createProduct$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.createProduct),
      switchMap(({ request }) =>
        this.productsService.createProduct(request).pipe(
          map((response: any) =>
            ProductsActions.createProductSuccess({
              product: response.data?.product || response.product || response
            })
          ),
          catchError((error) =>
            of(
              ProductsActions.createProductFailure({
                error: HttpErrorHandler.getMessage(error, 'Failed to create product')
              })
            )
          )
        )
      )
    )
  );

  updateProduct$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.updateProduct),
      switchMap(({ id, request }) =>
        this.productsService.updateProduct(+id, request as any).pipe(
          map((response: any) =>
            ProductsActions.updateProductSuccess({
              product: response.data?.product || response.product || response
            })
          ),
          catchError((error) =>
            of(
              ProductsActions.updateProductFailure({
                error: HttpErrorHandler.getMessage(error, 'Failed to update product')
              })
            )
          )
        )
      )
    )
  );

  deleteProduct$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.deleteProduct),
      switchMap(({ id }) =>
        this.productsService.deleteProduct(id).pipe(
          map(() => ProductsActions.deleteProductSuccess({ id })),
          catchError((error) =>
            of(
              ProductsActions.deleteProductFailure({
                error: HttpErrorHandler.getMessage(error, 'Failed to delete product')
              })
            )
          )
        )
      )
    )
  );
}
