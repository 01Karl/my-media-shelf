import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsSecurityPage() {
  const { currentOwner, updateOwnerPin } = useAppStore();
  const { t } = useTranslation();
  const [usePin, setUsePin] = useState(Boolean(currentOwner?.pinHash));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setUsePin(Boolean(currentOwner?.pinHash));
  }, [currentOwner]);

  const handleTogglePin = (value: boolean) => {
    if (!value && currentOwner?.pinHash) {
      const confirmed = confirm(t('settings.confirmRemovePin'));
      if (!confirmed) return;
    }
    setUsePin(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('saving');

    if (usePin) {
      if (pin.length < 4) {
        setError(t('settings.pinLengthError'));
        setStatus('idle');
        return;
      }
      if (pin !== confirmPin) {
        setError(t('settings.pinMismatchError'));
        setStatus('idle');
        return;
      }

      const updated = await updateOwnerPin(pin);
      if (!updated) {
        setError(t('settings.pinUpdateFailed'));
        setStatus('error');
        return;
      }
    } else {
      const removed = await updateOwnerPin();
      if (!removed) {
        setError(t('settings.pinUpdateFailed'));
        setStatus('error');
        return;
      }
    }

    setPin('');
    setConfirmPin('');
    setStatus('success');
  };

  return (
    <div className="page-container">
      <PageHeader title={t('settings.pinTitle')} showBack />
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{t('settings.pinToggleLabel')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.pinToggleDescription')}</p>
            </div>
          </div>
          <Switch checked={usePin} onCheckedChange={handleTogglePin} />
        </div>

        {usePin && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pin">{t('settings.pinLabel')}</Label>
              <div className="relative mt-2">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPin">{t('settings.confirmPinLabel')}</Label>
              <Input
                id="confirmPin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d*"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••"
                className="mt-2"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {status === 'success' && (
          <p className="text-sm text-success">
            {usePin ? t('settings.pinUpdated') : t('settings.pinRemoved')}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={status === 'saving'}>
          {status === 'saving' ? t('common.save') + '...' : t('common.save')}
        </Button>
      </form>
    </div>
  );
}
