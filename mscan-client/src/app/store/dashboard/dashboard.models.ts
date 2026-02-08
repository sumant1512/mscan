import { SuperAdminDashboard, TenantDashboard } from '../../models';

export interface DashboardState {
  stats: SuperAdminDashboard | TenantDashboard | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  lastUpdated: Date | null;
}
