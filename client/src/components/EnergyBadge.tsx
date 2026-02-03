
import type { EnergyLevel } from '../types';

interface EnergyBadgeProps {
    level: EnergyLevel;
    size?: 'sm' | 'md';
}

export function EnergyBadge({ level, size = 'md' }: EnergyBadgeProps) {
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

    const variants: Record<EnergyLevel, string> = {
        low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    const labels: Record<EnergyLevel, string> = {
        low: 'Low energy',
        medium: 'Medium energy',
        high: 'High energy',
    };

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${variants[level]}`}>
            {labels[level]}
        </span>
    );
}
