import { VerificationAppsState } from './verification-apps';
import { TenantsState } from './tenants';
import { CreditRequestsState } from './credit-requests';
import { AuthContextState } from './auth-context';
import { DashboardState } from './dashboard';
import { TagsState } from './tags';
import { TemplatesState } from './templates';
import { ProductState } from './products/products.models';
import { CouponsState } from './coupons';

export interface AppState {
  verificationApps: VerificationAppsState;
  tenants: TenantsState;
  creditRequests: CreditRequestsState;
  authContext: AuthContextState;
  dashboard: DashboardState;
  tags: TagsState;
  templates: TemplatesState;
  products: ProductState;
  coupons: CouponsState;
}
