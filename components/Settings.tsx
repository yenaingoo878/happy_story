
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder, Story } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { DataService, syncData, getImageSrc } from '../db';
import { syncManager } from '../syncManager';
import { refreshR2Client, isR2Configured } from '../r2Client';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// FontAwesome Icon Bridge
const Lock = ({ className }: { className?: string }) => <i className={`fa-solid fa-lock flex items-center justify-center ${className}`} />;
const Baby = ({ className }: { className?: string }) => <i className={`fa-solid fa-baby flex items-center justify-center ${className}`} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin flex items-center justify-center ${className}`} />;
const Save = ({ className }: { className?: string }) => <i className={`fa-solid fa-floppy-disk flex items-center justify-center ${className}`} />;
const Moon = ({ className }: { className?: string }) => <i className={`fa-solid fa-moon flex items-center justify-center ${className}`} />;
const Sun = ({ className }: { className?: string }) => <i className={`fa-solid fa-sun flex items-center justify-center ${className}`} />;
const Trash2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-trash-can flex items-center justify-center ${className}`} />;
const Pencil = ({ className }: { className?: string }) => <i className={`fa-solid fa-pencil flex items-center justify-center ${className}`} />;
const LogOut = ({ className }: { className?: string }) => <i className={`fa-solid fa-right-from-bracket flex items-center justify-center ${className}`} />;
const ChevronDown = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-down flex items-center justify-center ${className}`} />;
const Bell = ({ className }: { className?: string }) => <i className={`fa-solid fa-bell flex items-center justify-center ${className}`} />;
const Activity = ({ className }: { className?: string }) => <i className={`fa-solid fa-chart-line flex items-center justify-center ${className}`} />;
const ImageIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-image flex items-center justify-center ${className}`} />;
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark flex items-center justify-center ${className}`} />;
const Cloud = ({ className }: { className?: string }) => <i className={`fa-solid fa-cloud flex items-center justify-center ${className}`} />;
const HardDrive = ({ className }: { className?: string }) => <i className={`fa-solid fa-hard-drive flex items-center justify-center ${className}`} />;
const Clock = ({ className }: { className?: string }) => <i className={`fa-solid fa-clock flex items-center justify-center ${className}`} />;
const User = ({ className }: { className?: string }) => <i className={`fa-solid fa-user flex items-center justify-center ${className}`} />;
const ShieldCheck = ({ className }: { className?: string }) => <i className={`fa-solid fa-shield-halved flex items-center justify-center ${className}`} />;
const ChevronLeft = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-left flex items-center justify-center ${className}`} />;
const ChevronRight = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-right flex items-center justify-center ${className}`} />;
const Plus = ({ className }: { className?: string }) => <i className={`fa-solid fa-plus flex items-center justify-center ${className}`} />;
const SettingsIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-gear flex items-center justify-center ${className}`} />;
const CircleUser = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-user flex items-center justify-center ${className}`} />;
const BookOpen = ({ className }: { className?: string }) => <i className={`fa-solid fa-book-open flex items-center justify-center ${className}`} />;
const BellRing = ({ className }: { className?: string }) => <i className={`fa-solid fa-bell flex items-center justify-center ${className}`} />;
const Languages = ({ className }: { className?: string }) => <i className={`fa-solid fa-language flex items-center justify-center ${className}`} />;
const Mail = ({ className }: { className?: string }) => <i className={`fa-solid fa-envelope flex items-center justify-center ${className}`} />;
const Filter = ({ className }: { className?: string }) => <i className={`fa-solid fa-filter flex items-center justify-center ${className}`} />;
const Building2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-hospital flex items-center justify-center ${className}`} />;
const MapPin = ({ className }: { className?: string }) => <i className={`fa-solid fa-map-pin flex items-center justify-center ${className}`} />;
const Globe = ({ className }: { className?: string }) => <i className={`fa-solid fa-globe flex items-center justify-center ${className}`} />;
const Scale = ({ className }: { className?: string }) => <i className={`fa-solid fa-weight-scale flex items-center justify-center ${className}`} />;
const Ruler = ({ className }: { className?: string }) => <i className={`fa-solid fa-ruler flex items-center justify-center ${className}`} />;
const Calendar = ({ className }: { className?: string }) => <i className={`fa-solid fa-calendar-days flex items-center justify-center ${className}`} />;
const Heart = ({ className }: { className?: string }) => <i className={`fa-solid fa-heart flex items-center justify-center ${className}`} />;
const Droplets = ({ className }: { className?: string }) => <i className={`fa-solid fa-droplet flex items-center justify-center ${className}`} />;
const Camera = ({ className }: { className?: string }) => <i className={`fa-solid fa-camera flex items-center justify-center ${className}`} />;
const Search = ({ className }: { className?: string }) => <i className={`fa-solid fa-magnifying-glass flex items-center justify-center ${className}`} />;
const KeyIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-key flex items-center justify-center ${className}`} />;
const CheckCircle2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-check flex items-center justify-center ${className}`} />;
const FileUp = ({ className }: { className?: string }) => <i className={`fa-solid fa-file-import flex items-center justify-center ${className}`} />;
const RefreshCw = ({ className }: { className?: string }) => <i className={`fa-solid fa-rotate flex items-center justify-center ${className}`} />;
const Info = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-info flex items-center justify-center ${className}`} />;

const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "", id, multiline = false, step }: any) => (
  <div className={`bg-white dark:bg-slate-800 px-4 py-2.5 flex items-start gap-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm group transition-all focus-within:ring-4 focus-within:ring-primary/5 ${className}`}>
     <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors shrink-0 shadow-inner mt-0.5">
        <Icon className="w-4 h-4" />
     </div>
     <div className="flex-1 flex flex-col min-w-0">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1 text-left">{label}</label>
        <div className="flex items-center">
            {type === 'select' ? (
               <div className="relative flex items-center w-full">
                 <select id={id} value={value} onChange={onChange} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-white focus:ring-0 appearance-none h-6 text-left outline-none">
                    {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </select>
                 <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
               </div>
            ) : multiline ? (
               <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-white focus:ring-0 min-h-[60px] resize-none text-left outline-none" />
            ) : (
               <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-white focus:ring-0 h-6 text-left outline-none" />
            )}
        </div>
     </div>
  </div>
);

const SettingToggle = ({ icon: Icon, label, sublabel, active, onToggle, colorClass = "text-primary", bgClass = "bg-primary/10" }: any) => (
  <button type="button" onClick={(e) => { e.preventDefault(); onToggle(); }} className="w-full p-5 flex items-center justify-between group bg-transparent border-none outline-none cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/20 transition-all rounded-2xl">
     <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl ${bgClass} flex items-center justify-center ${colorClass} shadow-sm transition-transform group-hover:scale-110 duration-300`}><Icon className="w-5 h-5" /></div><div className="text-left"><h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{label}</h3>{sublabel && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sublabel}</p>}</div></div>
     <div className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 shadow-inner ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} /></div>
  </button>
);

