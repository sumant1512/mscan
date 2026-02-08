import { User } from '../../models';

export interface AuthContextState {
  user: User | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
}
