import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, SideNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('mscan-client');
  navCollapsed = false;
  
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}
  
  get showNav(): boolean {
    const currentUrl = this.router.url;
    return this.authService.isLoggedIn() && currentUrl !== '/login';
  }
  
  onNavCollapseChange(collapsed: boolean): void {
    this.navCollapsed = collapsed;
  }
}
