
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Camera, Image as ImageIcon, Baby, ChevronRight, Sparkles, Plus, Moon, Sun, Pencil, X, Settings, Trash2, ArrowLeft, Ruler, Scale, Calendar, Lock, Unlock, ShieldCheck, KeyRound, Cloud, CloudOff, RefreshCw, AlertTriangle, Save, UserPlus, LogOut, User, Loader2, Check, Tag, Search, Filter } from 'lucide-react';
import { MemoryCard } from './components/MemoryCard';
import { GrowthChart } from './components/GrowthChart';
import { StoryGenerator } from './components/StoryGenerator';
import { GalleryGrid } from './components/GalleryGrid';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { AuthScreen } from './components/AuthScreen';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData } from './types';
import { getTranslation } from './translations';
import { initDB, DataService, syncData, generateId } from './db';
import { supabase } from './supabaseClient';

function App() {
  // Authentication State
  const [session, setSession] = useState<any>(null);
  // Default to false so AuthScreen shows up initially unless guest_mode was saved
  const [isGuest, setIsGuest] = useState(() => {
     return localStorage.getItem('guest_mode') === 'true';
  });
  const [authChecking, setAuthChecking] = useState(true);

  // Application Data State
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [settingsView, setSettingsView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES'>('MAIN');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null); 
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New Saving State
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Logout Loading State
  const [showToast, setShowToast] = useState<{message: string, type: 'success'|'error'} | null>(null); // Toast Notification
  
  // Security State
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isDetailsUnlocked, setIsDetailsUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'MEMORY' | 'GROWTH' | 'PROFILE', id: string } | null>(null);

  // Application Data State (Arrays)
  const [memories, setMemories] = useState<Memory[]>([]);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({ id: '', name: '', dob: '', gender: 'boy' }); 
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Input Focus State
  const [dateInputType, setDateInputType] = useState('text');
  
  // State for new growth record input
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [isEditingGrowth, setIsEditingGrowth] = useState(false);
  
  // State for Settings Filter (Manage Memories)
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [settingsStartDate, setSettingsStartDate] = useState('');
  const [settingsEndDate, setSettingsEndDate] = useState('');
  const [settingsSelectedTag, setSettingsSelectedTag] = useState('');
  const [settingsShowFilters, setSettingsShowFilters] = useState(false);

  // Persistence for Language 
  const [language, setLanguage] = useState<Language>(() => {
     return (localStorage.getItem('language') as Language) || 'mm';
  });

  // Persistence for Theme
  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = (key: any) => getTranslation(language, key);

  // Helper Functions
  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (isoDate: string | undefined) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const [newMemory, setNewMemory] = useState<{title: string; desc: string; date: string; imageUrl?: string; tags: string[]}>({ 
    title: '', 
    desc: '', 
    date: getTodayLocal(),
    tags: []
  });
  const [tagInput, setTagInput] = useState(''); // State for tag input
  const [editingId, setEditingId] = useState<string | null>(null);

  // Computed Active Profile
  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  // Computed Filtered Memories for Settings
  const filteredSettingsMemories = useMemo(() => {
    return memories.filter(memory => {
        // 1. Text Search
        const query = settingsSearchQuery.toLowerCase();
        const matchesText = (memory.title?.toLowerCase().includes(query) || 
                             memory.description?.toLowerCase().includes(query));

        // 2. Date Range
        const matchesStart = settingsStartDate ? memory.date >= settingsStartDate : true;
        const matchesEnd = settingsEndDate ? memory.date <= settingsEndDate : true;

        // 3. Tag
        const matchesTag = settingsSelectedTag ? memory.tags?.includes(settingsSelectedTag) : true;

        return matchesText && matchesStart && matchesEnd && matchesTag;
    });
  }, [memories, settingsSearchQuery, settingsStartDate, settingsEndDate, settingsSelectedTag]);
  
  const allSettingsTags = useMemo(() => {
      const tags = new Set<string>();
      memories.forEach(m => {
          if(m.tags) m.tags.forEach(t => tags.add(t));
      });
      return Array.from(tags);
  }, [memories]);

  // --- Toast Handler ---
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const triggerToast = (message: string, type: 'success'|'error' = 'success') => {
      setShowToast({message, type});
  };

  // --- Auth & Data Loading Effects ---

  useEffect(() => {
    // Check Supabase Session with Error Handling
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch(err => {
      console.warn("Session check failed, defaulting to signed out", err);
      setSession(null);
    }).finally(() => {
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        localStorage.removeItem('guest_mode');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize DB and Load Data only when user is allowed (Guest or Logged In)
  useEffect(() => {
    if (!session && !isGuest) return; // Don't load if locked out

    const loadData = async () => {
      await initDB();
      await refreshData();
      setIsLoading(false);
      // Try initial sync silently if online and logged in
      if (navigator.onLine && session) {
         syncData().then(() => refreshData());
      }
    };
    loadData();

    // Setup Online/Offline listeners
    const handleOnline = async () => {
      setIsOnline(true);
      if (session) {
        console.log("Online: Syncing...");
        await syncData();
        await refreshData();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session, isGuest]);

  // Effect to save Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Effect to save Language
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const refreshData = async () => {
      const fetchedProfiles = await DataService.getProfiles();
      setProfiles(fetchedProfiles);

      let targetId = activeProfileId;

      if (fetchedProfiles.length > 0) {
          if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) {
             targetId = fetchedProfiles[0].id || '';
             setActiveProfileId(targetId);
             setEditingProfile(fetchedProfiles[0]);
          } else {
             const active = fetchedProfiles.find(p => p.id === targetId);
             if (active) setEditingProfile(active);
          }
      } else {
        setActiveProfileId('');
        setMemories([]);
        setGrowthData([]);
        return;
      }

      if (targetId) {
          await loadChildData(targetId);
      }
  };

  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const growth = await DataService.getGrowth(childId);
      setMemories(mems);
      setGrowthData(growth);
  };

  // --- Auth Handlers ---
  const handleAuthSuccess = () => {
    setIsGuest(false);
  };

  const handleGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('guest_mode', 'true');
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
        await supabase.auth.signOut();
        // Clear local data to avoid leaking data to another user on shared device
        await DataService.clearLocalData();
        
        setIsGuest(false); 
        localStorage.removeItem('guest_mode');
        setSession(null);
        setMemories([]);
        setGrowthData([]);
        setProfiles([]);
        setActiveProfileId('');
    } catch (err) {
        console.error("Sign out error", err);
    } finally {
        setIsLoggingOut(false);
    }
  };

  // --- Main Logic Handlers ---

  const handleManualSync = async () => {
      if (!isOnline || !session) return;
      setIsSyncing(true);
      await syncData();
      await refreshData();
      setIsSyncing(false);
  };

  const handleSaveProfile = async () => {
      if (!editingProfile.name.trim()) return;
      setIsSaving(true);
      try {
        const savedId = await DataService.saveProfile(editingProfile);
        await refreshData();
        setActiveProfileId(savedId);
        loadChildData(savedId);
        triggerToast(t('saved_success'));
      } catch (error) {
         console.error(error);
      } finally {
        setIsSaving(false);
      }
  };

  const createNewProfile = () => {
      setEditingProfile({
         id: '',
         name: '',
         dob: '',
         gender: 'boy'
      });
      setIsDetailsUnlocked(false);
  };

  const selectProfileToEdit = (profile: ChildProfile) => {
      setEditingProfile(profile);
      setActiveProfileId(profile.id || '');
      loadChildData(profile.id || '');
      setIsDetailsUnlocked(false);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'mm' ? 'en' : 'mm');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Passcode Logic
  const handleUnlockClick = () => {
    if (isDetailsUnlocked) {
      setIsDetailsUnlocked(false);
    } else {
      setPasscodeMode('UNLOCK');
      setPasscodeInput('');
      setPasscodeError(false);
      setShowPasscodeModal(true);
    }
  };
  
  const openPasscodeSetup = () => { setPasscodeMode('SETUP'); setPasscodeInput(''); setPasscodeError(false); setShowPasscodeModal(true); };
  const openChangePasscode = () => { setPasscodeMode('CHANGE_VERIFY'); setPasscodeInput(''); setPasscodeError(false); setShowPasscodeModal(true); };
  const openRemovePasscode = () => { setPasscodeMode('REMOVE'); setPasscodeInput(''); setPasscodeError(false); setShowPasscodeModal(true); };
  
  const handlePasscodeSubmit = () => {
    if (passcodeInput.length !== 4) { setPasscodeError(true); setTimeout(() => setPasscodeError(false), 500); return; }
    if (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW') { localStorage.setItem('app_passcode', passcodeInput); setPasscode(passcodeInput); setIsDetailsUnlocked(true); setShowPasscodeModal(false); setPasscodeInput(''); return; }
    if (passcodeInput === passcode) {
       if (passcodeMode === 'UNLOCK') { setIsDetailsUnlocked(true); setShowPasscodeModal(false); } 
       else if (passcodeMode === 'CHANGE_VERIFY') { setPasscodeMode('CHANGE_NEW'); setPasscodeInput(''); } 
       else if (passcodeMode === 'REMOVE') { localStorage.removeItem('app_passcode'); setPasscode(null); setIsDetailsUnlocked(true); setShowPasscodeModal(false); }
    } else { setPasscodeError(true); setTimeout(() => setPasscodeError(false), 500); }
  };
  const getModalTitle = () => {
      switch(passcodeMode) {
          case 'SETUP': return t('create_passcode');
          case 'CHANGE_NEW': return t('enter_new_passcode');
          case 'CHANGE_VERIFY': return t('enter_old_passcode');
          case 'REMOVE': return t('enter_passcode');
          default: return !passcode ? t('create_passcode') : t('enter_passcode');
      }
  };

  // Memory/Growth Handlers
  const handleEditStart = (memory: Memory) => { setNewMemory({ title: memory.title, desc: memory.description, imageUrl: memory.imageUrl, date: memory.date, tags: memory.tags || [] }); setEditingId(memory.id); setActiveTab(TabView.ADD_MEMORY); setSettingsView('MAIN'); setSelectedMemory(null); };
  const handleCancelEdit = () => { setNewMemory({ title: '', desc: '', date: getTodayLocal(), tags: [] }); setEditingId(null); setActiveTab(TabView.HOME); };
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewMemory(prev => ({ ...prev, imageUrl: reader.result as string })); }; reader.readAsDataURL(file); } };
  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setEditingProfile(prev => ({ ...prev, profileImage: reader.result as string })); }; reader.readAsDataURL(file); } };
  const triggerFileInput = () => { fileInputRef.current?.click(); };
  const triggerProfileImageInput = () => { if(isDetailsUnlocked) { profileImageInputRef.current?.click(); } };
  const requestDeleteMemory = (id: string, e?: React.MouseEvent) => { e?.stopPropagation(); setItemToDelete({ type: 'MEMORY', id }); };
  const requestDeleteGrowth = (id: string) => { setItemToDelete({ type: 'GROWTH', id }); };
  const requestDeleteProfile = (id: string) => { if (profiles.length <= 1 && id === profiles[0].id) { alert("Cannot delete the only profile."); return; } setItemToDelete({ type: 'PROFILE', id }); };
  const confirmDelete = async () => {
     if (!itemToDelete) return;
     setIsSaving(true);
     try {
       if (itemToDelete.type === 'MEMORY') { await DataService.deleteMemory(itemToDelete.id); if (selectedMemory && selectedMemory.id === itemToDelete.id) { setSelectedMemory(null); } } 
       else if (itemToDelete.type === 'GROWTH') { await DataService.deleteGrowth(itemToDelete.id); } 
       else if (itemToDelete.type === 'PROFILE') { await DataService.deleteProfile(itemToDelete.id); }
       await refreshData();
       setItemToDelete(null);
     } finally {
       setIsSaving(false);
     }
  };
  
  // Tag Handlers
  const handleAddTag = () => {
    if (tagInput.trim() && !newMemory.tags.includes(tagInput.trim())) {
      setNewMemory(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };
  const handleRemoveTag = (tagToRemove: string) => {
    setNewMemory(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleSaveMemory = async () => {
    if (!newMemory.title.trim()) return;
    setIsSaving(true);
    try {
        const memoryToSave: Memory = {
            id: editingId || generateId(),
            childId: activeProfileId,
            title: newMemory.title,
            date: newMemory.date || getTodayLocal(),
            description: newMemory.desc,
            imageUrl: newMemory.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image',
            tags: newMemory.tags,
            synced: 0
        };
        await DataService.addMemory(memoryToSave);
        await refreshData();
        triggerToast(t('saved_success'));
        handleCancelEdit();
    } catch (error) {
        console.error("Error saving memory:", error);
        triggerToast("Failed to save memory", 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddGrowthRecord = async () => {
     if (!newGrowth.month || !newGrowth.height || !newGrowth.weight) return;
     setIsSaving(true);
     try {
         const record: GrowthData = {
             id: newGrowth.id || generateId(),
             childId: activeProfileId,
             month: newGrowth.month,
             height: newGrowth.height,
             weight: newGrowth.weight,
             synced: 0
         };
         await DataService.saveGrowth(record);
         await refreshData();
         setNewGrowth({ month: undefined, height: undefined, weight: undefined });
         setIsEditingGrowth(false);
         triggerToast(t('saved_success'));
     } catch (e) {
         console.error(e);
         triggerToast("Failed to save growth record", 'error');
     } finally {
         setIsSaving(false);
     }
  };

  const handleEditGrowthRecord = (data: GrowthData) => {
      setNewGrowth({ id: data.id, month: data.month, height: data.height, weight: data.weight });
      setIsEditingGrowth(true);
  };

  // --- RENDER ---
  
  if (authChecking) {
     return <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 flex items-center justify-center text-rose-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
     </div>;
  }

  // Auth Screen logic enabled
  if (!session && !isGuest) {
     return <AuthScreen onAuthSuccess={handleAuthSuccess} onGuestMode={handleGuestMode} language={language} />;
  }

  // Tabs
  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

  // Header Date
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;
    }

    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        return (
          <div className="space-y-4 pb-32">
             {/* Header Tile */}
            <div className="flex justify-between items-center mb-2">
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                    {activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors flex items-center gap-2">
                      {formattedDate}
                      {session && isOnline ? (
                         <button onClick={handleManualSync} className="text-primary hover:text-primary/80 transition-colors">
                             <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                         </button>
                      ) : (
                         <CloudOff className="w-4 h-4 text-slate-400" />
                      )}
                  </p>
               </div>
               {activeProfile.profileImage && (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                      <img src={activeProfile.profileImage} alt="Profile" className="w-full h-full object-cover"/>
                  </div>
               )}
            </div>
            {/* Grid Content */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {latestMemory ? (
                  <div 
                    className="col-span-2 md:col-span-2 relative h-64 rounded-[32px] overflow-hidden shadow-sm group cursor-pointer border border-transparent dark:border-slate-700"
                    onClick={() => setSelectedMemory(latestMemory)}
                  >
                    <img src={latestMemory?.imageUrl} alt="Latest" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                      <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/20">{t('latest_arrival')}</span>
                      <h3 className="text-white text-xl font-bold leading-tight drop-shadow-sm">{latestMemory?.title}</h3>
                      <p className="text-white/80 text-sm mt-1 line-clamp-1 drop-shadow-sm">{latestMemory?.description}</p>
                    </div>
                  </div>
              ) : (
                  <div className="col-span-2 md:col-span-2 relative h-64 rounded-[32px] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">{t('no_photos')}</div>
              )}
              <div 
                onClick={() => setActiveTab(TabView.STORY)}
                className="col-span-1 md:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-5 text-white flex flex-col justify-between h-40 md:h-64 shadow-sm relative overflow-hidden cursor-pointer active:scale-95 transition-transform border border-transparent dark:border-slate-700"
              >
                <Sparkles className="w-6 h-6 text-yellow-300 opacity-80" />
                <div className="absolute top-0 right-0 p-2 opacity-10"><BookOpen className="w-24 h-24" /></div>
                <div><h3 className="font-bold text-lg leading-tight">{t('create_story')}</h3><div className="flex items-center mt-2 text-xs font-medium text-white/80">{t('start')} <ChevronRight className="w-3 h-3 ml-1" /></div></div>
              </div>
              <div 
                onClick={() => setActiveTab(TabView.GROWTH)}
                className="col-span-1 md:col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-5 flex flex-col justify-between h-40 md:h-64 shadow-sm cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-start"><Activity className="w-6 h-6 text-teal-500" /><span className="text-xs font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-full">+2cm</span></div>
                <div><p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t('current_height')}</p><h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl">{growthData.length > 0 ? growthData[growthData.length - 1]?.height : 0} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">cm</span></h3></div>
              </div>
              <div className="col-span-2 md:col-span-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 dark:text-slate-200">{t('memories')}</h3><button onClick={() => setActiveTab(TabView.GALLERY)} className="text-primary text-xs font-bold">{t('see_all')}</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memories.slice(1, 4).map(mem => (
                    <div key={mem.id} onClick={() => setSelectedMemory(mem)} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                      <div className="flex items-center space-x-4"><img src={mem.imageUrl} className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 dark:ring-slate-700" alt={mem.title} /><div><h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{mem.title}</h4><p className="text-slate-400 dark:text-slate-500 text-xs">{formatDateDisplay(mem.date)}</p></div></div><ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case TabView.ADD_MEMORY:
        // Updated ADD_MEMORY with better alignment, sizing and Tags
        return (
          <div className="pb-32 animate-fade-in">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{editingId ? t('edit_memory_title') : t('add_memory_title')}</h2>{editingId && (<button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium">{t('cancel_btn')}</button>)}</div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
              <div onClick={triggerFileInput} className="relative w-full h-48 md:h-64 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group overflow-hidden">
                {newMemory.imageUrl ? (<><img src={newMemory.imageUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white"><Camera className="w-6 h-6" /></div></div></>) : (<div className="flex flex-col items-center justify-center w-full h-full"><div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-500 group-hover:text-primary transition-colors"><Camera className="w-6 h-6" /></div><p className="mt-2 text-sm text-slate-400 dark:text-slate-400 font-medium">{t('choose_photo')}</p></div>)}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('form_title')}</label>
                        <input type="text" value={newMemory.title} onChange={(e) => setNewMemory({...newMemory, title: e.target.value})} placeholder={t('form_title_placeholder')} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors text-base placeholder:font-normal"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('date_label')}</label>
                        <input type={dateInputType} value={dateInputType === 'date' ? newMemory.date : formatDateDisplay(newMemory.date)} onFocus={() => setDateInputType('date')} onBlur={() => setDateInputType('text')} onChange={(e) => setNewMemory({...newMemory, date: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors text-base"/>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('tags_label')}</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {newMemory.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-secondary/30 text-teal-700 dark:text-teal-300">
                                <Tag className="w-3 h-3 mr-1.5" />
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="ml-2 hover:text-rose-500"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                           type="text" 
                           value={tagInput} 
                           onChange={(e) => setTagInput(e.target.value)} 
                           onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                           placeholder={t('add_tag_placeholder')} 
                           className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors text-base placeholder:font-normal"
                        />
                        <button onClick={handleAddTag} className="bg-slate-100 dark:bg-slate-700 px-5 rounded-xl text-slate-600 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('add')}</button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('form_desc')}</label>
                    <textarea value={newMemory.desc} onChange={(e) => setNewMemory({...newMemory, desc: e.target.value})} placeholder={t('form_desc_placeholder')} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-32 resize-none transition-colors text-base placeholder:font-normal"/>
                </div>

                <div className="flex gap-3 pt-4">
                    {editingId && (<button onClick={handleCancelEdit} disabled={isSaving} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95 text-base">{t('cancel_btn')}</button>)}
                    <button onClick={handleSaveMemory} disabled={isSaving} className={`${editingId ? 'flex-[2]' : 'w-full'} bg-primary hover:bg-rose-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 text-base flex items-center justify-center`}>
                        {isSaving ? (
                             <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                {t('saving')}
                             </>
                        ) : editingId ? t('update_btn') : t('record_btn')}
                    </button>
                </div>
              </div>
            </div>
          </div>
        );

      case TabView.STORY:
        return (
          <div className="pb-32">
             <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('story_title')}</h1><p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('story_subtitle')}</p></div>
            <StoryGenerator language={language} defaultChildName={activeProfile.name} />
          </div>
        );

      case TabView.GROWTH:
        return (
          <div className="pb-32">
             <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('growth_title')}</h1><p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('growth_subtitle')}</p></div>
            <GrowthChart data={growthData} language={language} />
            <div className="mt-6 grid grid-cols-2 gap-4"><div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors"><span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_height')}</span><span className="text-2xl font-bold text-primary">{growthData.length > 0 ? growthData[growthData.length - 1]?.height : 0} cm</span></div><div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors"><span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_weight')}</span><span className="text-2xl font-bold text-accent">{growthData.length > 0 ? growthData[growthData.length - 1]?.weight : 0} kg</span></div></div>
          </div>
        );
        
      case TabView.GALLERY:
        return <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory}/>;
      
      case TabView.SETTINGS:
        // SUB-VIEW: GROWTH MANAGEMENT
        if (settingsView === 'GROWTH') {
           return (
              <div className="pb-32 animate-fade-in space-y-4">
                 <div className="flex items-center mb-6"><button onClick={() => setSettingsView('MAIN')} className="p-2 mr-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"><ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button><div><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_growth')}</h1><p className="text-slate-500 dark:text-slate-400 text-xs">{t('settings_subtitle')}</p></div></div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"><h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center">{isEditingGrowth ? <Pencil className="w-4 h-4 mr-2 text-teal-500"/> : <PlusCircle className="w-4 h-4 mr-2 text-teal-500"/>}{t('growth_input_title')}</h3><div className="grid grid-cols-3 gap-3 mb-4"><div><label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('month')}</label><div className="relative"><input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.month !== undefined ? newGrowth.month : ''} onChange={e => setNewGrowth({...newGrowth, month: Number(e.target.value)})}/><Calendar className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></div></div><div><label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('cm')}</label><div className="relative"><input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.height || ''} onChange={e => setNewGrowth({...newGrowth, height: Number(e.target.value)})}/><Ruler className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></div></div><div><label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('kg')}</label><div className="relative"><input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.weight || ''} onChange={e => setNewGrowth({...newGrowth, weight: Number(e.target.value)})}/><Scale className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></div></div></div><button onClick={handleAddGrowthRecord} disabled={isSaving} className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center ${isEditingGrowth ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-teal-500 hover:bg-teal-600'}`}> {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : (isEditingGrowth ? t('update_record') : t('add_record'))} </button></div> <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{growthData.map((data, index) => (<div key={index} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm border border-teal-100 dark:border-teal-800">{data.month}</div><div><p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase">{t('months_label')}</p><div className="flex gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"><span>{data.height} cm</span><span className="text-slate-300 dark:text-slate-600">|</span><span>{data.weight} kg</span></div></div></div><div className="flex gap-2"><button onClick={() => handleEditGrowthRecord(data)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg transition-colors"><Pencil className="w-4 h-4"/></button><button onClick={() => requestDeleteGrowth(data.id || '')} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div></div>))}</div></div><div className="mt-8"><p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('growth_data_note')}</p></div></div>
           );
        }
        
        // SUB-VIEW: MEMORIES MANAGEMENT (New Sub-View)
        if (settingsView === 'MEMORIES') {
            return (
                <div className="pb-32 animate-fade-in space-y-4">
                    <div className="flex items-center mb-6"><button onClick={() => setSettingsView('MAIN')} className="p-2 mr-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"><ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button><div><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_memories')}</h1><p className="text-slate-500 dark:text-slate-400 text-xs">{t('settings_subtitle_memories')}</p></div></div>
                    
                    {/* Filter and Search Section */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="relative flex-1 mr-4">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
                                <input 
                                    type="text" 
                                    value={settingsSearchQuery} 
                                    onChange={(e) => setSettingsSearchQuery(e.target.value)} 
                                    placeholder={t('search_memories_placeholder')} 
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                                />
                            </div>
                            <button onClick={() => setSettingsShowFilters(!settingsShowFilters)} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>

                        {settingsShowFilters && (
                            <div className="space-y-4 pt-2">
                                {/* Date Range Filters */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{t('start_date')}</label>
                                        <input 
                                            type="date" 
                                            value={settingsStartDate} 
                                            onChange={(e) => setSettingsStartDate(e.target.value)} 
                                            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{t('end_date')}</label>
                                        <input 
                                            type="date" 
                                            value={settingsEndDate} 
                                            onChange={(e) => setSettingsEndDate(e.target.value)} 
                                            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                
                                {/* Tag Filter */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{t('filter_by_tag')}</label>
                                    <select 
                                        value={settingsSelectedTag} 
                                        onChange={(e) => setSettingsSelectedTag(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                                    >
                                        <option value="">{t('all_tags')}</option>
                                        {allSettingsTags.map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        setSettingsSearchQuery('');
                                        setSettingsStartDate('');
                                        setSettingsEndDate('');
                                        setSettingsSelectedTag('');
                                        setSettingsShowFilters(false);
                                    }} 
                                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    {t('clear_filters')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Memories List */}
                    <div className="space-y-3">
                        {filteredSettingsMemories.length > 0 ? (
                            filteredSettingsMemories.map(memory => (
                                <div key={memory.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                                    <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                                        <img src={memory.imageUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 ring-1 ring-slate-100 dark:ring-slate-700" alt={memory.title} />
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{memory.title}</h4>
                                            <p className="text-slate-400 dark:text-slate-500 text-xs">{formatDateDisplay(memory.date)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button 
                                            onClick={() => handleEditStart(memory)} 
                                            className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => requestDeleteMemory(memory.id || '', e)} 
                                            className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">{t('no_memories_found')}</div>
                        )}
                    </div>
                </div>
            );
        }

        // SUB-VIEW: MAIN SETTINGS
        return (
          <div className="pb-32 animate-fade-in space-y-6">
            <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('settings_title')}</h1><p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('settings_subtitle')}</p></div>
            
            {/* Profile Management */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 transition-colors">
                 <div className="flex justify-between items-center"><h3 className="font-bold text-lg text-primary dark:text-primary-light flex items-center"><Baby className="w-5 h-5 mr-2" />{t('child_profile')}</h3><button onClick={handleUnlockClick} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">{isDetailsUnlocked ? <Unlock className="w-5 h-5 text-teal-500" /> : (passcode ? <Lock className="w-5 h-5 text-rose-500"/> : <Unlock className="w-5 h-5 text-slate-400"/>)}</button></div>
                 <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                     {profiles.map(p => (
                          <button key={p.id} onClick={() => selectProfileToEdit(p)} className={`p-1 rounded-full transition-all ring-offset-2 flex-shrink-0 ${activeProfileId === p.id ? 'ring-2 ring-primary' : 'ring-0'}`}>
                              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm relative group">
                                 <img src={p.profileImage || `https://ui-avatars.com/api/?name=${p.name}&background=random&color=fff`} alt={p.name} className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"/>
                                 {activeProfileId === p.id && (
                                     <div className="absolute inset-0 bg-primary/20 flex items-center justify-center text-white text-xs font-bold">
                                         <Check className="w-5 h-5 text-white drop-shadow-sm"/>
                                     </div>
                                 )}
                              </div>
                              <p className="text-center text-xs font-medium mt-1 text-slate-600 dark:text-slate-300 truncate w-16">{p.name}</p>
                          </button>
                     ))}
                     <button onClick={createNewProfile} className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:border-primary hover:text-primary transition-colors flex-shrink-0">
                        <Plus className="w-6 h-6" />
                     </button>
                 </div>
                 <div className="border-t border-slate-100 dark:border-slate-700 pt-5 space-y-4">
                     <div className="flex justify-center -mt-12 mb-4">
                        <div onClick={triggerProfileImageInput} className={`w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg relative group cursor-pointer ${!isDetailsUnlocked ? 'opacity-60' : 'hover:opacity-80 transition-opacity'}`}>
                           <img src={editingProfile.profileImage || `https://ui-avatars.com/api/?name=${editingProfile.name}&background=random&color=fff`} alt="Profile" className="w-full h-full object-cover"/>
                           {isDetailsUnlocked && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                <Camera className="w-6 h-6" />
                              </div>
                           )}
                           <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={!isDetailsUnlocked} />
                        </div>
                     </div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('child_name_label')}</label>
                     <input type="text" value={editingProfile.name} onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})} placeholder={t('child_name_placeholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors" disabled={!isDetailsUnlocked}/>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('dob_label')}</label>
                            <input type="date" value={editingProfile.dob} onChange={(e) => setEditingProfile({...editingProfile, dob: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors" disabled={!isDetailsUnlocked}/>
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t('gender_label')}</label>
                            <select value={editingProfile.gender} onChange={(e) => setEditingProfile({...editingProfile, gender: e.target.value as 'boy' | 'girl'})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors" disabled={!isDetailsUnlocked}>
                                <option value="boy">{t('boy')}</option>
                                <option value="girl">{t('girl')}</option>
                            </select>
                         </div>
                     </div>
                     <div className="flex gap-4 pt-2">
                        {editingProfile.id && (
                           <button onClick={() => requestDeleteProfile(editingProfile.id || '')} disabled={!isDetailsUnlocked || isSaving} className="flex-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold py-3 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors active:scale-95 text-sm flex items-center justify-center">
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('delete_profile')}
                           </button>
                        )}
                        <button onClick={handleSaveProfile} disabled={!isDetailsUnlocked || isSaving || !editingProfile.name.trim()} className={`${editingProfile.id ? 'flex-[2]' : 'w-full'} bg-primary hover:bg-rose-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 text-sm flex items-center justify-center`}>
                           {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                           {t('save_profile')}
                        </button>
                     </div>
                 </div>
            </div>

            {/* Application Settings */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 transition-colors">
                <h3 className="font-bold text-lg text-teal-500 dark:text-teal-400 flex items-center"><Settings className="w-5 h-5 mr-2" />{t('app_settings')}</h3>
                
                {/* Language Switch */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{t('language_label')}</span>
                    <button onClick={toggleLanguage} className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <span className={`${language === 'mm' ? 'text-primary dark:text-primary-light' : 'text-slate-400'}`}>{t('lang_mm')}</span>
                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <span className={`${language === 'en' ? 'text-primary dark:text-primary-light' : 'text-slate-400'}`}>{t('lang_en')}</span>
                    </button>
                </div>
                
                {/* Theme Switch */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{t('theme_label')}</span>
                    <button onClick={toggleTheme} className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary dark:text-primary-light' : 'text-slate-400'}`} />
                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary dark:text-primary-light' : 'text-slate-400'}`} />
                    </button>
                </div>
                
                {/* Manage Growth Data Button */}
                <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <button onClick={() => setSettingsView('GROWTH')} className="w-full flex justify-between items-center text-slate-700 dark:text-slate-200 hover:text-primary transition-colors p-2 -mx-2 rounded-lg">
                        <span className="font-medium flex items-center"><Activity className="w-4 h-4 mr-2 text-teal-500" />{t('manage_growth_data')}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                
                 {/* Manage Memories Data Button */}
                 <div className="py-2">
                    <button onClick={() => setSettingsView('MEMORIES')} className="w-full flex justify-between items-center text-slate-700 dark:text-slate-200 hover:text-primary transition-colors p-2 -mx-2 rounded-lg">
                        <span className="font-medium flex items-center"><ImageIcon className="w-4 h-4 mr-2 text-indigo-500" />{t('manage_memories_data')}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 transition-colors">
                <h3 className="font-bold text-lg text-indigo-500 dark:text-indigo-400 flex items-center"><ShieldCheck className="w-5 h-5 mr-2" />{t('security')}</h3>
                
                {/* Passcode Setting */}
                <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    {passcode ? (
                        <div className="flex flex-col space-y-2">
                            <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center"><KeyRound className="w-4 h-4 mr-2 text-indigo-400"/>{t('passcode_enabled')}</span>
                            <div className="flex gap-2">
                                <button onClick={openChangePasscode} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('change_passcode')}</button>
                                <button onClick={openRemovePasscode} className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">{t('remove_passcode')}</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={openPasscodeSetup} className="w-full flex justify-between items-center text-slate-700 dark:text-slate-200 hover:text-indigo-500 transition-colors p-2 -mx-2 rounded-lg">
                            <span className="font-medium flex items-center"><KeyRound className="w-4 h-4 mr-2 text-indigo-400"/>{t('set_passcode')}</span>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                    )}
                </div>
                
                {/* Sync Status */}
                {session && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center"><Cloud className="w-4 h-4 mr-2 text-sky-500"/>{t('sync_status')}</span>
                        {isOnline ? (
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-full">{t('online')}</span>
                                <button onClick={handleManualSync} disabled={isSyncing} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        ) : (
                             <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-full flex items-center"><CloudOff className="w-3 h-3 mr-1" />{t('offline')}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Account Management */}
            {session ? (
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 transition-colors">
                    <h3 className="font-bold text-lg text-sky-500 dark:text-sky-400 flex items-center"><User className="w-5 h-5 mr-2" />{t('account')}</h3>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                         <span className="font-medium text-slate-700 dark:text-slate-200">{t('logged_in_as')}</span>
                         <span className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate max-w-[60%]">{session.user.email}</span>
                    </div>
                    <button onClick={handleSignOut} disabled={isLoggingOut} className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center">
                        {isLoggingOut ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('signing_out')}
                            </>
                        ) : (
                            <>
                                <LogOut className="w-4 h-4 mr-2" />
                                {t('sign_out')}
                            </>
                        )}
                    </button>
                 </div>
            ) : isGuest ? (
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 transition-colors">
                    <h3 className="font-bold text-lg text-sky-500 dark:text-sky-400 flex items-center"><User className="w-5 h-5 mr-2" />{t('account')}</h3>
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center"><UserPlus className="w-4 h-4 mr-2 text-sky-400"/>{t('guest_mode_active')}</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('guest_mode_warning')}</p>
                    </div>
                    <button onClick={handleSignOut} disabled={isLoggingOut} className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-lg shadow-sky-500/30 transition-all active:scale-95 flex items-center justify-center">
                        {isLoggingOut ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('exiting_guest')}
                            </>
                        ) : (
                            <>
                                <LogOut className="w-4 h-4 mr-2" />
                                {t('exit_guest_mode')}
                            </>
                        )}
                    </button>
                 </div>
            ) : null}
          </div>
        );
      
      default:
        return <div className="p-4 text-center text-slate-500">{t('content_not_found')}</div>;
    }
  };

  // Confirmation Modal Component
  const DeleteConfirmationModal = () => {
    if (!itemToDelete) return null;
    
    let title, message;
    
    switch (itemToDelete.type) {
      case 'MEMORY':
        const memory = memories.find(m => m.id === itemToDelete.id);
        title = t('delete_memory_title');
        message = t('delete_memory_message');
        break;
      case 'GROWTH':
        title = t('delete_growth_title');
        message = t('delete_growth_message');
        break;
      case 'PROFILE':
        const profile = profiles.find(p => p.id === itemToDelete.id);
        title = t('delete_profile_title');
        message = t('delete_profile_message');
        break;
      default:
        title = t('confirm_delete');
        message = t('are_you_sure');
    }

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl w-full max-w-sm transform transition-all duration-300 scale-100 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={() => setItemToDelete(null)} disabled={isSaving} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95 text-sm">{t('cancel_btn')}</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 text-sm flex items-center justify-center">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : t('delete_btn')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Passcode Modal Component
  const PasscodeModal = () => {
    if (!showPasscodeModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl w-full max-w-sm transform transition-all duration-300 scale-100 border border-slate-100 dark:border-slate-700">
          <div className="flex justify-end mb-2">
             <button onClick={() => setShowPasscodeModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">{getModalTitle()}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{t('passcode_prompt')}</p>
          
          <div className="flex justify-center space-x-3 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${passcodeError ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'}`}>
                {passcodeInput.length > i ? '*' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => passcodeInput.length < 4 && setPasscodeInput(prev => prev + num.toString())} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95">
                {num}
              </button>
            ))}
            <button onClick={() => setPasscodeInput(prev => prev.slice(0, -1))} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95">
              <ArrowLeft className="w-6 h-6 mx-auto" />
            </button>
            <button onClick={() => passcodeInput.length < 4 && setPasscodeInput(prev => prev + '0')} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95">
              0
            </button>
            <button onClick={handlePasscodeSubmit} disabled={passcodeInput.length !== 4} className={`p-4 rounded-xl text-white text-2xl font-bold transition-all active:scale-95 ${passcodeInput.length === 4 ? 'bg-primary hover:bg-rose-400' : 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed'}`}>
              <Check className="w-6 h-6 mx-auto" />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Toast Notification Component
  const ToastNotification = () => {
    if (!showToast) return null;
    
    return (
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-lg z-50 flex items-center space-x-3 transition-all duration-300 max-w-sm w-[90%] ${showToast.type === 'success' ? 'bg-teal-500 text-white' : 'bg-rose-500 text-white'} animate-slide-down`}>
        {showToast.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
        <span className="text-sm font-medium">{showToast.message}</span>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 w-full md:max-w-3xl lg:max-w-5xl mx-auto relative shadow-2xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-[48px] overflow-hidden font-sans transition-colors duration-300">
      
      {/* Main Content Area */}
      <main className="px-5 pt-8 min-h-screen box-border">
        {renderContent()}
        
        {/* Floating Action Button (for ADD_MEMORY on mobile) */}
        {activeTab !== TabView.ADD_MEMORY && (
           <button 
               onClick={() => setActiveTab(TabView.ADD_MEMORY)}
               className="fixed bottom-20 right-6 p-4 rounded-full bg-primary text-white shadow-xl shadow-primary/40 z-40 md:hidden active:scale-95 transition-transform"
           >
               <Plus className="w-6 h-6" />
           </button>
        )}
      </main>

      {/* Full Screen Logout Loading Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[200] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center flex-col animate-fade-in">
           <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
           </div>
           <p className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">{t('signing_out')}</p>
        </div>
      )}

      {/* Modals and Notifications */}
      <MemoryDetailModal 
        memory={selectedMemory} 
        language={language}
        onClose={() => setSelectedMemory(null)} 
        onEdit={() => { if (selectedMemory) { handleEditStart(selectedMemory); } }}
        onDelete={() => { if (selectedMemory) { requestDeleteMemory(selectedMemory.id || ''); } }}
      />
      <DeleteConfirmationModal />
      <PasscodeModal />
      <ToastNotification />

      {/* Expanding Pill Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 flex items-center gap-1 z-50 max-w-sm w-[90%] mx-auto transition-colors duration-300">
        {tabs.filter(tab => tab.id !== TabView.STORY).map((tab) => {
           const isActive = activeTab === tab.id;
           // Hide PlusCircle on mobile when it's not active, as there's a FAB
           if(tab.id === TabView.ADD_MEMORY && !isActive && window.innerWidth < 768) return null; 
           
           return (
             <button 
                 key={tab.id} 
                 onClick={() => { 
                     setActiveTab(tab.id); 
                     if (tab.id === TabView.SETTINGS) setSettingsView('MAIN'); 
                 }} 
                 className={`relative flex items-center justify-center gap-2 h-12 rounded-full transition-all duration-500 ease-spring overflow-hidden ${isActive ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-md' : 'flex-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500'}`}
             >
                 <tab.icon 
                     className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} 
                     strokeWidth={isActive ? 2.5 : 2}
                 />
                 {isActive && (
                    <span className="text-sm font-bold truncate transition-opacity duration-300 opacity-100 animate-fade-in pr-2">
                        {t(tab.label)}
                    </span>
                 )}
             </button>
           );
        })}
      </nav>
      
    </div>
  );
}

export default App;
