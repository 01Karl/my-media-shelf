

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Folder, Users, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/appStore';
import { libraryRepository } from '@/db';

const EMOJI_OPTIONS = ['📚', '🎬', '📀', '🎞️', '📺', '🎥', '🎭', '🎪', '🌟', '💎', '🔥', '⭐'];

export default function CreateLibraryPage() {
  const navigate = useNavigate();
  const { currentOwner } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Ange ett namn för biblioteket');
      return;
    }

    if (!currentOwner) {
      setError('Ingen användare inloggad');
      return;
    }

    setIsLoading(true);

    try {
      const library = await libraryRepository.create(
        currentOwner.ownerId,
        name.trim(),
        {
          description: description.trim() || undefined,
          icon,
          isShared,
        }
      );

      navigate(`/libraries/${library.libraryId}`);
    } catch (err) {
      setError('Kunde inte skapa biblioteket');
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Skapa bibliotek"
        showBack
      />

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 text-5xl">
            {icon}
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-lg text-xl transition-all ${
                  icon === emoji 
                    ? 'bg-primary text-primary-foreground scale-110' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Label htmlFor="name">Namn</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="T.ex. Min samling"
            className="mt-2"
            autoFocus
          />
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label htmlFor="description">Beskrivning (valfritt)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskriv biblioteket..."
            className="mt-2"
            rows={3}
          />
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between py-4 border-y border-border"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Delat bibliotek</p>
              <p className="text-sm text-muted-foreground">
                Kan synkas med andra via Bluetooth
              </p>
            </div>
          </div>
          <Switch
            checked={isShared}
            onCheckedChange={setIsShared}
          />
        </motion.div>

        {isShared && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 rounded-lg bg-primary/10 border border-primary/20"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Delning aktiverad</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Detta bibliotek får ett unikt ID som gör det möjligt att synka 
                  innehåll med andra som har samma bibliotek.
                </p>
              </div>
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
          transition={{ delay: 0.4 }}
        >
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Skapar...' : 'Skapa bibliotek'}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
