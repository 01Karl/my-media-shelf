// Media type badge component

import { cn } from '@/lib/utils';
import { Film, Tv, HelpCircle } from 'lucide-react';
import type { MediaType } from '@/types';

interface TypeBadgeProps {
  type: MediaType;
  className?: string;
  showIcon?: boolean;
}

const typeConfig: Record<MediaType, { label: string; icon: typeof Film }> = {
  'movie': { label: 'Film', icon: Film },
  'series': { label: 'Serie', icon: Tv },
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
