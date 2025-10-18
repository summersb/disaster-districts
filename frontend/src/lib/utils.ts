import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a numeric id suitable for client-side temporary ids.
 * Uses current time + small random to reduce collisions.
 */
export function genId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}
