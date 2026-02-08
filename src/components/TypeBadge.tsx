

import { cn } from '@/lib/utils';
import { Film, Tv, HelpCircle, Clapperboard } from 'lucide-react';
import type { MediaType } from '@/types';

interface TypeBadgeProps {
  type: MediaType;
  className?: string;
  showIcon?: boolean;
}

const typeConfig: Record<MediaType, { label: string; icon: typeof Film }> = {
  'movie': { label: 'Film', icon: Film },
  'series': { label: 'Serie', icon: Tv },
  'documentary': { label: 'Dokumentär', icon: Clapperboard },
  'other': { label: 'Övrigt', icon: HelpCircle },
};

export function TypeBadge({ type, className, showIcon = true }: TypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-muted-foreground text-sm',
        className
      )}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      {config.label}
    </span>
  );
}
