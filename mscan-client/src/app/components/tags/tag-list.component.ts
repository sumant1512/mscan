import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TagService } from '../../services/tag.service';
import { Tag } from '../../models/templates.model';
import { AppContextService } from '../../services/app-context.service';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { TagsFacade } from '../../store/tags';
import { TenantsFacade } from '../../store/tenants';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.css'],
})
export class TagListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  tagsFacade = inject(TagsFacade);

  tags: Tag[] = [];
  loading$: Observable<boolean> = this.tagsFacade.loading$;
  error$: Observable<string | null> = this.tagsFacade.error$;
  successMessage = '';
  errorMessage = '';

  // Filters
  searchQuery = '';
  selectedApp = '';
  verificationApps: Array<{ id: string; name: string }> = [];

  constructor(
    private tagService: TagService,
    private cdr: ChangeDetectorRef,
    private appContextService: AppContextService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.getUserContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getUserContext() {
    this.appContextService.appContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe((appContext) => {
        if (appContext?.selectedAppId) {
          this.loadTags();
        }
      });
  }

  loadTags(): void {
    // Get selected app ID
    const selectedAppId = this.appContextService.getSelectedAppId() || 'all';

    const params: any = {
      search: this.searchQuery,
    };

    if (selectedAppId !== 'all') {
      params.app_id = selectedAppId;
    }

    this.tagsFacade.loadTags(selectedAppId);

    this.tagsFacade.allTags$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tags) => {
        this.tags = tags;
        this.cdr.detectChanges();
      });
  }

  onSearch(): void {
    this.loadTags();
  }

  onFilterChange(): void {
    this.loadTags();
  }

  createTag(): void {
    this.router.navigate(['/tenant/tags/create']);
  }

  editTag(tag: Tag): void {
    this.router.navigate(['/tenant/tags', tag.id, 'edit']);
  }

  deleteTag(tag: Tag): void {
    this.confirmationService
      .confirm(`Are you sure you want to delete tag "${tag.name}"?`, 'Delete Tag')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.tagService.deleteTag(tag.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.successMessage = 'Tag deleted successfully';
              this.loadTags();
            },
            error: (err) => {
              this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to delete tag');
            },
          });
      });
  }

  toggleActive(tag: Tag): void {
    this.tagService.updateTag(tag.id, { is_active: !tag.is_active })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          tag.is_active = !tag.is_active;
          this.successMessage = `Tag ${tag.is_active ? 'activated' : 'deactivated'} successfully`;
        },
        error: (err) => {
          this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to update tag');
        },
      });
  }
}
