

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { createOwner } = useAppStore();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError(t('createUser.errors.displayName'));
      return;
    }

    if (usePin) {
      if (pin.length < 4) {
        setError(t('createUser.errors.pinLength'));
        return;
      }
      if (pin !== confirmPin) {
        setError(t('createUser.errors.pinMismatch'));
        return;
      }
    }

    setIsLoading(true);

    try {
      await createOwner(displayName.trim(), usePin ? pin : undefined);
      navigate('/');
    } catch (err) {
      setError(t('createUser.errors.createFailed'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">{t('createUser.title')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Label htmlFor="displayName">{t('createUser.displayName')}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('createUser.displayNamePlaceholder')}
            className="mt-2"
            autoFocus
          />
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between py-4 border-y border-border"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{t('createUser.protectWithPin')}</p>
              <p className="text-sm text-muted-foreground">
                {t('createUser.requirePin')}
              </p>
            </div>
          </div>
          <Switch
            checked={usePin}
            onCheckedChange={setUsePin}
          />
        </motion.div>

        
        {usePin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="relative">
              <Label htmlFor="pin">{t('createUser.pinLabel')}</Label>
              <div className="relative mt-2">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
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
              <Label htmlFor="confirmPin">{t('createUser.confirmPin')}</Label>
              <Input
                id="confirmPin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••"
                className="mt-2"
              />
            </div>
          </motion.div>
        )}

        
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-destructive text-sm text-center"
          >
            {error}
          </motion.p>
        )}

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? t('createUser.creating') : t('createUser.create')}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
