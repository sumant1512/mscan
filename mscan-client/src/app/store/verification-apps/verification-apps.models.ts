export interface VerificationApp {
    verification_app_id: string;
    tenant_id?: string;
    app_name: string;
    code?: string;
    description?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    welcome_message?: string;
    scan_success_message?: string;
    scan_failure_message?: string;
    post_scan_redirect_url?: string;
    is_active: boolean;
    template_id?: string;  // Product template for this app
    template_name?: string;
    currency: string;  // Application currency (ISO 4217 code)
    created_at: string;
    updated_at: string;
    total_coupons?: number;
    total_scans?: number;
}

export interface VerificationAppsState {
    apps: VerificationApp[];
    selectedApp: VerificationApp | null;
    loading: boolean;
    error: string | null;
    loaded: boolean;
}
