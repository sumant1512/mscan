import { Component, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SubdomainService } from '../../services/subdomain.service';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.css']
})
export class SideNavComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Output() collapseChange = new EventEmitter<boolean>();
  isCollapsed = false;
  userType: string = '';
  menuItems: MenuItem[] = [];
  currentTenantName: string = '';
  currentSubdomain: string | null = '';

  superAdminMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/super-admin/dashboard'
    },
    {
      label: 'Tenant Management',
      icon: 'business',
      children: [
        { label: 'Add Tenant', icon: 'add', route: '/super-admin/tenants/new' },
        { label: 'View Tenants', icon: 'list', route: '/super-admin/tenants' }
      ]
    },
    {
      label: 'Tenant Admins',
      icon: 'admin_panel_settings',
      children: [
        { label: 'Manage Admins', icon: 'group', route: '/super-admin/tenant-admins' },
        { label: 'Add Admin', icon: 'person_add', route: '/super-admin/tenant-admins/add' }
      ]
    },
    {
      label: 'Credit Requests',
      icon: 'account_balance_wallet',
      children: [
        { label: 'Pending Approvals', icon: 'pending', route: '/super-admin/credits/pending' },
        { label: 'History', icon: 'history', route: '/super-admin/credits/history' }
      ]
    },
    {
      label: 'System Settings',
      icon: 'settings',
      route: '/super-admin/settings'
    }
  ];

  tenantMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/tenant/dashboard'
    },
    {
      label: 'Verification App',
      icon: 'verified',
      children: [
        { label: 'Configure', icon: 'settings', route: '/tenant/verification-app/configure' },
        { label: 'Manage', icon: 'apps', route: '/tenant/verification-app' }
      ]
    },
    {
      label: 'Catalogue',
      icon: 'inventory_2',
      children: [
        { label: 'Add Product', icon: 'add_circle', route: '/tenant/products/create' },
        { label: 'View Products', icon: 'inventory', route: '/tenant/products' },
        { label: 'Product Templates', icon: 'view_module', route: '/tenant/templates' },
        { label: 'Tag Management', icon: 'label', route: '/tenant/tags' }
      ]
    },
    {
      label: 'Rewards',
      icon: 'redeem',
      children: [
        { label: 'Create Coupon', icon: 'add_circle', route: '/tenant/coupons/create' },
        { label: 'Coupon List', icon: 'list_alt', route: '/tenant/coupons' },
        { label: 'Scan History', icon: 'qr_code_scanner', route: '/tenant/scans/history' }
      ]
    },
    {
      label: 'Credits',
      icon: 'account_balance_wallet',
      children: [
        { label: 'Balance', icon: 'account_balance', route: '/tenant/credits/balance' },
        { label: 'Request Credits', icon: 'add', route: '/tenant/credits/request' },
        { label: 'Pending Requests', icon: 'pending', route: '/tenant/credits/pending' },
        { label: 'Transaction History', icon: 'receipt', route: '/tenant/credits/history' }
      ]
    },
    {
      label: 'User Management',
      icon: 'people',
      children: [
        { label: 'Add User', icon: 'person_add', route: '/tenant/users/create' },
        { label: 'View Users', icon: 'group', route: '/tenant/users' }
      ]
    },
    {
      label: 'Profile',
      icon: 'person',
      route: '/tenant/profile'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private subdomainService: SubdomainService
  ) {}

  ngOnInit(): void {
    // Get current subdomain
    this.currentSubdomain = this.subdomainService.getCurrentSubdomain();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            this.userType = user.role;
            this.menuItems = user.role === 'SUPER_ADMIN'
              ? this.superAdminMenu
              : this.tenantMenu;

            // Set tenant name for display
            if (user.tenant) {
              this.currentTenantName = user.tenant.tenant_name || '';
            }
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.router.navigate(['/login']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapseChange.emit(this.isCollapsed);
    
    // Collapse all submenus when collapsing navigation
    if (this.isCollapsed) {
      this.menuItems.forEach(item => {
        if (item.children) {
          item.expanded = false;
        }
      });
    }
  }

  toggleSubmenu(item: MenuItem): void {
    if (!item.children || this.isCollapsed) return;
    item.expanded = !item.expanded;
  }

  logout(): void {
    this.authService.logout();
  }

  isActive(route?: string): boolean {
    if (!route) return false;
    return this.router.url === route;
  }
}
