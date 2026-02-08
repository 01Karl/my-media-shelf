// Add item page - multi-step flow for adding media items

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Image, Film, Tv, HelpCircle,
  ChevronRight, Check, Search, Loader2,
  Sparkles, Clapperboard
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { FormatBadge } from '@/components/FormatBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/appStore';
import { libraryRepository, itemRepository } from '@/db';
import { cameraService, ocrService, tmdbService, storageService } from '@/services';
import type { Library, MediaType, MediaFormat, MediaItem, TMDBSearchResult } from '@/types';

type Step =
  | 'select-library'
  | 'select-type'
  | 'enter-basics'
  | 'capture-images'
  | 'scan-check'
  | 'edit-details'
  | 'tmdb-match'
  | 'confirm';

const MEDIA_FORMATS: { value: MediaFormat; label: string }[] = [
  { value: 'DVD', label: 'DVD' },
  { value: 'Blu-ray', label: 'Blu-ray' },
  { value: '4K Blu-ray', label: '4K Blu-ray' },
  { value: 'Digital', label: 'Digital' },
  { value: 'VHS', label: 'VHS' },
  { value: 'Other', label: 'Övrigt' },
];

const MEDIA_TYPES: { value: MediaType; label: string; icon: typeof Film }[] = [
  { value: 'movie', label: 'Film', icon: Film },
  { value: 'series', label: 'Serie', icon: Tv },
  { value: 'documentary', label: 'Dokumentär', icon: Clapperboard },
  { value: 'other', label: 'Övrigt', icon: HelpCircle },
];