interface SettingsProps {
  language: Language; setLanguage: (lang: Language) => void; theme: Theme; toggleTheme: () => void;
  profiles: ChildProfile[]; activeProfileId: string; onProfileChange: (id: string) => void; onRefreshData: () => Promise<any>;
  passcode: string | null; isDetailsUnlocked: boolean; onUnlockRequest: (callback?: () => void) => void; onPasscodeSetup: () => void;
  onPasscodeChange: () => void; onPasscodeRemove: () => void; onHideDetails: () => void;
  growthData: GrowthData[]; memories: Memory[]; stories: Story[];
  onEditMemory: (mem: Memory) => void; onDeleteMemory: (id: string) => any; 
  onStoryClick: (story: Story) => void; onDeleteStory: (id: string) => any;
  onDeleteGrowth: (id: string) => any; onSaveGrowth: (growth: GrowthData) => Promise<any>;
  onDeleteProfile: (id: string) => any;
  isGuestMode?: boolean; onLogout: () => void; initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES' | 'CLOUD' | 'R2_CONFIG';
  remindersEnabled: boolean; toggleReminders: () => void; remindersList: Reminder[]; onDeleteReminder: (id: string) => any;
  onSaveReminder: (reminder: Reminder) => Promise<any>;
  onSaveSuccess: () => void;
  session: any;
  onViewCloudPhoto?: (url: string, name: string) => void;
  cloudRefreshTrigger?: number;
}

const resizeImage = (file: File | string, maxWidth = 512, maxHeight = 512, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width; let height = img.height;
      if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } } 
      else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('Canvas Error'));
      ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image failed to load.'));
    
    if (typeof file === 'string') {
        img.src = file;
    } else {
        const reader = new FileReader();
        reader.onload = (e) => { if (e.target?.result) img.src = e.target.result as string; else reject(new Error('FileReader Error')); };
        reader.onerror = () => reject(new Error('FileReader Error'));
        reader.readAsDataURL(file);
    }
  });
};

