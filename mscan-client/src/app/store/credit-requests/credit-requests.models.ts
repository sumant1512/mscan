/**
 * Credit Requests Store Models
 */

import { CreditRequest } from '../../models/rewards.model';

export interface CreditRequestsState {
  pending: CreditRequest[];
  approved: CreditRequest[];
  rejected: CreditRequest[];
  loading: boolean;
  error: string | null;
}

export const initialCreditRequestsState: CreditRequestsState = {
  pending: [],
  approved: [],
  rejected: [],
  loading: false,
  error: null
};
