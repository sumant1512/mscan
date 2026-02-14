import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'remainingChars',
  standalone: true,
  pure: true // Pure pipe - only re-runs when input changes
})
export class RemainingCharsPipe implements PipeTransform {
  transform(value: string | null | undefined, maxLength: number = 250): number {
    const currentLength = value?.length || 0;
    return maxLength - currentLength;
  }
}
