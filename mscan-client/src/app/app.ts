import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { SharedHeaderComponent } from './components/shared-header/shared-header.component';
import { AuthService } from './services/auth.service';
import { AuthContextFacade } from './store/auth-context';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, SideNavComponent, SharedHeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('mscan-client');
  navCollapsed = false;

  private authContextFacade = inject(AuthContextFacade);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load user context on app initialization if user is logged in
    if (this.authService.isLoggedIn()) {
      this.authContextFacade.loadUserContext();
    }
  }

  get showNav(): boolean {
    const currentUrl = this.router.url;
    return this.authService.isLoggedIn() &&
           currentUrl !== '/login';
  }

  onNavCollapseChange(collapsed: boolean): void {
    this.navCollapsed = collapsed;
  }
}
