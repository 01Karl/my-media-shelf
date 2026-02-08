

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, LogOut, Trash2, Database, 
  Smartphone, Info, ChevronRight, 
  Moon, HardDrive, Shield, Languages
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/appStore';
import { storageService } from '@/services';
import { tmdbCacheRepository } from '@/db';
import { SUPPORTED_LANGUAGES } from '@/lib/language';
import type { AppLanguage } from '@/lib/language';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentOwner, logout, isOnline, language, setLanguage } = useAppStore();
  const { t } = useTranslation();
  const [storageStats, setStorageStats] = useState<{ used: number; available: number } | null>(null);
  const [cacheStats, setCacheStats] = useState<{ count: number } | null>(null);

  const loadStats = async () => {
    const storage = await storageService.getStorageStats();
    setStorageStats(storage);
    
    const cache = await tmdbCacheRepository.getCacheStats();
    setCacheStats({ count: cache.count });
  };

  useState(() => {
    loadStats();
  });

  const handleLogout = async () => {
    if (confirm(t('settings.confirmLogout'))) {
      await logout();
      navigate('/auth');
    }
  };

  const handleClearCache = async () => {
    if (confirm(t('settings.confirmClearCache'))) {
      await tmdbCacheRepository.clearAll();
      loadStats();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="page-container">
      <PageHeader title={t('settings.title')} />

      <div className="px-4 py-4 space-y-6">
        
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('settings.userSection')}</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{currentOwner?.displayName || t('common.user')}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {currentOwner?.ownerId.slice(0, 8)}...
                </p>
              </div>
            </div>
            
            <div className="border-t border-border">
              <button
                onClick={() => navigate('/settings/profile')}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <span>{t('settings.editProfile')}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="border-t border-border">
              <button
                onClick={() => navigate('/settings/security')}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <span>{t('settings.pinCode')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </section>

        
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('settings.languageSection')}</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Languages className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('settings.appLanguage')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.chooseLanguage')}</p>
                </div>
              </div>
              <Select
                value={language}
                onValueChange={(value) => void setLanguage(value as AppLanguage)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('settings.languageSection')} />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('settings.storageSection')}</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('settings.usedSpace')}</p>
                  <p className="text-sm text-muted-foreground">
                    {storageStats ? formatBytes(storageStats.used) : t('settings.calculating')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('settings.tmdbCache')}</p>
                    <p className="text-sm text-muted-foreground">
                      {cacheStats ? t('settings.posters', { count: cacheStats.count }) : t('settings.calculating')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                >
                  {t('common.clear')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('settings.aboutSection')}</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground" />
                <span>{t('common.version')}</span>
              </div>
              <span className="text-muted-foreground">1.0.0</span>
            </div>
            
            <div className="border-t border-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <span>{t('common.status')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
                  <span className="text-muted-foreground">{isOnline ? t('common.online') : t('common.offline')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('settings.logout')}
          </Button>
        </motion.div>

        
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>{t('settings.appFooter')}</p>
          <p className="mt-1">{t('settings.dataFromTmdb')}</p>
        </div>
      </div>
    </div>
  );
}
