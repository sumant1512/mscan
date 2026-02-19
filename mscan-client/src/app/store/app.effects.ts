import { VerificationAppsEffects } from './verification-apps';
import { TenantsEffects } from './tenants';
import { CreditRequestsEffects } from './credit-requests';
import { AuthContextEffects } from './auth-context';
import { DashboardEffects } from './dashboard';
import { TagsEffects } from './tags';
import { TemplatesEffects } from './templates';
import { ProductsEffects } from './products/products.effects';
import { CouponsEffects } from './coupons';

export const AppEffects = [
  VerificationAppsEffects,
  TenantsEffects,
  CreditRequestsEffects,
  AuthContextEffects,
  DashboardEffects,
  TagsEffects,
  TemplatesEffects,
  ProductsEffects,
  CouponsEffects
]
