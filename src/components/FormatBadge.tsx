

import { cn } from '@/lib/utils';
import type { MediaFormat } from '@/types';

interface FormatBadgeProps {
  format: MediaFormat;
  className?: string;
  size?: 'sm' | 'md';
}

const formatConfig: Record<MediaFormat, { label: string; className: string }> = {
  'DVD': { 
    label: 'DVD', 
    className: 'bg-format-dvd/20 text-format-dvd border-format-dvd/30' 
  },
  'Blu-ray': { 
    label: 'Blu-ray', 
    className: 'bg-format-bluray/20 text-format-bluray border-format-bluray/30' 
  },
  '4K Blu-ray': { 
    label: '4K', 
    className: 'bg-format-4k/20 text-format-4k border-format-4k/30' 
  },
  'Digital': { 
    label: 'Digital', 
    className: 'bg-format-digital/20 text-format-digital border-format-digital/30' 
  },
  'VHS': { 
    label: 'VHS', 
    className: 'bg-format-vhs/20 text-format-vhs border-format-vhs/30' 
  },
  'Other': { 
    label: 'Other', 
    className: 'bg-format-other/20 text-format-other border-format-other/30' 
  },
};

export function FormatBadge({ format, className, size = 'sm' }: FormatBadgeProps) {
  const config = formatConfig[format];
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
