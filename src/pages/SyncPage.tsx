// Sync page - BLE sync interface

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bluetooth, BluetoothSearching, Smartphone, Check, 
  AlertCircle, ArrowRight, RefreshCw, Loader2,
  Users, Share
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/appStore';
import { libraryRepository } from '@/db';
import { bleSyncService } from '@/services';
import type { Library, BLEDevice } from '@/types';

type SyncStep = 'select-library' | 'scanning' | 'select-device' | 'syncing' | 'done';

export default function SyncPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOwner } = useAppStore();
  
  const [step, setStep] = useState<SyncStep>('select-library');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BLEDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [syncState, setSyncState] = useState(bleSyncService.getState());
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ added: number; updated: number; matched: number } | null>(null);

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = bleSyncService.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  // Load shared libraries
  useEffect(() => {
    const loadLibraries = async () => {
      if (!currentOwner) return;
      
      const allLibs = await libraryRepository.getByOwner(currentOwner.ownerId);
      const sharedLibs = allLibs.filter(lib => lib.sharedLibraryId);
      setLibraries(sharedLibs);

      // Pre-select library from URL param
      const libraryId = searchParams.get('library');
      if (libraryId) {
        const lib = sharedLibs.find(l => l.libraryId === libraryId);
        if (lib) {
          setSelectedLibrary(lib);
          setStep('scanning');
        }
      }
    };
    loadLibraries();
  }, [currentOwner, searchParams]);

  const handleStartScanning = async () => {
    if (!selectedLibrary) return;
    
    setError(null);
    setIsScanning(true);
    setStep('scanning');

    try {
      const permissionGranted = await bleSyncService.requestPermissions();
      if (!permissionGranted) {
        setError('Bluetooth-behörighet krävs för att synka.');
        setIsScanning(false);
        setStep('select-library');
        return;
      }

      const foundDevices = await bleSyncService.startScanning();
      setDevices(foundDevices);
      setIsScanning(false);
      setStep('select-device');
    } catch (err) {
      setError('Kunde inte starta Bluetooth-sökning. Kontrollera att Bluetooth är aktiverat.');
      setIsScanning(false);
    }
  };

  const handleSelectDevice = async (device: BLEDevice) => {
    setSelectedDevice(device);
    setError(null);

    try {
      const connected = await bleSyncService.connect(device);
      if (connected) {
        handleStartSync();
      } else {
        setError('Kunde inte ansluta till enheten');
      }
    } catch (err) {
      setError('Anslutning misslyckades');
    }
  };

  const handleStartSync = async () => {
    if (!selectedLibrary || !currentOwner) return;
    
    setStep('syncing');

    try {
      const result = await bleSyncService.performSync(
        currentOwner.ownerId,
        selectedLibrary.libraryId
      );
      setSyncSummary({ added: result.added, updated: result.updated, matched: result.matched });
      setStep('done');
    } catch (err) {
      setError('Synkronisering misslyckades');
    }
  };

  const handleDone = () => {
    bleSyncService.disconnect();
    if (selectedLibrary) {
      navigate(`/libraries/${selectedLibrary.libraryId}`);
    } else {
      navigate('/libraries');
    }
  };

  const handleReset = () => {
    bleSyncService.reset();
    setStep('select-library');
    setSelectedLibrary(null);
    setSelectedDevice(null);
    setDevices([]);
    setSyncSummary(null);
    setError(null);
  };

  const renderContent = () => {
    switch (step) {
      case 'select-library':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Share className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Välj bibliotek att synka</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Endast delade bibliotek kan synkas
              </p>
            </div>

            {libraries.length > 0 ? (
              <div className="space-y-3">
                {libraries.map((lib) => (
                  <button
                    key={lib.libraryId}
                    onClick={() => {
                      setSelectedLibrary(lib);
                      handleStartScanning();
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                      {lib.icon || '📚'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lib.name}</p>
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {lib.sharedLibraryId?.slice(0, 8)}...
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Inga delade bibliotek"
                description="Skapa ett delat bibliotek för att kunna synka med andra"
                actionLabel="Skapa bibliotek"
                onAction={() => navigate('/libraries/create')}
              />
            )}
          </motion.div>
        );

      case 'scanning':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
            >
              <BluetoothSearching className="w-12 h-12 text-primary" />
            </motion.div>
            <h2 className="text-lg font-semibold mb-2">Söker efter enheter...</h2>
            <p className="text-sm text-muted-foreground">
              Se till att den andra enheten också söker
            </p>
            
            <Button
              variant="outline"
              className="mt-8"
              onClick={handleReset}
            >
              Avbryt
            </Button>
          </motion.div>
        );

      case 'select-device':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">Hittade enheter</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Välj en enhet att synka med
              </p>
            </div>

            {devices.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="font-medium">
                    {devices[0].name || 'En närliggande enhet'} är i närheten.
                  </p>
                  <p className="text-muted-foreground">
                    Vill du synka ditt delade bibliotek?
                  </p>
                </div>
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleSelectDevice(device)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{device.name || 'Okänd enhet'}</p>
                      {device.rssi && (
                        <p className="text-xs text-muted-foreground">
                          Signal: {device.rssi > -60 ? 'Stark' : device.rssi > -80 ? 'Medium' : 'Svag'}
                        </p>
                      )}
                    </div>
                    <Bluetooth className="w-5 h-5 text-primary" />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Bluetooth}
                title="Inga enheter hittades"
                description="Se till att den andra enheten har Bluetooth aktiverat och söker"
              />
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReset}
              >
                Avbryt
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleStartScanning}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sök igen
              </Button>
            </div>
          </motion.div>
        );

      case 'syncing':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
            <h2 className="text-lg font-semibold mb-2">
              {syncState.syncProgress.message || 'Synkroniserar...'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Håll enheterna nära varandra
            </p>
            
            <Progress value={syncState.syncProgress.progress} className="max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">
              {syncState.syncProgress.progress}%
            </p>
          </motion.div>
        );

      case 'done':
        if (!syncSummary) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Synkronisering klar!</h2>
              <Button onClick={handleDone} className="mt-4">
                Klar
              </Button>
            </motion.div>
          );
        }

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Synkronisering klar!</h2>
            
            <div className="bg-card rounded-xl border border-border p-4 max-w-xs mx-auto my-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{syncSummary.added}</p>
                  <p className="text-xs text-muted-foreground">Nya</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{syncSummary.updated}</p>
                  <p className="text-xs text-muted-foreground">Uppdaterade</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{syncSummary.matched}</p>
                  <p className="text-xs text-muted-foreground">Matchade</p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleDone} className="mt-4">
              Klar
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Synka"
        subtitle={selectedLibrary?.name}
        showBack={step !== 'syncing'}
      />

      <div className="px-4 py-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive mb-6"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}
