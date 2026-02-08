

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Plus, User } from 'lucide-react';
import { PinInput } from '@/components/PinInput';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { ownerRepository } from '@/db';
import type { Owner } from '@/types';

export default function AuthPage() {
  const navigate = useNavigate();
  const { isInitialized, isAuthenticated, currentOwner, login, initialize } = useAppStore();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!isInitialized) {
        await initialize();
      }
      
      const allOwners = await ownerRepository.getAll();
      setOwners(allOwners);
      setIsLoading(false);
    };
    
    init();
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleOwnerSelect = async (owner: Owner) => {
    setSelectedOwner(owner);
    
    if (owner.pinHash) {
      setShowPinInput(true);
    } else {
      
      await login(owner.ownerId);
    }
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedOwner) return;
    
    const success = await login(selectedOwner.ownerId, pin);
    if (!success) {
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
    }
  };

  const handleCreateNew = () => {
    navigate('/auth/create');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Film className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-top safe-area-bottom">
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Film className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            Media Library
          </h1>
          <p className="text-muted-foreground">
            Din lokala film- och seriesamling
          </p>
        </motion.div>

        {showPinInput && selectedOwner ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold">{selectedOwner.displayName}</h2>
              <p className="text-sm text-muted-foreground mt-1">Ange din PIN-kod</p>
            </div>
            
            <PinInput
              length={4}
              onComplete={handlePinComplete}
              error={pinError}
            />
            
            <Button
              variant="ghost"
              className="mt-6 w-full"
              onClick={() => {
                setShowPinInput(false);
                setSelectedOwner(null);
              }}
            >
              Tillbaka
            </Button>
          </motion.div>
        ) : owners.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-3"
          >
            <p className="text-sm text-muted-foreground text-center mb-4">
              Välj användare
            </p>
            
            {owners.map((owner) => (
              <button
                key={owner.ownerId}
                onClick={() => handleOwnerSelect(owner)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{owner.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {owner.pinHash ? 'PIN-skyddad' : 'Ingen PIN'}
                  </p>
                </div>
              </button>
            ))}
            
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa ny användare
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <p className="text-center text-muted-foreground mb-6">
              Skapa ett lokalt konto för att komma igång
            </p>
            
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa användare
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
