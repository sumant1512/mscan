import { Tag } from '../../models/templates.model';

export interface TagsState {
  tags: Tag[];
  selectedAppId: string | null;  // Tags are filtered by selected app
  loading: boolean;
  error: string | null;
  loaded: boolean;
}
