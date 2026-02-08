

import { motion } from 'framer-motion';
import { Folder, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Library } from '@/types';

interface LibraryCardProps {
  library: Library;
  itemCount?: number;
  onClick?: () => void;
  className?: string;
}

const defaultIcons = ['📚', '🎬', '📀', '🎞️', '📺', '🎥'];

export function LibraryCard({ library, itemCount = 0, onClick, className }: LibraryCardProps) {
  const icon = library.icon || defaultIcons[Math.floor(Math.random() * defaultIcons.length)];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer',
        'transition-colors hover:bg-secondary/50',
        className
      )}
      onClick={onClick}
    >
      
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
        {icon}
      </div>
      
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">
            {library.name}
          </h3>
          {library.sharedLibraryId && (
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'objekt' : 'objekt'}
        </p>
        {library.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {library.description}
          </p>
        )}
      </div>
      
      
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </motion.div>
  );
}
