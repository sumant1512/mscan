/**
 * Unit Tests: VerificationAppListComponent - App Limit UI
 *
 * Covers task 8.2: component disables create button and shows correct
 * usage count when at limit.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { VerificationAppListComponent } from './verification-app-list.component';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { RewardsService } from '../../services/rewards.service';
import { AuthService } from '../../services/auth.service';

describe('VerificationAppListComponent – App Limit', () => {
  let component: VerificationAppListComponent;
  let fixture: ComponentFixture<VerificationAppListComponent>;

  // Subjects so tests can push new values
  let appsSubject: BehaviorSubject<any[]>;
  let appsUsedSubject: BehaviorSubject<number | null>;
  let appsLimitSubject: BehaviorSubject<number | null>;
  let loadingSubject: BehaviorSubject<boolean>;
  let errorSubject: BehaviorSubject<string | null>;

  let facadeMock: Partial<VerificationAppsFacade>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    appsSubject = new BehaviorSubject<any[]>([]);
    appsUsedSubject = new BehaviorSubject<number | null>(null);
    appsLimitSubject = new BehaviorSubject<number | null>(null);
    loadingSubject = new BehaviorSubject<boolean>(false);
    errorSubject = new BehaviorSubject<string | null>(null);

    facadeMock = {
      allApps$: appsSubject.asObservable(),
      appsUsed$: appsUsedSubject.asObservable(),
      appsLimit$: appsLimitSubject.asObservable(),
      loading$: loadingSubject.asObservable(),
      error$: errorSubject.asObservable(),
      loadApps: jest.fn()
    };

    authServiceMock = {
      hasPermission: (permission: string) => {
        return ['create_app', 'edit_app', 'delete_app'].includes(permission);
      }
    };

    await TestBed.configureTestingModule({
      imports: [VerificationAppListComponent],
      providers: [
        { provide: VerificationAppsFacade, useValue: facadeMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: RewardsService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        ChangeDetectorRef
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationAppListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show usage badge with correct counts', () => {
    appsUsedSubject.next(2);
    appsLimitSubject.next(5);
    fixture.detectChanges();

    expect(component.appsUsed).toBe(2);
    expect(component.appsLimit).toBe(5);
    expect(component.isAtLimit).toBe(false);

    const badge: HTMLElement = fixture.nativeElement.querySelector('.app-usage-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('2 of 5 apps used');
  });

  it('should set isAtLimit to true when usage equals the limit', () => {
    appsUsedSubject.next(3);
    appsLimitSubject.next(3);
    fixture.detectChanges();

    expect(component.isAtLimit).toBe(true);
  });

  it('should disable the Create New App button when at limit', () => {
    appsUsedSubject.next(1);
    appsLimitSubject.next(1);
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-primary');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  it('should show the at-limit CSS class on the badge when at limit', () => {
    appsUsedSubject.next(5);
    appsLimitSubject.next(5);
    fixture.detectChanges();

    const badge: HTMLElement = fixture.nativeElement.querySelector('.app-usage-badge');
    expect(badge?.classList).toContain('at-limit');
  });

  it('should enable the Create New App button when under limit', () => {
    appsUsedSubject.next(0);
    appsLimitSubject.next(3);
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-primary');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
  });
});
