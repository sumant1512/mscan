import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
export class SideNavComponent implements OnInit {
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
        { label: 'Add Category', icon: 'add_circle', route: '/tenant/categories/create' },
        { label: 'View Categories', icon: 'category', route: '/tenant/categories' },
        { label: 'Add Product', icon: 'add_circle', route: '/tenant/products/create' },
        { label: 'View Products', icon: 'inventory', route: '/tenant/products' }
      ]
    },
    {
      label: 'Rewards',
      icon: 'redeem',
      children: [
        { label: 'Create Coupon', icon: 'add_circle', route: '/tenant/coupons/create' },
        { label: 'Coupon List', icon: 'list_alt', route: '/tenant/coupons' },
        { label: 'Scan History', icon: 'qr_code_scanner', route: '/tenant/scans/history' },
        { label: 'Analytics', icon: 'analytics', route: '/tenant/scans/analytics' }
      ]
    },
    {
      label: 'Credits',
      icon: 'account_balance_wallet',
      children: [
        { label: 'Balance', icon: 'account_balance', route: '/tenant/credits/balance' },
        { label: 'Request Credits', icon: 'add', route: '/tenant/credits/request' },
        { label: 'Transaction History', icon: 'receipt', route: '/tenant/credits/history' } 
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
    
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user) {
          this.userType = user.role;
          this.menuItems = user.role === 'SUPER_ADMIN' 
            ? this.superAdminMenu 
            : this.tenantMenu;
          
          // Set tenant name for display
          if (user.tenant) {
            this.currentTenantName = user.tenant.companyName || '';
          }
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Failed to load user context', error);
        this.router.navigate(['/login']);
      }
    });
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
