import { Pipe, PipeTransform } from '@angular/core';

/**
 * Status Display Pipe
 *
 * Centralized status display logic for:
 * - CSS class mapping (status-pending, status-approved, etc.)
 * - Status icons (✅, 🚫, etc.)
 * - Display labels (Pending, Approved, etc.)
 *
 * Usage in templates:
 * - <span [ngClass]="request.status | statusDisplay:'class'">...</span>
 * - <span>{{ coupon.status | statusDisplay:'icon' }}</span>
 * - <span>{{ request.status | statusDisplay:'label' }}</span>
 *
 * Replaces 230 lines of duplicated getStatusClass() methods across 6 components
 */

export type StatusDisplayFormat = 'class' | 'icon' | 'label';

interface StatusMapping {
  class: string;
  icon: string;
  label: string;
}

@Pipe({
  name: 'statusDisplay',
  standalone: true
})
export class StatusDisplayPipe implements PipeTransform {

  private readonly statusMappings: Record<string, StatusMapping> = {
    // Credit Request Statuses
    'pending': {
      class: 'status-pending',
      icon: '⏳',
      label: 'Pending'
    },
    'approved': {
      class: 'status-approved',
      icon: '✅',
      label: 'Approved'
    },
    'rejected': {
      class: 'status-rejected',
      icon: '❌',
      label: 'Rejected'
    },

    // Coupon Statuses
    'draft': {
      class: 'status-draft',
      icon: '📝',
      label: 'Draft'
    },
    'printed': {
      class: 'status-printed',
      icon: '🖨️',
      label: 'Printed'
    },
    'active': {
      class: 'status-active',
      icon: '✅',
      label: 'Active'
    },
    'used': {
      class: 'status-used',
      icon: '✓',
      label: 'Used'
    },
    'inactive': {
      class: 'status-inactive',
      icon: '🚫',
      label: 'Inactive'
    },
    'expired': {
      class: 'status-expired',
      icon: '⏰',
      label: 'Expired'
    },
    'exhausted': {
      class: 'status-exhausted',
      icon: '🏁',
      label: 'Exhausted'
    },

    // Batch Statuses (if needed)
    'code_assigned': {
      class: 'status-code-assigned',
      icon: '📋',
      label: 'Code Assigned'
    },
    'activated': {
      class: 'status-activated',
      icon: '🚀',
      label: 'Activated'
    },

    // Transaction Statuses (if needed)
    'success': {
      class: 'status-success',
      icon: '✅',
      label: 'Success'
    },
    'failed': {
      class: 'status-failed',
      icon: '❌',
      label: 'Failed'
    },
    'processing': {
      class: 'status-processing',
      icon: '⌛',
      label: 'Processing'
    }
  };

  transform(status: string | null | undefined, format: StatusDisplayFormat = 'class'): string {
    if (!status) {
      return '';
    }

    const normalizedStatus = status.toLowerCase().trim();
    const mapping = this.statusMappings[normalizedStatus];

    if (!mapping) {
      console.warn(`StatusDisplayPipe: Unknown status "${status}". Returning empty string.`);
      return '';
    }

    return mapping[format];
  }
}
