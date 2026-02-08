import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Tag, CreateTagRequest } from '../../models/templates.model';
import * as TagsActions from './tags.actions';
import * as TagsSelectors from './tags.selectors';

@Injectable({ providedIn: 'root' })
export class TagsFacade {
  private store = inject(Store);
  // Selectors
  allTags$: Observable<Tag[]> = this.store.select(TagsSelectors.selectAllTags);
  activeTags$: Observable<Tag[]> = this.store.select(TagsSelectors.selectActiveTags);
  tagsForSelectedApp$: Observable<Tag[]> = this.store.select(TagsSelectors.selectTagsForSelectedApp);
  activeTagsForSelectedApp$: Observable<Tag[]> = this.store.select(TagsSelectors.selectActiveTagsForSelectedApp);
  selectedAppId$: Observable<string | null> = this.store.select(TagsSelectors.selectSelectedAppId);
  loading$: Observable<boolean> = this.store.select(TagsSelectors.selectTagsLoading);
  error$: Observable<string | null> = this.store.select(TagsSelectors.selectTagsError);
  loaded$: Observable<boolean> = this.store.select(TagsSelectors.selectTagsLoaded);

  

  // Actions
  loadTags(appId: string): void {
    this.store.dispatch(TagsActions.loadTags({ appId }));
  }

  loadAllTags(): void {
    this.store.dispatch(TagsActions.loadAllTags());
  }

  createTag(tag: CreateTagRequest): void {
    this.store.dispatch(TagsActions.createTag({ tag }));
  }

  updateTag(id: string, changes: Partial<CreateTagRequest>): void {
    this.store.dispatch(TagsActions.updateTag({ id, changes }));
  }

  deleteTag(id: string): void {
    this.store.dispatch(TagsActions.deleteTag({ id }));
  }

  setSelectedApp(appId: string | null): void {
    this.store.dispatch(TagsActions.setSelectedAppForTags({ appId }));
  }

  clearError(): void {
    this.store.dispatch(TagsActions.clearTagsError());
  }

  clearTags(): void {
    this.store.dispatch(TagsActions.clearTags());
  }

  // Selector methods
  getTagById(id: string): Observable<Tag | undefined> {
    return this.store.select(TagsSelectors.selectTagById(id));
  }

  getTagsByAppId(appId: string): Observable<Tag[]> {
    return this.store.select(TagsSelectors.selectTagsByAppId(appId));
  }

  getActiveTagsByAppId(appId: string): Observable<Tag[]> {
    return this.store.select(TagsSelectors.selectActiveTagsByAppId(appId));
  }
}
