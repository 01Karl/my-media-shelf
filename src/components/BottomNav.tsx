// Bottom navigation component

import { Home, Library, Plus, Bluetooth, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Hem', path: '/' },
  { icon: Library, label: 'Bibliotek', path: '/libraries' },
  { icon: Plus, label: 'Lägg till', path: '/add' },
  { icon: Bluetooth, label: 'Synka', path: '/sync' },
  { icon: Settings, label: 'Inställningar', path: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on auth pages
  if (location.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'bottom-nav-item relative flex-1',
                isActive && 'active'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 left-0 right-0 mx-auto w-8 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn(
                'w-6 h-6 mb-1 transition-colors',
                item.path === '/add' && 'text-primary'
              )} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
