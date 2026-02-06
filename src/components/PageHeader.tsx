// Page header component

import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  showBack = false, 
  backPath,
  rightAction,
  className 
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={cn('app-header', className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 -ml-2"
            onClick={handleBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
        
        {rightAction && (
          <div className="flex-shrink-0">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}
