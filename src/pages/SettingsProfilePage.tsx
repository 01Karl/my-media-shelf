import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsProfilePage() {
  const { currentOwner, updateOwnerProfile } = useAppStore();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(currentOwner?.displayName ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayName(currentOwner?.displayName ?? '');
  }, [currentOwner]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('saving');

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError(t('settings.profileDisplayNameError'));
      setStatus('idle');
      return;
    }

    const updated = await updateOwnerProfile(trimmed);
    if (updated) {
      setStatus('success');
      return;
    }

    setStatus('error');
    setError(t('settings.profileUpdateFailed'));
  };

  return (
    <div className="page-container">
      <PageHeader title={t('settings.profileTitle')} showBack />
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">{currentOwner?.displayName || t('common.user')}</p>
            {currentOwner && (
              <p className="text-sm text-muted-foreground">ID: {currentOwner.ownerId.slice(0, 8)}...</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">{t('settings.profileDisplayNameLabel')}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t('settings.profileDisplayNamePlaceholder')}
            autoComplete="name"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {status === 'success' && (
          <p className="text-sm text-success">{t('settings.profileUpdated')}</p>
        )}
        {status === 'error' && !error && (
          <p className="text-sm text-destructive">{t('settings.profileUpdateFailed')}</p>
        )}

        <Button type="submit" className="w-full" disabled={status === 'saving'}>
          {status === 'saving' ? t('common.save') + '...' : t('common.save')}
        </Button>
      </form>
    </div>
  );
}
