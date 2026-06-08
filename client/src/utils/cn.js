/**
 * cn() — утилита для объединения Tailwind-классов.
 * Использует clsx для условной логики и tailwind-merge для разрешения конфликтов.
 *
 * Пример:
 *   cn('px-4 py-2', isActive && 'bg-primary', 'text-sm')
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...args) {
  return twMerge(clsx(args));
}

export default cn;
