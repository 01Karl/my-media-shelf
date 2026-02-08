

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="font-semibold text-foreground mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          className="mt-4"
          size="sm"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
