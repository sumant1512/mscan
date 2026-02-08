import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagService } from '../../services/tag.service';
import { Tag } from '../../models/templates.model';
import { AppContextService } from '../../services/app-context.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { TagsFacade } from '../../store/tags';
import { Observable } from 'rxjs/internal/Observable';
import { TenantsFacade } from '../../store/tenants';

@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.css'],
})
export class TagListComponent implements OnInit {
  private router = inject(Router);
  tagsFacade = inject(TagsFacade);
  tags: Tag[] = [];
  loading$: Observable<boolean> = this.tagsFacade.loading$;
  error$: Observable<string | null> = this.tagsFacade.error$;
  private tagsSubscription?: Subscription;

  // Filters
  searchQuery = '';
  selectedApp = '';
  verificationApps: Array<{ id: string; name: string }> = [];

  constructor(
    private tagService: TagService,
    private cdr: ChangeDetectorRef,
    private appContextService: AppContextService,
  ) {}

  ngOnInit(): void {
    this.getUserContext();
  }

  getUserContext() {
    this.tagsSubscription = this.appContextService.appContext$.subscribe((appContext) => {
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

    this.tagsFacade.allTags$.subscribe((tags) => {
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
    if (!confirm(`Are you sure you want to delete tag "${tag.name}"?`)) {
      return;
    }

    this.tagService.deleteTag(tag.id).subscribe({
      next: () => {
        this.loadTags();
        alert('Tag deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting tag:', error);
        alert(error.error?.message || 'Failed to delete tag');
      },
    });
  }

  toggleActive(tag: Tag): void {
    this.tagService.updateTag(tag.id, { is_active: !tag.is_active }).subscribe({
      next: () => {
        tag.is_active = !tag.is_active;
      },
      error: (error) => {
        console.error('Error updating tag:', error);
        alert(error.error?.message || 'Failed to update tag');
      },
    });
  }
}