export default function AddItemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOwner } = useAppStore();
  const scanMode = searchParams.get('scan') === '1';

  // State
  const [step, setStep] = useState<Step>('select-library');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [format, setFormat] = useState<MediaFormat>('Blu-ray');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(false);
  const [scanMatches, setScanMatches] = useState<MediaItem[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Metadata
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [season, setSeason] = useState('');
  const [audioInfo, setAudioInfo] = useState('');
  const [videoInfo, setVideoInfo] = useState('');
  const [notes, setNotes] = useState('');
  
  // TMDB
  const [tmdbResults, setTmdbResults] = useState<TMDBSearchResult[]>([]);
  const [selectedTmdb, setSelectedTmdb] = useState<TMDBSearchResult | null>(null);

  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeFormats, setMergeFormats] = useState<string>('');
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const libraryPath = selectedLibrary ? `/libraries/${selectedLibrary.libraryId}` : '/libraries';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [liveCameraError, setLiveCameraError] = useState<string | null>(null);

  // Load libraries
  useEffect(() => {
    const loadLibraries = async () => {
      if (!currentOwner) return;
      const libs = await libraryRepository.getByOwner(currentOwner.ownerId);
      setLibraries(libs);

      // Pre-select library from URL param
      const libraryId = searchParams.get('library');
      if (libraryId) {
        const lib = libs.find(l => l.libraryId === libraryId);
        if (lib) {
          setSelectedLibrary(lib);
          setStep(scanMode ? 'capture-images' : 'select-type');
        }
      }
    };
    loadLibraries();
  }, [currentOwner, scanMode, searchParams]);

  // Capture front image
  const handleCaptureFront = async () => {
    setCameraError(null);
    const image = await cameraService.capturePhoto();
    if (image) {
      setFrontImage(image.dataUrl);
    } else {
      setCameraError('Ingen bild togs. Försök igen när kameran är redo.');
    }
  };

  // Capture back image
  const handleCaptureBack = async () => {
    setCameraError(null);
    const image = await cameraService.capturePhoto();
    if (image) {
      setBackImage(image.dataUrl);
    } else {
      setCameraError('Ingen bild togs. Försök igen när kameran är redo.');
    }
  };

  useEffect(() => {
    if (step !== 'capture-images') {
      setCameraError(null);
    }
  }, [step]);

  useEffect(() => {
    if (scanMode && step === 'capture-images') {
      void startLiveCamera();
    } else {
      stopLiveCamera();
    }

    return () => {
      stopLiveCamera();
    };
  }, [scanMode, step]);

  const startLiveCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLiveCameraError('Livekamera stöds inte i den här webbläsaren.');
      return;
    }

    if (isLiveCameraActive) {
      return;
    }

    setLiveCameraError(null);

    try {
      stopLiveCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLiveCameraActive(true);
    } catch (error) {
      console.error('Live camera error:', error);
      setLiveCameraError('Kunde inte starta kameran. Kontrollera behörigheter.');
      setIsLiveCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
  };

  const captureLiveFrame = async () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) return null;
    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleLiveScan = async () => {
    setCameraError(null);
    const frame = await captureLiveFrame();

    if (!frame) {
      setCameraError('Ingen bild kunde fångas från kameran. Försök igen.');
      return;
    }

    setFrontImage(frame);
    stopLiveCamera();
    await handleProcessImages(frame, backImage);
  };

  // Process OCR and proceed
  const handleProcessImages = async (overrideFront?: string | null, overrideBack?: string | null) => {
    setIsProcessingOcr(true);
    
    try {
      const ocrResults = await ocrService.processMediaCovers(
        overrideFront ?? frontImage || undefined,
        overrideBack ?? backImage || undefined
      );

      const nextTitle = ocrResults.suggestedTitle?.trim() || title;
      const nextYear = ocrResults.suggestedYear ? ocrResults.suggestedYear.toString() : year;
      const nextSeason = ocrResults.suggestedSeason ? ocrResults.suggestedSeason.toString() : season;

      if (ocrResults.suggestedTitle) setTitle(ocrResults.suggestedTitle);
      if (ocrResults.suggestedYear) setYear(ocrResults.suggestedYear.toString());
      if (ocrResults.suggestedSeason) setSeason(ocrResults.suggestedSeason.toString());
      if (ocrResults.audioInfo) setAudioInfo(ocrResults.audioInfo);
      if (ocrResults.videoInfo) setVideoInfo(ocrResults.videoInfo);

      if (selectedLibrary && nextTitle.trim()) {
        setIsCheckingLibrary(true);
        const results = await itemRepository.search(nextTitle.trim(), selectedLibrary.libraryId);
        const filteredResults = results.filter((item) => {
          const seasonValue = nextSeason ? parseInt(nextSeason, 10) : undefined;
          const yearValue = nextYear ? parseInt(nextYear, 10) : undefined;

          return (
            item.type === mediaType &&
            item.season === seasonValue &&
            (yearValue ? item.year === yearValue : true)
          );
        });
        setScanMatches(filteredResults);
        setIsCheckingLibrary(false);
        setStep('scan-check');
        setIsProcessingOcr(false);
        return;
      }
    } catch (error) {
      console.error('OCR failed:', error);
      setIsCheckingLibrary(false);
    }
    
    setIsProcessingOcr(false);
    setStep('edit-details');
  };

  // Search TMDB
  const handleSearchTmdb = async () => {
    if (!title.trim()) return;
    
    setIsSearchingTmdb(true);
    
    try {
      const yearNum = year ? parseInt(year) : undefined;
      const results = await tmdbService.search(title, mediaType, yearNum);
      setTmdbResults(results);
    } catch (error) {
      console.error('TMDB search failed:', error);
    }
    
    setIsSearchingTmdb(false);
  };

  // Save item
  const performSave = async () => {
    if (!selectedLibrary || !currentOwner || !title.trim()) return;

    setIsSaving(true);

    try {
      const existingItems = selectedTmdb?.id
        ? (await itemRepository.getByTmdbId(selectedTmdb.id)).filter(
            (item) =>
              item.libraryId === selectedLibrary.libraryId &&
              item.type === mediaType &&
              item.season === (season ? parseInt(season) : undefined)
          )
        : (await itemRepository.search(title.trim(), selectedLibrary.libraryId)).filter(
            (item) =>
              item.type === mediaType &&
              item.season === (season ? parseInt(season) : undefined) &&
              item.year === (year ? parseInt(year) : undefined)
          );

      if (existingItems.length > 0) {
        const existingFormats = existingItems.map((item) => item.format).join(', ');
        const confirmMerge = confirm(
          `Den här titeln finns redan i biblioteket (${existingFormats}). Vill du lägga till denna version också?`
        );
        if (!confirmMerge) {
          setIsSaving(false);
          return;
        }
      }

      // Generate item ID first
      const itemId = crypto.randomUUID();
      
      // Save images
      let frontImagePath: string | undefined;
      let backImagePath: string | undefined;
      
      if (frontImage) {
        frontImagePath = await storageService.saveImage(frontImage, itemId, 'front');
      }
      if (backImage) {
        backImagePath = await storageService.saveImage(backImage, itemId, 'back');
      }
      
      // Create item
      await itemRepository.create(
        selectedLibrary.libraryId,
        currentOwner.ownerId,
        {
          type: mediaType,
          title: title.trim(),
          format,
          year: year ? parseInt(year) : undefined,
          season: season ? parseInt(season) : undefined,
          frontImagePath,
          backImagePath,
          tmdbId: selectedTmdb?.id,
          audioInfo: audioInfo || undefined,
          videoInfo: videoInfo || undefined,
          notes: notes.trim() || undefined,
        },
        selectedLibrary.sharedLibraryId
      );
      
      // If TMDB was selected, cache the data
      if (selectedTmdb) {
        const details = await tmdbService.getDetails(selectedTmdb.id, mediaType);
        // Details are automatically cached by the service
      }
      
      navigate(`/libraries/${selectedLibrary.libraryId}`);
    } catch (error) {
      console.error('Failed to save item:', error);
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLibrary || !currentOwner || !title.trim()) return;

    const existingItems = selectedTmdb?.id
      ? (await itemRepository.getByTmdbId(selectedTmdb.id)).filter(
          (item) =>
            item.libraryId === selectedLibrary.libraryId &&
            item.type === mediaType &&
            item.season === (season ? parseInt(season) : undefined)
        )
      : (await itemRepository.search(title.trim(), selectedLibrary.libraryId)).filter(
          (item) =>
            item.type === mediaType &&
            item.season === (season ? parseInt(season) : undefined) &&
            item.year === (year ? parseInt(year) : undefined)
        );

    if (existingItems.length > 0) {
      const existingFormats = existingItems.map((item) => item.format).join(', ');
      setMergeFormats(existingFormats);
      setPendingSave(() => performSave);
      setShowMergeDialog(true);
      return;
    }

    await performSave();
  };
  const renderStep = () => {
    switch (step) {
      case 'select-library':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold mb-4">Välj bibliotek</h2>
            
            {libraries.length > 0 ? (
              <div className="space-y-3">
                {libraries.map((lib) => (
                  <button
                    key={lib.libraryId}
                    onClick={() => {
                      setSelectedLibrary(lib);
                      setStep(scanMode ? 'capture-images' : 'select-type');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                      {lib.icon || '📚'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{lib.name}</p>
                      {lib.description && (
                        <p className="text-sm text-muted-foreground truncate">{lib.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Inga bibliotek ännu</p>
                <Button onClick={() => navigate('/libraries/create')}>
                  Skapa bibliotek
                </Button>
              </div>
            )}
          </motion.div>
        );

      case 'select-type':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold mb-4">Typ av media</h2>
              <div className="grid gap-3">
                {MEDIA_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isActive = mediaType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setMediaType(type.value)}
                      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold">{type.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.value === 'movie'
                            ? 'Lägg till en film i biblioteket.'
                            : type.value === 'series'
                              ? 'Säsonger, boxar och TV-serier.'
                              : type.value === 'documentary'
                                ? 'Dokumentärer och faktaserier.'
                                : 'Allt som inte passar i film eller serie.'}
                        </p>
                      </div>
                      {isActive && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Format</h2>
              <div className="flex flex-wrap gap-2">
                {MEDIA_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      format === f.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-secondary/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setStep('enter-basics')}
            >
              Fortsätt
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        );

      case 'enter-basics':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold">Grundinfo</h2>
              <p className="text-sm text-muted-foreground">
                Fyll i det viktigaste först. Omslag kan läggas till senare.
              </p>
            </div>

            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ange titel"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">År</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="mt-1"
                />
              </div>
              {mediaType === 'series' && (
                <div>
                  <Label htmlFor="season">Säsong</Label>
                  <Input
                    id="season"
                    type="number"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Tips: Om du fotar omslaget kan vi läsa av titel och år automatiskt.
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('edit-details')}
              >
                Hoppa över omslag
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep('capture-images')}
              >
                Lägg till omslag
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 'capture-images':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Hitta omslag</h2>
              <p className="text-sm text-muted-foreground">
                {scanMode
                  ? 'Starta livekameran, rikta mot omslaget och skanna.'
                  : 'Lägg till ett tydligt omslag. Vi plockar titel och år när det går.'}
              </p>
            </div>

            {scanMode && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Livekamera</p>
                    <p className="text-base font-semibold">Skanna omslag</p>
                    <p className="text-sm text-muted-foreground">
                      Håll omslaget i bild så försöker vi läsa av titel och år.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={startLiveCamera} disabled={isLiveCameraActive}>
                      {isLiveCameraActive ? 'Kamera igång' : 'Starta kamera'}
                    </Button>
                    <Button onClick={handleLiveScan} disabled={!isLiveCameraActive || isProcessingOcr}>
                      Skanna omslag
                    </Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-dashed border-border bg-secondary/30">
                  <video
                    ref={videoRef}
                    className={`h-56 w-full object-cover ${isLiveCameraActive ? '' : 'hidden'}`}
                    playsInline
                    muted
                  />
                  {!isLiveCameraActive && (
                    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                      Livekameran är avstängd
                    </div>
                  )}
                </div>
                {liveCameraError && (
                  <p className="text-sm text-destructive">{liveCameraError}</p>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Typ</p>
                  <div className="flex flex-wrap gap-2">
                    {MEDIA_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setMediaType(type.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          mediaType === type.value
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card hover:bg-secondary/50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Omslag (framsida)</p>
                    <p className="text-base font-semibold">Primär bild</p>
                    <p className="text-sm text-muted-foreground">
                      Fota eller byt ut omslaget om det behövs.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleCaptureFront}>
                    <Camera className="mr-2 h-4 w-4" />
                    {frontImage ? 'Ta om' : 'Fota omslag'}
                  </Button>
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-border bg-secondary/30">
                  {frontImage ? (
                    <img
                      src={frontImage}
                      alt="Front"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                      Ingen bild ännu
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Extra bild</p>
                    <p className="text-base font-semibold">Baksida (valfri)</p>
                    <p className="text-sm text-muted-foreground">
                      Lägg till om du vill spara teknisk info.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleCaptureBack}>
                    <Image className="mr-2 h-4 w-4" />
                    {backImage ? 'Ta om' : 'Fota baksida'}
                  </Button>
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-border bg-secondary/30">
                  {backImage ? (
                    <img
                      src={backImage}
                      alt="Back"
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      Ingen extra bild
                    </div>
                  )}
                </div>
              </div>
            </div>

            {cameraError && (
              <p className="text-sm text-destructive">{cameraError}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => (scanMode ? navigate(libraryPath) : setStep('edit-details'))}
              >
                {scanMode ? 'Avbryt' : 'Hoppa över'}
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleProcessImages}
                disabled={isProcessingOcr || (!frontImage && !backImage)}
              >
                {isProcessingOcr ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyserar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analysera
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      case 'scan-check': {
        const scanFormatList = Array.from(
          new Set(scanMatches.map((item) => item.format))
        ).join(', ');

        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Snabbkoll i biblioteket</h2>
              <p className="text-sm text-muted-foreground">
                Vi försöker matcha omslaget mot ditt bibliotek.
              </p>
            </div>

            {isCheckingLibrary ? (
              <div className="py-10 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Letar efter match...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Tolkat från omslag</p>
                  <p className="text-lg font-semibold">{title || 'Ingen titel hittad ännu'}</p>
                  {(year || season) && (
                    <p className="text-sm text-muted-foreground">
                      {year && `År ${year}`}
                      {season && ` • Säsong ${season}`}
                    </p>
                  )}
                </div>

                {scanMatches.length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="font-medium">
                        Den här titeln finns redan ({scanFormatList}).
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vill du lägga till en extra version ändå?
                      </p>
                    </div>
                    <div className="space-y-2">
                      {scanMatches.map((item) => (
                        <div
                          key={item.itemId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.year ?? 'Okänt år'}
                              {item.season ? ` • Säsong ${item.season}` : ''}
                            </p>
                          </div>
                          <FormatBadge format={item.format} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="font-medium">Ingen match hittades.</p>
                    <p className="text-sm text-muted-foreground">
                      Vill du lägga till den här titeln?
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('capture-images')}
              >
                Fota igen
              </Button>
              {scanMode ? (
                <Button
                  className="flex-1"
                  onClick={() => navigate(libraryPath)}
                >
                  Klart
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => setStep('edit-details')}
                >
                  {scanMatches.length > 0 ? 'Fortsätt till detaljer' : 'Fortsätt'}
                </Button>
              )}
            </div>
          </motion.div>
        );
      }

      case 'edit-details':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold">Detaljer</h2>
              <p className="text-sm text-muted-foreground">
                Lägg till teknisk info och anteckningar. Du kan alltid justera senare.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Grundinfo</p>
                  <p className="text-base font-semibold">{title || 'Titel saknas'}</p>
                  <p className="text-sm text-muted-foreground">
                    {year && `År ${year}`}
                    {season && ` • Säsong ${season}`}
                    {!year && !season && 'Ingen extra info'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('enter-basics')}
                >
                  Redigera
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="audioInfo">Ljud</Label>
              <Input
                id="audioInfo"
                value={audioInfo}
                onChange={(e) => setAudioInfo(e.target.value)}
                placeholder="T.ex. Dolby Atmos, DTS-HD"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="videoInfo">Bild</Label>
              <Input
                id="videoInfo"
                value={videoInfo}
                onChange={(e) => setVideoInfo(e.target.value)}
                placeholder="T.ex. 4K HDR, 1080p"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Anteckningar</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Valfria anteckningar..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('capture-images')}
              >
                Tillbaka
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // Skip TMDB and go to confirm
                  setStep('confirm');
                }}
              >
                Hoppa över TMDB
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => {
                  handleSearchTmdb();
                  setStep('tmdb-match');
                }}
                disabled={!title.trim()}
              >
                <Search className="w-4 h-4 mr-2" />
                Sök TMDB
              </Button>
            </div>
          </motion.div>
        );

      case 'tmdb-match':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">TMDB-matchning</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchTmdb}
                disabled={isSearchingTmdb}
              >
                {isSearchingTmdb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {isSearchingTmdb ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Söker...</p>
              </div>
            ) : tmdbResults.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {tmdbResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedTmdb(result)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedTmdb?.id === result.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    {result.posterPath ? (
                      <img
                        src={tmdbService.getImageUrl(result.posterPath, 'w92') || ''}
                        alt={result.title}
                        className="w-12 h-18 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-18 bg-secondary rounded flex items-center justify-center">
                        <Film className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.releaseDate?.substring(0, 4) || 'Okänt år'}
                      </p>
                    </div>
                    {selectedTmdb?.id === result.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Inga träffar hittades</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Du kan fortsätta utan TMDB-matchning
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedTmdb(null);
                  setStep('confirm');
                }}
              >
                Hoppa över
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setStep('confirm')}
              >
                Fortsätt
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 'confirm':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold">Bekräfta</h2>
            
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
              {/* Preview image */}
              {(frontImage || selectedTmdb?.posterPath) && (
                <div className="flex justify-center">
                  <img
                    src={frontImage || tmdbService.getImageUrl(selectedTmdb?.posterPath || '', 'w185') || ''}
                    alt={title}
                    className="w-24 h-36 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="text-center">
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-muted-foreground">
                  {year}{season && ` • Säsong ${season}`}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <FormatBadge format={format} size="md" />
              </div>

              <div className="pt-2 border-t border-border text-sm text-muted-foreground">
                <p>Bibliotek: {selectedLibrary?.name}</p>
                {selectedTmdb && <p>TMDB: {selectedTmdb.title}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('edit-details')}
              >
                Tillbaka
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Spara
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="page-container">
      {scanMode && isProcessingOcr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-lg">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="text-base font-semibold">Analyserar omslag...</p>
            <p className="text-sm text-muted-foreground">Vi letar efter titel och år.</p>
          </div>
        </div>
      )}
      <AlertDialog
        open={showMergeDialog}
        onOpenChange={(open) => {
          setShowMergeDialog(open);
          if (!open) {
            setPendingSave(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skapa en extra kopia?</AlertDialogTitle>
            <AlertDialogDescription>
              Den här titeln finns redan i biblioteket ({mergeFormats}). Vill du lägga till denna version också?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowMergeDialog(false);
                const save = pendingSave;
                setPendingSave(null);
                if (save) {
                  await save();
                }
              }}
            >
              Lägg till version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Lägg till"
        subtitle={selectedLibrary?.name}
        showBack
        backPath={selectedLibrary ? `/libraries/${selectedLibrary.libraryId}` : '/libraries'}
      />

      {/* Progress indicator */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          {[
            'select-library',
            'select-type',
            'enter-basics',
            'capture-images',
            'scan-check',
            'edit-details',
            'confirm',
          ].map((s, i) => {
            const steps = [
              'select-library',
              'select-type',
              'enter-basics',
              'capture-images',
              'scan-check',
              'edit-details',
              'tmdb-match',
              'confirm',
            ];
            const currentIndex = steps.indexOf(step);
            const thisIndex = i;
            const isActive = thisIndex <= currentIndex;
            
            return (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  isActive ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
