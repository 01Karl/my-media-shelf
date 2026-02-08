

import { cn } from '@/lib/utils';
import { Film, Tv, HelpCircle, Clapperboard } from 'lucide-react';
import type { MediaType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface TypeBadgeProps {
  type: MediaType;
  className?: string;
  showIcon?: boolean;
}

export function TypeBadge({ type, className, showIcon = true }: TypeBadgeProps) {
  const { t } = useTranslation();
  const config: Record<MediaType, { label: string; icon: typeof Film }> = {
    movie: { label: t('media.movie'), icon: Film },
    series: { label: t('media.series'), icon: Tv },
    documentary: { label: t('media.documentary'), icon: Clapperboard },
    other: { label: t('media.other'), icon: HelpCircle },
  };
  const configItem = config[type];
  const Icon = configItem.icon;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-muted-foreground text-sm',
        className
      )}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      {configItem.label}
    </span>
  );
}