const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme,
  profiles, activeProfileId, onProfileChange, onRefreshData,
  passcode, isDetailsUnlocked, onUnlockRequest,
  onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails,
  growthData, memories, stories, onEditMemory, onDeleteMemory, onStoryClick, onDeleteStory, onDeleteGrowth, onSaveGrowth, onDeleteProfile,
  isGuestMode, onLogout, initialView, remindersEnabled, toggleReminders,
  remindersList = [], onDeleteReminder, onSaveReminder,
  onSaveSuccess,
  session,
  onViewCloudPhoto,
  cloudRefreshTrigger = 0
}) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES' | 'CLOUD' | 'R2_CONFIG'>(initialView || 'MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({ id: '', name: '', dob: '', gender: 'boy' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: '' });
  const [editingGrowth, setEditingGrowth] = useState<Partial<GrowthData>>({});
  const [isProcessingProfileImage, setIsProcessingProfileImage] = useState(false);
  const [cloudPhotos, setCloudPhotos] = useState<any[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const envInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);

  const [memoriesSearch, setMemoriesSearch] = useState('');
  const [isMemoriesSearchVisible, setIsMemoriesSearchVisible] = useState(false);

  const [syncState, setSyncState] = useState({ status: 'idle' });

  useEffect(() => { syncManager.subscribe(setSyncState); return () => syncManager.unsubscribe(); }, []);

  const handleManualSync = async () => { try { await syncData(); await onRefreshData(); } catch(e) { console.error("Sync failed", e); } };

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isLocked = passcode && !isDetailsUnlocked;

  useEffect(() => { if (activeProfileId) { const p = profiles.find(pr => pr.id === activeProfileId); if (p) setEditingProfile(p); } }, [activeProfileId, profiles]);
  
  const saveImageToFile = async (dataUrl: string): Promise<string> => {
      if (!Capacitor.isNativePlatform()) {
          return dataUrl;
      }
      try {
          const fileName = `profile_${editingProfile.id}_${new Date().getTime()}.jpeg`;
          const savedFile = await Filesystem.writeFile({ path: fileName, data: dataUrl, directory: Directory.Data });
          return savedFile.uri;
      } catch (err) {
          console.warn("Failed to save profile image to filesystem, falling back to data URL", err);
          return dataUrl;
      }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProfile.id) {
        setIsProcessingProfileImage(true);
        try {
            const resizedDataUrl = await resizeImage(file);
            const fileUri = await saveImageToFile(resizedDataUrl);
            setEditingProfile(prev => ({ ...prev, profileImage: fileUri }));
        } catch (error) { console.error("Profile image upload failed:", error); } 
        finally { setIsProcessingProfileImage(false); if(imageInputRef.current) imageInputRef.current.value = ""; }
    }
  };
  
  const handleTakeProfilePhoto = async () => {
    if (!Capacitor.isNativePlatform()) { imageInputRef.current?.click(); return; }
    setIsProcessingProfileImage(true);
    try {
      const image = await CapacitorCamera.getPhoto({ quality: 90, allowEditing: true, resultType: CameraResultType.DataUrl });
      if (image.dataUrl) {
          const resizedDataUrl = await resizeImage(image.dataUrl);
          const fileUri = await saveImageToFile(resizedDataUrl); 
          setEditingProfile(prev => ({ ...prev, profileImage: fileUri })); 
      }
    } catch (error) { console.error("Camera failed", error); } 
    finally { setIsProcessingProfileImage(false); }
  };

  const handleEnvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const config: any = {};
        
        lines.forEach(line => {
            const [rawKey, ...valParts] = line.split('=');
            if (!rawKey) return;
            const key = rawKey.trim();
            let value = valParts.join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            config[key] = value;
        });

        // Parse Storage Config
        const ENDPOINT = config.VITE_R2_ENDPOINT || config.R2_ENDPOINT;
        const ACCESS_KEY = config.VITE_R2_ACCESS_KEY_ID || config.R2_ACCESS_KEY_ID;
        const SECRET_KEY = config.VITE_R2_SECRET_ACCESS_KEY || config.R2_SECRET_ACCESS_KEY;
        const BUCKET = config.VITE_R2_BUCKET_NAME || config.R2_BUCKET_NAME;
        const PUBLIC_URL = config.VITE_R2_PUBLIC_URL || config.R2_PUBLIC_URL;

        if (ENDPOINT) localStorage.setItem('r2_config_R2_ENDPOINT', ENDPOINT);
        if (ACCESS_KEY) localStorage.setItem('r2_config_R2_ACCESS_KEY_ID', ACCESS_KEY);
        if (SECRET_KEY) localStorage.setItem('r2_config_R2_SECRET_ACCESS_KEY', SECRET_KEY);
        if (BUCKET) localStorage.setItem('r2_config_R2_BUCKET_NAME', BUCKET);
        if (PUBLIC_URL) localStorage.setItem('r2_config_R2_PUBLIC_URL', PUBLIC_URL);

        // Parse AI API Key (Auto Config)
        const AI_KEY = config.VITE_GEMINI_API_KEY || config.GEMINI_API_KEY || config.API_KEY;
        if (AI_KEY) {
            localStorage.setItem('custom_ai_api_key', AI_KEY);
        }

        refreshR2Client();
        onSaveSuccess();
    };
    reader.readAsText(file);
    if (envInputRef.current) envInputRef.current.value = '';
  };

  const handleClearR2Config = () => {
    localStorage.removeItem('r2_config_R2_ENDPOINT');
    localStorage.removeItem('r2_config_R2_ACCESS_KEY_ID');
    localStorage.removeItem('r2_config_R2_SECRET_ACCESS_KEY');
    localStorage.removeItem('r2_config_R2_BUCKET_NAME');
    localStorage.removeItem('r2_config_R2_PUBLIC_URL');
    localStorage.removeItem('custom_ai_api_key');
    refreshR2Client();
    onSaveSuccess();
  };

  const handleSaveProfile = async () => {
      if (editingProfile.name && editingProfile.id) {
          setIsSavingProfile(true);
          try { await DataService.saveProfile({ ...editingProfile, synced: 0 }); await onRefreshData(); setShowProfileDetails(false); onSaveSuccess(); } 
          catch (e) { alert("Failed to save profile."); } 
          finally { setIsSavingProfile(false); }
      }
  };

  const loadCloudPhotos = async () => {
    if (!session?.user?.id || !activeProfileId) return;
    setIsLoadingCloud(true);
    try {
      const photos = await DataService.getCloudPhotos(session.user.id, activeProfileId);
      setCloudPhotos(photos);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => { if (view === 'CLOUD') loadCloudPhotos(); }, [view, cloudRefreshTrigger]);

  const filteredMemories = useMemo(() => {
    if (!memoriesSearch.trim()) return memories;
    const lower = memoriesSearch.toLowerCase();
    return memories.filter(m => m.title.toLowerCase().includes(lower) || (m.tags && m.tags.some(t => t.toLowerCase().includes(lower))));
  }, [memories, memoriesSearch]);

  const handleSaveGrowth = async () => {
      if (editingGrowth.month && editingGrowth.height && editingGrowth.weight && activeProfileId) {
          const dataToSave: GrowthData = { id: editingGrowth.id || crypto.randomUUID(), childId: activeProfileId, month: Number(editingGrowth.month), height: Number(editingGrowth.height), weight: Number(editingGrowth.weight) };
          await onSaveGrowth(dataToSave); setEditingGrowth({});
      }
  };
  
  const handleAddReminder = async () => {
      if (newReminder.title && newReminder.date && onSaveReminder) { await onSaveReminder({ id: crypto.randomUUID(), title: newReminder.title, date: newReminder.date, type: 'event' }); setNewReminder({ title: '', date: '' }); }
  };

  const handleRemoveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentImage = editingProfile.profileImage;
    if (currentImage && currentImage.startsWith('file://')) { try { await Filesystem.deleteFile({ path: currentImage }); } catch (err) { console.warn("Could not delete file:", err); } }
    setEditingProfile(prev => ({...prev, profileImage: undefined}));
  };

  const handleNavWithLock = (targetView: typeof view) => {
    if (passcode && !isDetailsUnlocked) {
      onUnlockRequest(() => setView(targetView));
    } else {
      setView(targetView);
    }
  };

  const LockedPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-24 px-6 animate-fade-in text-center">
      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-8">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Security Check</h2>
      <p className="text-slate-400 font-bold text-sm">Verifying access to private data...</p>
    </div>
  );

  // SWIPE TO BACK LOGIC
  const handleTouchStart = (e: React.TouchEvent) => {
    if (view === 'MAIN') return;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (view === 'MAIN' || touchStartX.current === null) return;
    const distance = e.changedTouches[0].clientX - touchStartX.current;
    
    // If swiped right (left to right) more than 80px
    if (distance > 80) {
      e.stopPropagation(); // Prevent tab switching in App.tsx
      setView('MAIN');
    }
    touchStartX.current = null;
  };

  return (
    <div 
      className="max-w-4xl mx-auto relative px-1 sm:px-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {view !== 'MAIN' && (<button onClick={() => setView('MAIN')} className="mb-6 flex items-center gap-3 text-slate-500 font-black hover:text-primary transition-colors px-2 text-lg active:scale-95"><ChevronLeft className="w-7 h-7" />{t('back')}</button>)}
      
      {view === 'MAIN' && (
        <div className="animate-fade-in space-y-5 pb-32">
          <div className="flex items-center justify-between px-2">
            <div className="text-left"><h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{t('settings_title')}</h1><p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-0.5">{t('settings_subtitle')}</p></div>
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner"><SettingsIcon className="w-5 h-5"/></div>
          </div>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4 px-1"><div className="flex items-center gap-2.5"><CircleUser className="w-4 h-4 text-slate-400"/><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('about_child')}</h3></div><button onClick={() => DataService.saveProfile({ id: crypto.randomUUID(), name: t('add_new_profile'), dob: new Date().toISOString().split('T')[0], gender: 'boy' }).then(() => onRefreshData())} className="text-primary text-[10px] font-black uppercase tracking-wider px-4 py-2.5 bg-primary/5 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all"><Plus className="w-3.5 h-3.5"/> {t('add_new_profile')}</button></div>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar border-b border-slate-50 dark:border-slate-700/50 mb-5 items-center">{profiles.map(p => (<button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${p.id === activeProfileId ? 'scale-105' : 'opacity-40 grayscale'}`}><div className={`m-2 w-12 h-12 rounded-[18px] border-2 overflow-hidden flex items-center justify-center ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>{p.profileImage ? <img src={getImageSrc(p.profileImage)} className="w-full h-full object-cover" /> : <Baby className="w-5 h-5 text-slate-400" />}</div><span className="text-[9px] font-black truncate max-w-[50px]">{p.name}</span></button>))}</div>
            <div className="flex items-center justify-between px-1"><div className="text-left"><h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1">{currentProfile?.name}</h2><p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{currentProfile?.dob}</p></div><button onClick={() => isLocked ? onUnlockRequest(() => setShowProfileDetails(true)) : setShowProfileDetails(!showProfileDetails)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-primary text-white active:scale-95 shadow-xl shadow-primary/30">{isLocked ? <Lock className="w-3.5 h-3.5" /> : (showProfileDetails ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />)}{isLocked ? t('tap_to_unlock') : (showProfileDetails ? t('close_edit') : t('edit_profile'))}</button></div>
            {showProfileDetails && !isLocked && (
              <div className="animate-slide-up space-y-4 pt-4 pb-4 overflow-y-auto max-h-[70vh] no-scrollbar">
                 <div className="flex flex-col items-center mb-4"><div className="relative group w-24 h-24"><div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 flex items-center justify-center">{isProcessingProfileImage ? (<Loader2 className="w-8 h-8 text-primary animate-spin" />) : editingProfile.profileImage ? (<img src={getImageSrc(editingProfile.profileImage)} className="w-full h-full object-cover" alt="Profile" />) : (<Baby className="w-10 h-10 text-slate-400" />)}</div>{editingProfile.profileImage && !isProcessingProfileImage && (<button type="button" onClick={handleRemoveImage} className="absolute top-0 right-0 z-10 p-1.5 bg-rose-500 text-white rounded-full shadow-md transition-transform hover:scale-110"><X className="w-3 h-3" /></button>)}</div><div className="flex gap-3 mt-4">{Capacitor.isNativePlatform() ? (<button type="button" onClick={handleTakeProfilePhoto} disabled={isProcessingProfileImage} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50"><Camera className="w-3.5 h-3.5" />{t('take_photo')}</button>) : (<button type="button" onClick={() => !isProcessingProfileImage && imageInputRef.current?.click()} disabled={isProcessingProfileImage} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50"><ImageIcon className="w-3.5 h-3.5" />{t('upload_photo')}</button>)}</div><input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleProfileImageUpload} /></div>
                <div className="space-y-3">
                  <IOSInput label={t('child_name_label')} icon={User} value={editingProfile.name} onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <IOSInput label={t('child_dob')} icon={Calendar} type="date" value={editingProfile.dob} onChange={(e: any) => setEditingProfile({...editingProfile, dob: e.target.value})} />
                    <IOSInput label={t('birth_time')} icon={Clock} type="time" value={editingProfile.birthTime || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthTime: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <IOSInput label={t('gender_label')} icon={Baby} type="select" options={[{ value: 'boy', label: t('boy') }, { value: 'girl', label: t('girl') }]} value={editingProfile.gender} onChange={(e: any) => setEditingProfile({...editingProfile, gender: e.target.value})} />
                    <IOSInput label={t('blood_type')} icon={Droplets} type="select" options={[{ value: '', label: 'Select' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }]} value={editingProfile.bloodType || ''} onChange={(e: any) => setEditingProfile({...editingProfile, bloodType: e.target.value})} />
                  </div>
                  <IOSInput label={t('hospital_name')} icon={Building2} value={editingProfile.hospitalName || ''} placeholder={t('hospital_placeholder')} onChange={(e: any) => setEditingProfile({...editingProfile, hospitalName: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <IOSInput label={t('city_label')} icon={MapPin} value={editingProfile.birthLocation || editingProfile.city || ''} placeholder={t('location_placeholder')} onChange={(e: any) => setEditingProfile({...editingProfile, birthLocation: e.target.value, city: e.target.value})} />
                    <IOSInput label={t('country_label')} icon={Globe} value={editingProfile.country || ''} placeholder={t('country_placeholder')} onChange={(e: any) => setEditingProfile({...editingProfile, country: e.target.value})} />
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3 "><button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 py-4 bg-primary text-white text-xs font-black rounded-2xl shadow-md uppercase tracking-[0.2em] active:scale-[0.97] flex items-center justify-center gap-3 shadow-primary/20 ">{isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{t('save_changes')}</button><button onClick={() => { if(editingProfile.id) { onDeleteProfile(editingProfile.id); setShowProfileDetails(false); } }} disabled={isSavingProfile || profiles.length <= 1} className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl active:scale-[0.97] flex items-center justify-center disabled:opacity-40 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-color"><Trash2 className="w-5 h-5" /></button></div>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-4 px-6 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('app_settings')}</h3></div>
            <SettingToggle icon={theme === 'dark' ? Moon : Sun} label={t('theme')} sublabel={theme === 'dark' ? 'Dark Mode On' : 'Light Mode On'} active={theme === 'dark'} onToggle={toggleTheme} colorClass="text-indigo-500" bgClass="bg-indigo-50 dark:bg-indigo-900/20"/>
            <div className="p-5 flex items-center justify-between group"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 shadow-sm"><Languages className="w-5 h-5" /></div><div className="text-left"><h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{t('language')}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'mm' ? 'မြန်မာဘာသာ' : 'English (US)'}</p></div></div><div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-600/50 shadow-inner"><button type="button" onClick={(e) => { e.preventDefault(); setLanguage('mm'); }} className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${language === 'mm' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-500' : 'text-slate-400 hover:text-slate-600'}`}>MM</button><button type="button" onClick={(e) => { e.preventDefault(); setLanguage('en'); }} className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${language === 'en' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-500' : 'text-slate-400 hover:text-slate-600'}`}>EN</button></div></div>
            <SettingToggle icon={BellRing} label={t('notifications')} sublabel={remindersEnabled ? 'Enabled' : 'Disabled'} active={remindersEnabled} onToggle={toggleReminders} colorClass="text-amber-500" bgClass="bg-amber-50 dark:bg-amber-900/20"/>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-4 px-6 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('data_management')}</h3></div>
            <section className="p-5 space-y-4">
              <div className="flex items-start gap-4"><div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500 shadow-sm shrink-0"><Cloud className="w-5 h-5" /></div><div className="flex-1 text-left"><h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{t('cloud_sync')}</h3><p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{isGuestMode ? t('sync_guest_msg') : session ? t('sync_active') : t('sync_disconnected')}</p></div></div>
              {!isGuestMode && session && (
                <div className="flex flex-col gap-2">
                  <button onClick={handleManualSync} disabled={syncState.status === 'syncing'} className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3 shadow-sky-500/20 disabled:bg-slate-300 disabled:cursor-not-allowed">{syncState.status === 'syncing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />}{t('sync_now')}</button>
                  <button onClick={() => handleNavWithLock('R2_CONFIG')} className="w-full py-3.5 bg-slate-100 dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-black rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 flex items-center justify-center gap-2 border border-sky-100 dark:border-sky-900/30 transition-all shadow-sm">
                    <HardDrive className="w-3.5 h-3.5" /> {t('r2_config_title')}
                  </button>
                  <button onClick={() => handleNavWithLock('CLOUD')} className="w-full py-3.5 bg-slate-100 dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-black rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 flex items-center justify-center gap-2 border border-sky-100 dark:border-sky-900/30 transition-all shadow-sm">
                    <Search className="w-3.5 h-3.5" /> Browse Cloud Backup
                  </button>
                </div>
              )}
            </section>
             <button onClick={() => handleNavWithLock('GROWTH')} className="w-full text-left p-5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform duration-300 mr-4"><Activity className="w-5 h-5" /></div><p className="font-black text-slate-800 dark:text-white text-sm">{t('manage_growth')}</p><div className="ml-auto flex items-center gap-3 text-slate-400"><span className="text-sm font-black">{growthData.length}</span><ChevronRight className="w-4 h-4"/></div></button>
             <button onClick={() => setView('REMINDERS')} className="w-full text-left p-5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-300 mr-4"><Bell className="w-5 h-5" /></div><p className="font-black text-slate-800 dark:text-white text-sm">{t('manage_reminders')}</p><div className="ml-auto flex items-center gap-3 text-slate-400"><span className="text-sm font-black">{remindersList.length}</span><ChevronRight className="w-4 h-4"/></div></button>
             <button onClick={() => handleNavWithLock('STORIES')} className="w-full text-left p-5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform duration-300 mr-4"><BookOpen className="w-5 h-5" /></div><p className="font-black text-slate-800 dark:text-white text-sm">Ebooks</p><div className="ml-auto flex items-center gap-3 text-slate-400"><span className="text-sm font-black">{stories.length}</span><ChevronRight className="w-4 h-4"/></div></button>
             <button onClick={() => handleNavWithLock('MEMORIES')} className="w-full text-left p-5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 mr-4"><ImageIcon className="w-5 h-5" /></div><p className="font-black text-slate-800 dark:text-white text-sm">{t('manage_memories')}</p><div className="ml-auto flex items-center gap-3 text-slate-400"><span className="text-sm font-black">{memories.length}</span><ChevronRight className="w-4 h-4"/></div></button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-5 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm"><ShieldCheck className="w-4.5 h-4.5" /></div><h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none">{t('security_title')}</h3></div><div className="flex gap-2">{passcode ? (<div className="flex gap-1"><button onClick={(e) => { e.preventDefault(); onPasscodeChange(); }} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-primary transition-all active:scale-90"><Pencil className="w-3.5 h-3.5" /></button><button onClick={(e) => { e.preventDefault(); onPasscodeRemove(); }} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button></div>) : <button onClick={(e) => { e.preventDefault(); onPasscodeSetup(); }} className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest active:scale-95 shadow-md shadow-indigo-500/20">{t('setup_passcode')}</button>}</div></div>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 p-5 mt-10 shadow-sm mb-12"><div className="flex flex-col sm:flex-row items-center justify-between gap-6"><div className="flex items-center gap-4 w-full sm:w-auto"><div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl shadow-inner flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-600"><CircleUser className="w-6 h-6" /></div><div className="text-left flex-1 min-w-0"><h4 className="font-black text-slate-800 dark:text-white text-sm tracking-tight uppercase tracking-widest">{isGuestMode ? 'Guest Mode' : 'Account Active'}</h4><div className="flex items-center gap-2 text-slate-400 text-xs font-bold mt-1"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate max-w-[200px]">{isGuestMode ? 'Locally Stored Data' : (session?.user?.email || 'Logged In')}</span></div></div></div><button type="button" onClick={(e) => { e.preventDefault(); onLogout(); }} className="w-full sm:w-auto px-6 py-4 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-500 hover:text-white text-rose-500 text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/20"><LogOut className="w-4 h-4" />{t('logout')}</button></div></section>
        </div>
      )}

      {view === 'R2_CONFIG' && (isLocked ? <LockedPlaceholder /> : (
        <div className="animate-fade-in space-y-6 pb-32 px-1 text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-indigo-500 shadow-inner mb-6">
              <HardDrive className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">{t('r2_config_title')}</h2>
            <p className="text-slate-400 font-bold text-sm max-w-[280px] mx-auto leading-relaxed">Import your storage credentials securely through a configuration file.</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-[48px] p-8 shadow-xl border border-slate-100 dark:border-slate-700 space-y-8 max-w-sm mx-auto">
            <div className="flex flex-col items-center gap-4">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${isR2Configured() ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}>
                    {isR2Configured() ? (
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-zoom-in" />
                    ) : (
                        <Cloud className="w-12 h-12 text-slate-200 dark:text-slate-800" />
                    )}
                </div>
                <div className="text-center">
                   <h3 className={`font-black text-sm uppercase tracking-[0.2em] mb-1 ${isR2Configured() ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {isR2Configured() ? t('r2_configured') : t('r2_not_configured')}
                   </h3>
                   {isR2Configured() && <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">End-to-end encryption active</p>}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <button 
                  onClick={() => envInputRef.current?.click()} 
                  className="w-full py-5 bg-indigo-500 text-white font-black rounded-[24px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                >
                    <FileUp className="w-5 h-5" />
                    {t('import_env')}
                </button>
                <input ref={envInputRef} type="file" className="hidden" accept=".env,.local,.txt,.env.local" onChange={handleEnvImport} />
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3 text-left">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    {t('import_hint')}
                  </p>
                </div>

                {isR2Configured() && (
                  <button 
                    onClick={handleClearR2Config} 
                    className="w-full py-4 text-rose-500 dark:text-rose-400 font-black flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('clear_config')}
                  </button>
                )}
            </div>
          </div>

          <div className="pt-8 opacity-40">
             <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <Lock className="w-3 h-3" />
                <span>AES-256 System Protection</span>
             </div>
          </div>
        </div>
      ))}

      {view === 'CLOUD' && (isLocked ? <LockedPlaceholder /> : (
        <div className="animate-fade-in space-y-4 pb-32 px-1 text-left">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Cloud Backup</h2>
            <div className="w-10 h-10 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500 shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
          </div>
          {isLoadingCloud ? (
             <div className="py-20 flex flex-col items-center justify-center min-h-[300px] animate-pulse">
                <Loader2 className="w-12 h-12 text-sky-500 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Connecting to Vault...</p>
             </div>
          ) : cloudPhotos.length > 0 ? (
             <div className="grid grid-cols-3 gap-3">
               {cloudPhotos.map((photo) => (
                 <div key={photo.id} onClick={() => onViewCloudPhoto?.(photo.url, photo.name)} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group shadow-sm active:scale-95 transition-all">
                   <img src={photo.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   <div className="absolute bottom-2 right-2"><Cloud className="w-3.5 h-3.5 text-white/70 shadow-lg" /></div>
                 </div>
               ))}
             </div>
          ) : (
            <div className="py-24 text-center opacity-30 flex flex-col items-center justify-center gap-4 min-h-[300px]">
               <Cloud className="w-14 h-14" />
               <p className="text-xs font-black uppercase tracking-widest">No Cloud Backup Found</p>
            </div>
          )}
        </div>
      ))}

      {view === 'MEMORIES' && (isLocked ? <LockedPlaceholder /> : (
        <div className="space-y-4 animate-fade-in pb-32 px-1 text-left">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">{t('manage_memories')}</h2>
            <button 
              onClick={() => setIsMemoriesSearchVisible(!isMemoriesSearchVisible)}
              className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner active:scale-90 transition-all"
            >
              {isMemoriesSearchVisible ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
            </button>
          </div>

          {isMemoriesSearchVisible && (
            <div className="animate-fade-in mb-4 mx-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  autoFocus
                  value={memoriesSearch}
                  onChange={(e) => setMemoriesSearch(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {filteredMemories.length > 0 ? (
            <div className="grid gap-3">
              {filteredMemories.map(m => (
                <div key={m.id} className="bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-[24px] sm:rounded-[32px] border border-slate-50 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 sm:gap-4 group hover:shadow-md transition-all overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 overflow-hidden">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-50 dark:border-slate-700 shadow-sm flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                      {m.imageUrls && m.imageUrls.length > 0 ? <img src={getImageSrc(m.imageUrls[0])} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
                    </div>
                    <div className="min-w-0 text-left flex-1 overflow-hidden flex flex-col">
                      <h4 className="font-black text-slate-800 dark:text-white text-sm truncate block whitespace-nowrap leading-none mb-1.5">{m.title}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-2.5 h-2.5 shrink-0"/> {m.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEditMemory(m)} className="p-3 text-slate-400 hover:text-primary transition-colors active:scale-90 flex items-center justify-center"><Pencil className="w-4.5 h-4.5" /></button>
                    <button onClick={() => onDeleteMemory(m.id)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors active:scale-90 flex items-center justify-center"><Trash2 className="w-4.5 h-4.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center opacity-30 flex flex-col items-center justify-center gap-4 min-h-[300px]">
              {memoriesSearch ? <Search className="w-14 h-14" /> : <ImageIcon className="w-14 h-14"/>}
              <p className="text-xs font-black uppercase tracking-widest">{memoriesSearch ? 'No matches found' : 'No Memories Yet'}</p>
            </div>
          )}
        </div>
      ))}
      {view === 'GROWTH' && (isLocked ? <LockedPlaceholder /> : (<div className="space-y-6 animate-fade-in pb-32 px-1 text-left"><section className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700"><h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 tracking-tight leading-none text-left"><Activity className="w-6 h-6 text-teal-500" />{editingGrowth.id ? t('update_record') : t('add_record')}</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"><IOSInput label={t('month')} icon={Calendar} type="number" value={editingGrowth.month || ''} onChange={(e: any) => setEditingGrowth({...editingGrowth, month: e.target.value ? parseInt(e.target.value) : undefined})} placeholder="e.g. 12" /><IOSInput label={`${t('height_label')} (cm)`} icon={Ruler} type="number" step="0.1" value={editingGrowth.height || ''} onChange={(e: any) => setEditingGrowth({...editingGrowth, height: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="e.g. 75.5" /><IOSInput label={`${t('weight_label')} (kg)`} icon={Scale} type="number" step="0.1" value={editingGrowth.weight || ''} onChange={(e: any) => setEditingGrowth({...editingGrowth, weight: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="e.g. 10.2" className="sm:col-span-2"/></div><div className="flex gap-3">{editingGrowth.id && <button onClick={() => setEditingGrowth({})} className="w-full py-4.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-black rounded-2xl uppercase tracking-[0.2em] active:scale-95">{t('cancel_edit')}</button>}<button onClick={handleSaveGrowth} className="w-full py-5 bg-teal-500 text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em] active:scale-95 shadow-teal-500/20">{editingGrowth.id ? t('update_btn') : t('add_record')}</button></div></section><div className="space-y-2">{growthData.map(g => (<div key={g.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm group hover:border-teal-200 transition-all"><div className="text-left flex items-center gap-6"><div className="text-center w-12 shrink-0"><p className="font-black text-teal-500 text-xl leading-none">{g.month}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{t('months_label')}</p></div><div><p className="text-xs font-bold text-slate-400">{t('height_label')}: <span className="text-sm font-black text-slate-700 dark:text-slate-200">{g.height} cm</span></p><p className="text-xs font-bold text-slate-400">{t('weight_label')}: <span className="text-sm font-black text-slate-700 dark:text-slate-200">{g.weight} kg</span></p></div></div><div className="flex gap-1"><button onClick={() => setEditingGrowth(g)} className="p-2.5 text-slate-400 hover:text-primary transition-colors active:scale-90"><Pencil className="w-4 h-4" /></button><button onClick={() => onDeleteGrowth?.(g.id!)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button></div></div>))}</div></div>))}
      {view === 'REMINDERS' && (isLocked ? <LockedPlaceholder /> : (<div className="space-y-6 animate-fade-in pb-32 px-1 text-left"><section className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700"><h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 tracking-tight leading-none text-left"><Bell className="w-6 h-6 text-amber-500" /> {t('add_reminder')}</h2><div className="flex flex-col gap-4 mb-8"><IOSInput label={t('reminder_title')} icon={User} value={newReminder.title} onChange={(e: any) => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Vaccination" /><IOSInput label={t('reminder_date')} icon={Clock} type="date" value={newReminder.date} onChange={(e: any) => setNewReminder({...newReminder, date: e.target.value})} /></div><button onClick={handleAddReminder} className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em] active:scale-95 shadow-amber-500/20">{t('save_reminder')}</button></section><div className="space-y-2">{remindersList.map(r => (<div key={r.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm group hover:border-amber-200 transition-all"><div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm leading-none mb-1">{r.title}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{r.date}</p></div><button onClick={() => onDeleteReminder?.(r.id)} className="p-2 text-rose-500 active:scale-90"><Trash2 className="w-5 h-5" /></button></div>))}</div></div>))}
      {view === 'STORIES' && (isLocked ? <LockedPlaceholder /> : (<div className="space-y-4 animate-fade-in pb-32 px-1 text-left"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Saved Ebooks</h2><div className="w-10 h-10 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-500 shadow-inner"><BookOpen className="w-5 h-5" /></div></div>{stories.length > 0 ? stories.map(s => (<div key={s.id} onClick={() => onStoryClick(s)} className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm text-left relative overflow-hidden cursor-pointer group active:scale-[0.98] transition-all hover:border-violet-200"><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5" /></div><div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm truncate max-w-[180px] leading-none mb-1">{s.title}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.date}</p></div></div><button onClick={(e) => { e.stopPropagation(); onDeleteStory(s.id); }} className="p-2 text-slate-300 hover:text-rose-500 active:scale-90"><Trash2 className="w-4 h-4" /></button></div><p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic line-clamp-3">"{s.content}"</p></div>)) : (<div className="py-20 text-center opacity-30 flex flex-col items-center justify-center gap-4 min-h-[300px]"><BookOpen className="w-14 h-14"/><p className="text-xs font-black uppercase tracking-widest">No Stories Found</p></div>)}</div>))}
    </div>
  );
};

export default Settings;
