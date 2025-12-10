import React, { useState, useEffect, useRef } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Camera, Image as ImageIcon, Baby, ChevronRight, Sparkles, Plus, Moon, Sun, Pencil, X, Settings, Trash2, ArrowLeft, Ruler, Scale, Calendar, Lock, Unlock, ShieldCheck, KeyRound, Cloud, CloudOff, RefreshCw, AlertTriangle, Save, UserPlus, ChevronDown } from 'lucide-react';
import { MemoryCard } from './components/MemoryCard';
import { GrowthChart } from './components/GrowthChart';
import { StoryGenerator } from './components/StoryGenerator';
import { GalleryGrid } from './components/GalleryGrid';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData } from './types';
import { getTranslation } from './translations';
import { initDB, DataService, syncData } from './db';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [settingsView, setSettingsView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES'>('MAIN');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null); // New ref for profile image
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Security State
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isDetailsUnlocked, setIsDetailsUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'MEMORY' | 'GROWTH' | 'PROFILE', id: string } | null>(null);

  // Application Data State
  const [memories, setMemories] = useState<Memory[]>([]);
  
  // Profile Management State
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); // Used to track which child is "Current"
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({ id: '', name: '', dob: '', gender: 'boy' }); // For the form input

  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Input Focus State for Date Formatting Hack
  const [dateInputType, setDateInputType] = useState('text');
  const [dobInputType, setDobInputType] = useState('text');

  // State for new growth record input in Settings
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [isEditingGrowth, setIsEditingGrowth] = useState(false);

  // Helper to get today's date in YYYY-MM-DD using Local Time (not UTC)
  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to format YYYY-MM-DD to DD/MM/YYYY for display
  const formatDateDisplay = (isoDate: string | undefined) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Updated state to include imageUrl
  const [newMemory, setNewMemory] = useState<{title: string; desc: string; date: string; imageUrl?: string}>({ 
    title: '', 
    desc: '', 
    date: getTodayLocal() 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Persistence for Language (Keep in localStorage for app preference)
  const [language, setLanguage] = useState<Language>(() => {
     return (localStorage.getItem('language') as Language) || 'mm';
  });

  // Persistence for Theme (Keep in localStorage)
  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = (key: any) => getTranslation(language, key);

  // Computed Active Profile for display
  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  // Fetch data specific to the current child
  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const growth = await DataService.getGrowth(childId);
      setMemories(mems);
      setGrowthData(growth);
  };

  const refreshData = async () => {
      const fetchedProfiles = await DataService.getProfiles();
      setProfiles(fetchedProfiles);

      let targetId = activeProfileId;

      // Determine active profile if not set or invalid
      if (fetchedProfiles.length > 0) {
          if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) {
             targetId = fetchedProfiles[0].id || '';
             setActiveProfileId(targetId);
             setEditingProfile(fetchedProfiles[0]);
          } else {
             // Refresh editing profile if it matches active
             const active = fetchedProfiles.find(p => p.id === targetId);
             if (active) setEditingProfile(active);
          }
      } else {
        // No profiles exist (edge case)
        setActiveProfileId('');
        setMemories([]);
        setGrowthData([]);
        return;
      }

      // Load data for the determined ID
      if (targetId) {
          await loadChildData(targetId);
      }
  };

  // Initialize DB and Load Data
  useEffect(() => {
    const loadData = async () => {
      await initDB();
      await refreshData();
      setIsLoading(false);
      // Try initial sync silently
      if (navigator.onLine) {
         syncData().then(() => refreshData());
      }
    };
    loadData();

    // Setup Online/Offline listeners
    const handleOnline = async () => {
      setIsOnline(true);
      console.log("Online: Syncing...");
      await syncData();
      await refreshData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const handleManualSync = async () => {
      if (!isOnline) return;
      setIsSyncing(true);
      await syncData();
      await refreshData();
      setIsSyncing(false);
  };

  // Handle Profile Save
  const handleSaveProfile = async () => {
      // Validate
      if (!editingProfile.name.trim()) return;

      const profileToSave = {
         ...editingProfile,
         id: editingProfile.id || Date.now().toString()
      };

      await DataService.saveProfile(profileToSave);
      
      // Update local UI
      await refreshData();
      setActiveProfileId(profileToSave.id || '');
      // If we just created a new one, load its empty data
      if (profileToSave.id !== activeProfileId) {
          loadChildData(profileToSave.id || '');
      }
      
      console.log("Profile Saved");
  };

  const createNewProfile = () => {
      setEditingProfile({
         id: '',
         name: '',
         dob: '',
         gender: 'boy'
      });
      // Lock details when creating new to force unlock (security)
      setIsDetailsUnlocked(false);
  };

  const selectProfileToEdit = (profile: ChildProfile) => {
      setEditingProfile(profile);
      setActiveProfileId(profile.id || '');
      loadChildData(profile.id || '');
      // When switching, re-lock sensitive info if previously unlocked
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

  const openPasscodeSetup = () => {
    setPasscodeMode('SETUP');
    setPasscodeInput('');
    setPasscodeError(false);
    setShowPasscodeModal(true);
  };

  const openChangePasscode = () => {
    setPasscodeMode('CHANGE_VERIFY');
    setPasscodeInput('');
    setPasscodeError(false);
    setShowPasscodeModal(true);
  };

  const openRemovePasscode = () => {
    setPasscodeMode('REMOVE');
    setPasscodeInput('');
    setPasscodeError(false);
    setShowPasscodeModal(true);
  };

  const handlePasscodeSubmit = () => {
    // Strict 4 digits check
    if (passcodeInput.length !== 4) {
       setPasscodeError(true);
       setTimeout(() => setPasscodeError(false), 500);
       return;
    }

    if (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW') {
          localStorage.setItem('app_passcode', passcodeInput);
          setPasscode(passcodeInput);
          setIsDetailsUnlocked(true);
          setShowPasscodeModal(false);
          setPasscodeInput('');
       return;
    }

    if (passcodeInput === passcode) {
       if (passcodeMode === 'UNLOCK') {
          setIsDetailsUnlocked(true);
          setShowPasscodeModal(false);
       } else if (passcodeMode === 'CHANGE_VERIFY') {
          setPasscodeMode('CHANGE_NEW');
          setPasscodeInput('');
       } else if (passcodeMode === 'REMOVE') {
          localStorage.removeItem('app_passcode');
          setPasscode(null);
          setIsDetailsUnlocked(true); 
          setShowPasscodeModal(false);
       }
    } else {
       setPasscodeError(true);
       setTimeout(() => setPasscodeError(false), 500);
    }
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

  // dd/mm/yyyy format for Header
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const handleEditStart = (memory: Memory) => {
    setNewMemory({ 
        title: memory.title, 
        desc: memory.description, 
        imageUrl: memory.imageUrl,
        date: memory.date 
    });
    setEditingId(memory.id);
    setActiveTab(TabView.ADD_MEMORY);
    setSettingsView('MAIN'); 
    setSelectedMemory(null); // Close modal if open
  };

  const handleCancelEdit = () => {
    setNewMemory({ title: '', desc: '', date: getTodayLocal() }); 
    setEditingId(null);
    setActiveTab(TabView.HOME);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMemory(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  // New handler for Profile Image
  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingProfile(prev => ({ ...prev, profileImage: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const triggerProfileImageInput = () => {
      if(isDetailsUnlocked) {
        profileImageInputRef.current?.click();
      }
  };

  // Trigger custom delete modal
  const requestDeleteMemory = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent modal or other clicks
    setItemToDelete({ type: 'MEMORY', id });
  };

  const requestDeleteGrowth = (id: string) => {
    setItemToDelete({ type: 'GROWTH', id });
  };

  const requestDeleteProfile = (id: string) => {
      // Prevent deleting the last profile if it's the only one (optional safety, but usually good)
      if (profiles.length <= 1 && id === profiles[0].id) {
          alert("Cannot delete the only profile.");
          return;
      }
      setItemToDelete({ type: 'PROFILE', id });
  };

  const confirmDelete = async () => {
     if (!itemToDelete) return;

     if (itemToDelete.type === 'MEMORY') {
        await DataService.deleteMemory(itemToDelete.id);
        if (selectedMemory && selectedMemory.id === itemToDelete.id) {
           setSelectedMemory(null);
        }
     } else if (itemToDelete.type === 'GROWTH') {
        await DataService.deleteGrowth(itemToDelete.id);
     } else if (itemToDelete.type === 'PROFILE') {
        await DataService.deleteProfile(itemToDelete.id);
        // After delete, refresh will automatically switch to another profile or create default
     }

     await refreshData();
     setItemToDelete(null);
  };

  const handleSaveMemory = async () => {
    if (!newMemory.title) return;
    // Require active profile
    if (!activeProfileId) return; 

    const finalImageUrl = newMemory.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`;

    if (editingId) {
      // Update existing
      const existing = memories.find(m => m.id === editingId);
      if (existing) {
          const updated: Memory = { 
            ...existing, 
            childId: existing.childId, // Keep original childId
            title: newMemory.title, 
            description: newMemory.desc, 
            imageUrl: finalImageUrl,
            date: newMemory.date 
          };
          await DataService.addMemory(updated); 
      }
    } else {
      // Create new
      const memory: Memory = {
        id: Date.now().toString(),
        childId: activeProfileId, // Link to current child
        title: newMemory.title, 
        description: newMemory.desc, 
        date: newMemory.date, 
        imageUrl: finalImageUrl,
        tags: ['New Memory'],
        synced: 0
      };
      await DataService.addMemory(memory);
    }

    // Refresh UI
    await loadChildData(activeProfileId);

    // Reset state
    setNewMemory({ title: '', desc: '', date: getTodayLocal() });
    setEditingId(null);
    setActiveTab(TabView.HOME);
  };

  const handleAddGrowthRecord = async () => {
    // Check if month is defined (including 0) and height/weight are present
    if (newGrowth.month !== undefined && newGrowth.height && newGrowth.weight && activeProfileId) {
      let updatedData: GrowthData = {
          id: newGrowth.id || Date.now().toString(),
          childId: activeProfileId, // Link to current child
          month: Number(newGrowth.month),
          height: Number(newGrowth.height),
          weight: Number(newGrowth.weight),
          synced: 0
      };

      await DataService.saveGrowth(updatedData);
      await loadChildData(activeProfileId);
      
      setNewGrowth({ month: undefined, height: undefined, weight: undefined });
      setIsEditingGrowth(false);
    }
  };

  const handleEditGrowthRecord = (data: GrowthData) => {
      setNewGrowth(data);
      setIsEditingGrowth(true);
  };

  // Logic for Expandable Pill Nav Bar
  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

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
                      {isOnline ? (
                         <button onClick={handleManualSync} className="text-primary hover:text-primary/80 transition-colors">
                             <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                         </button>
                      ) : (
                         <CloudOff className="w-4 h-4 text-slate-400" />
                      )}
                  </p>
               </div>
               
               {/* Tiny Profile Pic on Home */}
               {activeProfile.profileImage && (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                      <img src={activeProfile.profileImage} alt="Profile" className="w-full h-full object-cover"/>
                  </div>
               )}
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Main Feature: Latest Memory (Span 2 columns) */}
              {latestMemory ? (
                  <div 
                    className="col-span-2 relative h-64 rounded-[32px] overflow-hidden shadow-sm group cursor-pointer border border-transparent dark:border-slate-700"
                    onClick={() => setSelectedMemory(latestMemory)}
                  >
                    <img 
                      src={latestMemory?.imageUrl} 
                      alt="Latest" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                      <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/20">
                        {t('latest_arrival')}
                      </span>
                      <h3 className="text-white text-xl font-bold leading-tight drop-shadow-sm">{latestMemory?.title}</h3>
                      <p className="text-white/80 text-sm mt-1 line-clamp-1 drop-shadow-sm">{latestMemory?.description}</p>
                    </div>
                  </div>
              ) : (
                  <div className="col-span-2 relative h-64 rounded-[32px] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                      {t('no_photos')}
                  </div>
              )}

              {/* Story Widget (Span 1) */}
              <div 
                onClick={() => setActiveTab(TabView.STORY)}
                className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-5 text-white flex flex-col justify-between h-40 shadow-sm relative overflow-hidden cursor-pointer active:scale-95 transition-transform border border-transparent dark:border-slate-700"
              >
                <Sparkles className="w-6 h-6 text-yellow-300 opacity-80" />
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <BookOpen className="w-24 h-24" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{t('create_story')}</h3>
                  <div className="flex items-center mt-2 text-xs font-medium text-white/80">
                    {t('start')} <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>

              {/* Growth Widget (Span 1) */}
              <div 
                onClick={() => setActiveTab(TabView.GROWTH)}
                className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-5 flex flex-col justify-between h-40 shadow-sm cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-start">
                  <Activity className="w-6 h-6 text-teal-500" />
                  <span className="text-xs font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-full">+2cm</span>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t('current_height')}</p>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl">
                    {growthData.length > 0 ? growthData[growthData.length - 1]?.height : 0} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">cm</span>
                  </h3>
                </div>
              </div>

              {/* Recent Memories List (Span 2) */}
              <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">{t('memories')}</h3>
                  <button onClick={() => setActiveTab(TabView.GALLERY)} className="text-primary text-xs font-bold">{t('see_all')}</button>
                </div>
                <div className="space-y-4">
                  {memories.slice(1, 3).map(mem => (
                    <div 
                      key={mem.id} 
                      onClick={() => setSelectedMemory(mem)}
                      className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-xl transition-colors -mx-2"
                    >
                      <div className="flex items-center space-x-4">
                        <img src={mem.imageUrl} className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 dark:ring-slate-700" alt={mem.title} />
                        <div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{mem.title}</h4>
                          <p className="text-slate-400 dark:text-slate-500 text-xs">{formatDateDisplay(mem.date)}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        );

      case TabView.ADD_MEMORY:
        return (
          <div className="pb-32 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">
                {editingId ? t('edit_memory_title') : t('add_memory_title')}
              </h2>
              {editingId && (
                <button 
                  onClick={handleCancelEdit}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                >
                  {t('cancel_btn')}
                </button>
              )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
              <div 
                onClick={triggerFileInput}
                className="relative w-full h-48 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group overflow-hidden"
              >
                {newMemory.imageUrl ? (
                  <>
                    <img 
                      src={newMemory.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
                         <Camera className="w-6 h-6" />
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-500 group-hover:text-primary transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">{t('choose_photo')}</p>
                  </div>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden" 
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('form_title')}</label>
                  <input 
                    type="text" 
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({...newMemory, title: e.target.value})}
                    placeholder={t('form_title_placeholder')} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('date_label')}</label>
                  <input 
                    type={dateInputType}
                    value={dateInputType === 'date' ? newMemory.date : formatDateDisplay(newMemory.date)}
                    onFocus={() => setDateInputType('date')}
                    onBlur={() => setDateInputType('text')}
                    onChange={(e) => setNewMemory({...newMemory, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('form_desc')}</label>
                  <textarea 
                    value={newMemory.desc}
                    onChange={(e) => setNewMemory({...newMemory, desc: e.target.value})}
                    placeholder={t('form_desc_placeholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-32 resize-none transition-colors"
                  />
                </div>
                
                <div className="flex gap-3">
                  {editingId && (
                    <button 
                      onClick={handleCancelEdit}
                      className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95"
                    >
                      {t('cancel_btn')}
                    </button>
                  )}
                  <button 
                    onClick={handleSaveMemory}
                    className={`
                      ${editingId ? 'flex-[2]' : 'w-full'}
                      bg-primary hover:bg-rose-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95
                    `}
                  >
                    {editingId ? t('update_btn') : t('record_btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case TabView.STORY:
        return (
          <div className="pb-32">
             <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('story_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('story_subtitle')}</p>
             </div>
            <StoryGenerator language={language} defaultChildName={activeProfile.name} />
          </div>
        );

      case TabView.GROWTH:
        return (
          <div className="pb-32">
             <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('growth_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('growth_subtitle')}</p>
             </div>
            <GrowthChart data={growthData} language={language} />
            
            <div className="mt-6 grid grid-cols-2 gap-4">
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_height')}</span>
                  <span className="text-2xl font-bold text-primary">
                    {growthData.length > 0 ? growthData[growthData.length - 1]?.height : 0} cm
                  </span>
               </div>
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_weight')}</span>
                  <span className="text-2xl font-bold text-accent">
                    {growthData.length > 0 ? growthData[growthData.length - 1]?.weight : 0} kg
                  </span>
               </div>
            </div>
          </div>
        );
        
      case TabView.GALLERY:
        return (
          <GalleryGrid 
            memories={memories} 
            language={language} 
            onMemoryClick={setSelectedMemory}
          />
        );
      
      case TabView.SETTINGS:
        // SUB-VIEW: GROWTH MANAGEMENT
        if (settingsView === 'GROWTH') {
           return (
              <div className="pb-32 animate-fade-in space-y-4">
                 <div className="flex items-center mb-6">
                    <button onClick={() => setSettingsView('MAIN')} className="p-2 mr-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                       <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                       <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_growth')}</h1>
                       <p className="text-slate-500 dark:text-slate-400 text-xs">{t('settings_subtitle')}</p>
                    </div>
                 </div>

                 {/* Add/Edit Form */}
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center">
                       {isEditingGrowth ? <Pencil className="w-4 h-4 mr-2 text-teal-500"/> : <PlusCircle className="w-4 h-4 mr-2 text-teal-500"/>}
                       {t('growth_input_title')}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                       <div>
                          <label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('month')}</label>
                          <div className="relative">
                            <input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.month !== undefined ? newGrowth.month : ''} onChange={e => setNewGrowth({...newGrowth, month: Number(e.target.value)})}/>
                             <Calendar className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('cm')}</label>
                          <div className="relative">
                             <input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.height || ''} onChange={e => setNewGrowth({...newGrowth, height: Number(e.target.value)})}/>
                             <Ruler className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('kg')}</label>
                          <div className="relative">
                             <input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.weight || ''} onChange={e => setNewGrowth({...newGrowth, weight: Number(e.target.value)})}/>
                             <Scale className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                       </div>
                    </div>
                    <button 
                       onClick={handleAddGrowthRecord} 
                       className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center
                          ${isEditingGrowth ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-teal-500 hover:bg-teal-600'}
                       `}
                    >
                       {isEditingGrowth ? t('update_record') : t('add_record')}
                    </button>
                 </div>

                 {/* List */}
                 <div className="space-y-3">
                    {growthData.map((data, index) => (
                       <div key={index} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm border border-teal-100 dark:border-teal-800">
                                {data.month}
                             </div>
                             <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase">{t('months_label')}</p>
                                <div className="flex gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                   <span>{data.height} cm</span>
                                   <span className="text-slate-300 dark:text-slate-600">|</span>
                                   <span>{data.weight} kg</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleEditGrowthRecord(data)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg transition-colors"><Pencil className="w-4 h-4"/></button>
                             <button onClick={() => requestDeleteGrowth(data.id || '')} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )
        }

        // SUB-VIEW: MEMORIES MANAGEMENT
        if (settingsView === 'MEMORIES') {
           return (
              <div className="pb-32 animate-fade-in space-y-4">
                 <div className="flex items-center mb-6">
                    <button onClick={() => setSettingsView('MAIN')} className="p-2 mr-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                       <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                       <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_memories')}</h1>
                       <p className="text-slate-500 dark:text-slate-400 text-xs">{t('gallery_subtitle')}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                   {memories.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                         <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                         <p className="text-sm">{t('no_photos')}</p>
                      </div>
                   ) : (
                      memories.map(mem => (
                        <div key={mem.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group transition-all hover:shadow-md">
                           <div className="flex items-center gap-3 overflow-hidden">
                              <img src={mem.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-slate-200" alt="" />
                              <div className="min-w-0">
                                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{mem.title}</p>
                                 <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateDisplay(mem.date)}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleEditStart(mem); }} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"><Pencil className="w-4 h-4"/></button>
                              <button onClick={(e) => requestDeleteMemory(mem.id, e)} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"><Trash2 className="w-4 h-4"/></button>
                           </div>
                        </div>
                      ))
                   )}
                </div>
              </div>
           )
        }

        // MAIN SETTINGS VIEW
        return (
          <div className="pb-32 animate-fade-in space-y-6">
             {/* New Settings Header: Current Profile Info */}
             <div className="flex flex-col items-center justify-center pt-4 pb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg mb-3">
                   {activeProfile.profileImage ? (
                      <img src={activeProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                         <Baby className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      </div>
                   )}
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                   {activeProfile.name || 'New Profile'}
                </h1>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full mt-1">
                   {t('about_child')}
                </p>
             </div>

             {/* 1. Profile Card with Multi-User Support */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 relative">
                
                {/* Profile Selector */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar">
                   {profiles.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => selectProfileToEdit(p)}
                        className={`flex flex-col items-center flex-shrink-0 transition-all ${editingProfile.id === p.id ? 'opacity-100 scale-105' : 'opacity-60 scale-100 hover:opacity-100'}`}
                      >
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 border-2 overflow-hidden ${editingProfile.id === p.id ? 'border-primary bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                            {p.profileImage ? (
                                <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover"/>
                            ) : (
                                <Baby className={`w-6 h-6 ${editingProfile.id === p.id ? 'text-primary' : 'text-slate-400'}`} />
                            )}
                         </div>
                         <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate w-16 text-center">{p.name || 'New'}</span>
                         {activeProfileId === p.id && <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1"></span>}
                      </button>
                   ))}
                   <button 
                      onClick={createNewProfile}
                      className="flex flex-col items-center flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                   >
                       <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-1 text-slate-400 bg-slate-50/50">
                          <UserPlus className="w-5 h-5" />
                       </div>
                       <span className="text-[10px] font-bold text-slate-500">{t('nav_create')}</span>
                   </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4 mt-2">
                  {!isDetailsUnlocked ? (
                    // LOCKED STATE: Sleek Compact Button
                    <button 
                        onClick={handleUnlockClick} 
                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover:bg-primary group-hover:text-white transition-colors">
                              <Lock className="w-5 h-5" />
                           </div>
                           <div className="text-left">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('private_info')}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('tap_to_unlock')}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    </button>
                  ) : (
                    // UNLOCKED STATE: Show All Inputs
                    <div className="space-y-4 animate-fade-in mt-2 relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('edit')}</span>
                            <button onClick={() => setIsDetailsUnlocked(false)} className="text-xs font-bold text-primary flex items-center bg-primary/10 px-2 py-1 rounded-lg">
                                <Lock className="w-3 h-3 mr-1" />
                                {t('hide_details')}
                            </button>
                        </div>
                        
                        {/* Profile Picture Upload */}
                        <div className="flex justify-center mb-2">
                             <div 
                               onClick={triggerProfileImageInput}
                               className={`relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-700/50 transition-all cursor-pointer hover:border-primary`}
                             >
                                {editingProfile.profileImage ? (
                                    <img src={editingProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-slate-300" />
                                )}
                                
                                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{t('choose_photo')}</span>
                                </div>
                             </div>
                             <input 
                               ref={profileImageInputRef}
                               type="file"
                               accept="image/*"
                               onChange={handleProfileImageUpload}
                               className="hidden"
                             />
                        </div>

                        {/* Name Input */}
                        <div className="relative">
                             <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('child_name')}</label>
                             <input 
                               type="text" 
                               value={editingProfile.name}
                               onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                               className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium text-sm"
                               placeholder="Baby Name"
                             />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative">
                             <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('child_dob')}</label>
                             <input 
                               type={dobInputType}
                               value={dobInputType === 'date' ? editingProfile.dob : formatDateDisplay(editingProfile.dob)}
                               onFocus={() => setDobInputType('date')}
                               onBlur={() => setDobInputType('text')}
                               onChange={(e) => setEditingProfile({...editingProfile, dob: e.target.value})}
                               className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium text-sm"
                             />
                          </div>
                          <div className="relative">
                             <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('child_birth_time')}</label>
                             <input 
                               type="time" 
                               value={editingProfile.birthTime || ''}
                               onChange={(e) => setEditingProfile({...editingProfile, birthTime: e.target.value})}
                               className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium text-sm"
                             />
                          </div>
                        </div>

                        <div className="relative">
                           <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('hospital_name')}</label>
                           <input 
                             type="text" 
                             value={editingProfile.hospitalName || ''}
                             onChange={(e) => setEditingProfile({...editingProfile, hospitalName: e.target.value})}
                             className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium text-sm"
                             placeholder={t('hospital_placeholder')}
                           />
                        </div>

                        <div className="relative">
                           <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('birth_location')}</label>
                           <input 
                             type="text" 
                             value={editingProfile.birthLocation || ''}
                             onChange={(e) => setEditingProfile({...editingProfile, birthLocation: e.target.value})}
                             className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium text-sm"
                             placeholder={t('location_placeholder')}
                           />
                        </div>

                         <div className="flex gap-3 mt-2">
                             {editingProfile.id && (
                                <button 
                                  onClick={() => requestDeleteProfile(editingProfile.id || '')}
                                  className="flex-1 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-bold text-sm transition-all"
                                >
                                  {t('delete')}
                                </button>
                             )}
                             <button 
                              onClick={handleSaveProfile}
                              className="flex-[2] py-3 rounded-xl bg-primary hover:bg-rose-400 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center"
                             >
                               <Save className="w-4 h-4 mr-2" />
                               {t('save_changes')}
                             </button>
                         </div>
                    </div>
                  )}
                </div>
             </div>

             {/* 2. Security Card */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center">
                   <ShieldCheck className="w-4 h-4 mr-2 text-slate-400" />
                   <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('security_title')}</h3>
                </div>
                <div className="p-2">
                   {passcode ? (
                      <>
                        <button 
                           onClick={openChangePasscode}
                           className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                        >
                          <div className="flex items-center">
                             <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center mr-3">
                                <KeyRound className="w-4 h-4" />
                             </div>
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('change_passcode')}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                        <button 
                           onClick={openRemovePasscode}
                           className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                        >
                          <div className="flex items-center">
                             <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center mr-3">
                                <Unlock className="w-4 h-4" />
                             </div>
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('remove_passcode')}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      </>
                   ) : (
                      <button 
                        onClick={openPasscodeSetup}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                      >
                        <div className="flex items-center">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mr-3">
                              <Lock className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('setup_passcode')}</span>
                        </div>
                        <Plus className="w-4 h-4 text-slate-300" />
                      </button>
                   )}
                </div>
             </div>

             {/* 3. Preferences Card */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center">
                   <Settings className="w-4 h-4 mr-2 text-slate-400" />
                   <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('app_settings')}</h3>
                </div>
                <div className="p-2">
                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mr-3">
                            <span className="text-xs font-bold">Aa</span>
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('language')}</span>
                      </div>
                      <button 
                        onClick={toggleLanguage}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-600 transition-colors"
                      >
                         {language === 'en' ? 'English' : 'မြန်မာ'}
                      </button>
                   </div>
                   
                   <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center mr-3">
                            <Moon className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('theme')}</span>
                      </div>
                      <button 
                        onClick={toggleTheme}
                        className={`
                           w-10 h-6 rounded-full transition-colors duration-300 flex items-center px-0.5
                           ${theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300'}
                        `}
                      >
                         <div className={`
                           w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300
                           ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}
                         `} />
                      </button>
                   </div>
                </div>
             </div>

             {/* 4. Data Management Menu */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center">
                   <Activity className="w-4 h-4 mr-2 text-slate-400" />
                   <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('data_management')}</h3>
                </div>
                <div className="p-2">
                    <button 
                       onClick={() => setSettingsView('GROWTH')}
                       className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                    >
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-500 flex items-center justify-center mr-3">
                            <Activity className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('manage_growth')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                   </button>

                   <button 
                       onClick={() => setSettingsView('MEMORIES')}
                       className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                    >
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center mr-3">
                            <ImageIcon className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('manage_memories')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                   </button>
                </div>
             </div>

          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans transition-colors duration-300">
      {/* Top Decoration */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent z-50 max-w-md mx-auto" />

      {/* Main Content Area */}
      <main className="px-5 pt-8 min-h-screen box-border">
        {renderContent()}
      </main>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-xs p-6 rounded-[32px] shadow-2xl animate-zoom-in relative">
              <button 
                onClick={() => setShowPasscodeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                 <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                   {getModalTitle()}
                 </h3>
                 
                 <div className="w-full mb-6">
                    <div className="relative">
                      <input 
                        type="tel" 
                        value={passcodeInput}
                        onChange={(e) => setPasscodeInput(e.target.value)}
                        className={`w-full px-4 py-3 text-center text-2xl tracking-widest font-bold rounded-xl border bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all
                          ${passcodeError 
                            ? 'border-rose-300 focus:ring-rose-200' 
                            : 'border-slate-200 dark:border-slate-600 focus:ring-indigo-200 dark:focus:ring-indigo-800'
                          }
                        `}
                        placeholder="••••"
                        maxLength={4} 
                        autoFocus
                      />
                    </div>
                    {passcodeError && (
                      <p className="text-rose-500 text-xs text-center mt-2 font-bold animate-pulse">
                        {passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW' ? 'Exactly 4 digits required' : t('wrong_passcode')}
                      </p>
                    )}
                 </div>
                 
                 <button 
                    onClick={handlePasscodeSubmit}
                    className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-500/30"
                 >
                    {t('confirm')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal 
          memory={selectedMemory} 
          language={language}
          onClose={() => setSelectedMemory(null)}
          onEdit={() => {
            if (selectedMemory) {
               handleEditStart(selectedMemory);
            }
          }}
          onDelete={() => {
             if (selectedMemory) {
                // requestDeleteMemory will open the confirm modal
                requestDeleteMemory(selectedMemory.id);
             }
          }}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-xs p-6 rounded-[32px] shadow-2xl animate-zoom-in">
              <div className="flex flex-col items-center">
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                   {t('delete')}?
                 </h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center leading-relaxed">
                   {t('confirm_delete')}
                 </p>
                 
                 <div className="flex gap-3 w-full">
                    <button 
                       onClick={() => setItemToDelete(null)}
                       className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                       {t('cancel_btn')}
                    </button>
                    <button 
                       onClick={confirmDelete}
                       className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                    >
                       {t('delete')}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Expanding Pill Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 flex items-center gap-1 z-50 max-w-sm w-[90%] mx-auto transition-colors duration-300">
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => {
                   setActiveTab(tab.id);
                   if (tab.id === TabView.SETTINGS) setSettingsView('MAIN'); // Reset sub-nav on tab click
                }}
                className={`
                  relative flex items-center justify-center gap-2 h-12 rounded-full transition-all duration-500 ease-spring overflow-hidden
                  ${isActive 
                    ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-md' 
                    : 'flex-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500'
                  }
                `}
             >
                 <tab.icon 
                   className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} 
                   strokeWidth={isActive ? 2.5 : 2}
                 />
                 
                 <div className={`
                    overflow-hidden transition-all duration-500 ease-spring
                    ${isActive ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4'}
                 `}>
                    <span className="text-[11px] font-bold whitespace-nowrap pr-1">
                      {t(tab.label)}
                    </span>
                 </div>
             </button>
           );
        })}
      </nav>
    </div>
  );
}

export default App;