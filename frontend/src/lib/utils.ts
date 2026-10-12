import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let genIdCounter = 0

/**
 * Generate a numeric id suitable for client-side temporary ids.
 * Combines the current time with a wrapping counter (rather than a random
 * value) so that ids stay unique even when many are generated within the
 * same millisecond, e.g. parsing a large CSV/PDF member list in a tight loop.
 */
export function genId(): number {
  genIdCounter = (genIdCounter + 1) % 1000
  return Date.now() * 1000 + genIdCounter
}
