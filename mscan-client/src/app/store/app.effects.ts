import { VerificationAppsEffects } from './verification-apps';
import { TenantsEffects } from './tenants';
import { CreditRequestsEffects } from './credit-requests';
import { AuthContextEffects } from './auth-context';
import { DashboardEffects } from './dashboard';
import { TagsEffects } from './tags';

export const AppEffects = [
  VerificationAppsEffects,
  TenantsEffects,
  CreditRequestsEffects,
  AuthContextEffects,
  DashboardEffects,
  TagsEffects
]
