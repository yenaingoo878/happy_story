import React, { useState, useEffect, useRef } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Camera, Image as ImageIcon, Baby, ChevronRight, Sparkles, Plus, Moon, Sun, Pencil, X, Settings, Trash2, ArrowLeft, Ruler, Scale, Calendar, Lock, Unlock, ShieldCheck, KeyRound, Cloud, CloudOff, RefreshCw, AlertTriangle, Save, UserPlus, LogOut, Loader2 } from 'lucide-react';
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
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Auth State - MOCKED for Preview
  const [session, setSession] = useState<any>({ user: { email: 'preview@guest.com' } });
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default TRUE for preview

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
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({ id: '', name: '', dob: '', gender: 'boy' }); 

  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateInputType, setDateInputType] = useState('text');
  const [dobInputType, setDobInputType] = useState('text');
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [isEditingGrowth, setIsEditingGrowth] = useState(false);

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

  const [newMemory, setNewMemory] = useState<{title: string; desc: string; date: string; imageUrl?: string}>({ 
    title: '', 
    desc: '', 
    date: getTodayLocal() 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [language, setLanguage] = useState<Language>(() => {
     return (localStorage.getItem('language') as Language) || 'mm';
  });

  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = (key: any) => getTranslation(language, key);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

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
        if (!activeProfileId) {
             setMemories([]);
             setGrowthData([]);
        }
        return;
      }

      if (targetId) {
          await loadChildData(targetId);
      }
  };

  useEffect(() => {
    const loadData = async () => {
      await initDB();
      await refreshData();
      setIsLoading(false);
    };
    loadData();
    
    window.addEventListener('online', () => { setIsOnline(true); syncData(); });
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
        window.removeEventListener('online', () => setIsOnline(true));
        window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const handleManualSync = async () => {
      setIsSyncing(true);
      await syncData();
      await refreshData();
      setIsSyncing(false);
  };

  const handleSaveProfile = async () => {
      if (!editingProfile.name.trim()) return;
      
      const isNew = !editingProfile.id;
      const profileToSave = {
         ...editingProfile,
         id: editingProfile.id || crypto.randomUUID()
      };
      
      await DataService.saveProfile(profileToSave);
      await refreshData();
      
      // If it was a new profile, switch to it
      if (isNew || activeProfileId === '') {
          setActiveProfileId(profileToSave.id || '');
          loadChildData(profileToSave.id || '');
      }
      setSettingsView('MAIN');
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
    setSelectedMemory(null);
  };

  const handleCancelEdit = () => {
    setNewMemory({ title: '', desc: '', date: getTodayLocal() }); 
    setEditingId(null);
    setActiveTab(TabView.HOME);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!activeProfileId) {
          alert("Please create or select a profile first.");
          return;
      }
      
      setIsUploading(true);
      try {
          // Upload to: {childId}/memories/{filename}
          const url = await DataService.uploadImage(file, activeProfileId, 'memories');
          setNewMemory(prev => ({ ...prev, imageUrl: url }));
      } catch (error) {
          console.error("Image upload failed", error);
          alert("Image upload failed. Please try again.");
      } finally {
          setIsUploading(false);
      }
    }
  };
  
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          // If creating a new profile, we need a temp ID or handle it differently
          // For now, let's assume we use a temp ID if not exists
          const targetId = editingProfile.id || 'temp_' + Date.now();
          
          setIsUploading(true);
          try {
              // Upload to: {childId}/profile/{filename}
              const url = await DataService.uploadImage(file, targetId, 'profile');
              setEditingProfile(prev => ({ ...prev, id: prev.id || targetId, profileImage: url }));
          } catch (error) {
              console.error("Profile image upload failed", error);
              alert("Failed to upload image.");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const triggerFileInput = () => {
    if (!isUploading) fileInputRef.current?.click();
  };
  
  const triggerProfileImageInput = () => {
      if(isDetailsUnlocked && !isUploading) {
        profileImageInputRef.current?.click();
      }
  };

  const requestDeleteMemory = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); 
    setItemToDelete({ type: 'MEMORY', id });
  };

  const requestDeleteGrowth = (id: string) => {
    setItemToDelete({ type: 'GROWTH', id });
  };

  const requestDeleteProfile = (id: string) => {
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
     }

     await refreshData();
     setItemToDelete(null);
  };

  const handleSaveMemory = async () => {
    if (!newMemory.title) return;
    if (!activeProfileId) return; 

    // If no image uploaded, use a random placeholder (or handle empty case)
    const finalImageUrl = newMemory.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`;

    if (editingId) {
      const existing = memories.find(m => m.id === editingId);
      if (existing) {
          const updated: Memory = { 
            ...existing, 
            childId: existing.childId,
            title: newMemory.title, 
            description: newMemory.desc, 
            imageUrl: finalImageUrl,
            date: newMemory.date,
            synced: 0 // Mark as dirty
          };
          await DataService.addMemory(updated); 
      }
    } else {
      const memory: Memory = {
        id: crypto.randomUUID(),
        childId: activeProfileId,
        title: newMemory.title, 
        description: newMemory.desc, 
        date: newMemory.date, 
        imageUrl: finalImageUrl,
        tags: ['New Memory'],
        synced: 0
      };
      await DataService.addMemory(memory);
    }
    await loadChildData(activeProfileId);
    setNewMemory({ title: '', desc: '', date: getTodayLocal() });
    setEditingId(null);
    setActiveTab(TabView.HOME);
  };

  const handleAddGrowthRecord = async () => {
    if (newGrowth.month !== undefined && newGrowth.height && newGrowth.weight && activeProfileId) {
      let updatedData: GrowthData = {
          id: newGrowth.id || crypto.randomUUID(),
          childId: activeProfileId,
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

  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center text-slate-400">Loading Data...</div>;
    }

    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        return (
          <div className="space-y-4 pb-32 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                    {activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}
                    {isUploading && <span className="text-xs ml-2 text-primary animate-pulse">Uploading...</span>}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors flex items-center gap-2">
                      {formattedDate}
                      <span onClick={handleManualSync} className={`cursor-pointer ${isOnline ? 'text-teal-500' : 'text-slate-300'}`}>
                          {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3"/>}
                      </span>
                  </p>
               </div>
               
               {activeProfile.profileImage && (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                      <img src={activeProfile.profileImage} alt="Profile" className="w-full h-full object-cover"/>
                  </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              
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
      case TabView.STORY:
      case TabView.GROWTH:
      case TabView.GALLERY:
      case TabView.SETTINGS:
        return (
            <div className="pb-32 animate-fade-in">
                {activeTab === TabView.ADD_MEMORY && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingId ? t('edit_memory_title') : t('add_memory_title')}</h2>
                            {editingId && <button onClick={handleCancelEdit} className="text-sm text-slate-500">{t('cancel_btn')}</button>}
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                             <div onClick={triggerFileInput} className="w-full h-48 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 cursor-pointer flex items-center justify-center overflow-hidden relative">
                                {isUploading ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2"/>
                                        <span className="text-sm text-slate-400">Uploading...</span>
                                    </div>
                                ) : newMemory.imageUrl ? (
                                    <img src={newMemory.imageUrl} className="w-full h-full object-cover"/> 
                                ) : (
                                    <div className="text-center">
                                        <Camera className="w-8 h-8 mx-auto text-slate-300 mb-2"/>
                                        <span className="text-sm text-slate-400">{t('choose_photo')}</span>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                             </div>
                             <div className="space-y-4">
                                <input type="text" value={newMemory.title} onChange={e => setNewMemory({...newMemory, title: e.target.value})} placeholder={t('form_title_placeholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none"/>
                                <input type="date" value={newMemory.date} onChange={e => setNewMemory({...newMemory, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none"/>
                                <textarea value={newMemory.desc} onChange={e => setNewMemory({...newMemory, desc: e.target.value})} placeholder={t('form_desc_placeholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none h-32 resize-none"/>
                                <button onClick={handleSaveMemory} disabled={isUploading} className={`w-full py-3 text-white font-bold rounded-xl ${isUploading ? 'bg-slate-300' : 'bg-primary'}`}>{editingId ? t('update_btn') : t('record_btn')}</button>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === TabView.STORY && (
                    <StoryGenerator language={language} defaultChildName={activeProfile.name} />
                )}

                {activeTab === TabView.GROWTH && (
                    <div>
                        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('growth_title')}</h1></div>
                        <GrowthChart data={growthData} language={language} />
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <span className="text-slate-400 text-xs mb-1">{t('current_height')}</span>
                                <span className="text-2xl font-bold text-primary">{growthData.length > 0 ? growthData[growthData.length - 1]?.height : 0} cm</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <span className="text-slate-400 text-xs mb-1">{t('current_weight')}</span>
                                <span className="text-2xl font-bold text-accent">{growthData.length > 0 ? growthData[growthData.length - 1]?.weight : 0} kg</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === TabView.GALLERY && (
                    <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} />
                )}
                
                {activeTab === TabView.SETTINGS && (
                    settingsView === 'MAIN' ? (
                        <div className="space-y-6">
                             <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('settings_title')}</h1></div>
                             <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-2">
                                   {profiles.map(p => (
                                      <button key={p.id} onClick={() => selectProfileToEdit(p)} className={`flex flex-col items-center flex-shrink-0 transition-all ${editingProfile.id === p.id ? 'opacity-100 scale-105' : 'opacity-60'}`}>
                                         <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 border-2 overflow-hidden ${editingProfile.id === p.id ? 'border-primary' : 'border-slate-200'}`}>
                                            {p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover"/> : <Baby className="w-6 h-6"/>}
                                         </div>
                                         <span className="text-[10px] font-bold text-slate-600">{p.name || 'New'}</span>
                                      </button>
                                   ))}
                                   <button onClick={createNewProfile} className="flex flex-col items-center flex-shrink-0 opacity-60 hover:opacity-100">
                                       <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-1"><UserPlus className="w-5 h-5"/></div>
                                   </button>
                                </div>
                                <div className="space-y-4">
                                     <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700/50" placeholder="Child Name" />
                                     <button onClick={handleSaveProfile} className="w-full py-3 bg-primary text-white font-bold rounded-xl">{t('save_changes')}</button>
                                </div>
                             </div>

                             {/* App Preferences */}
                             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 font-bold text-xs uppercase text-slate-500">{t('app_settings')}</div>
                                <div className="p-4 space-y-6">
                                    {/* Language Row */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700 dark:text-slate-200 font-bold">{t('language')}</span>
                                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                                             <button 
                                                onClick={() => setLanguage('mm')} 
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}
                                             >
                                                မြန်မာ
                                             </button>
                                             <button 
                                                onClick={() => setLanguage('en')} 
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}
                                             >
                                                English
                                             </button>
                                        </div>
                                    </div>

                                    {/* Theme Row */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700 dark:text-slate-200 font-bold">{t('theme')}</span>
                                        <button 
                                            onClick={toggleTheme}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}
                                        >
                                            <div className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                                                {theme === 'dark' ? <Moon className="w-3 h-3 text-indigo-500"/> : <Sun className="w-3 h-3 text-amber-500"/>}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                             </div>

                             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 font-bold text-xs uppercase text-slate-500">{t('data_management')}</div>
                                <div className="p-2">
                                    <button onClick={() => setSettingsView('GROWTH')} className="w-full p-3 flex justify-between hover:bg-slate-50 rounded-xl">{t('manage_growth')}<ChevronRight/></button>
                                    <button onClick={() => setSettingsView('MEMORIES')} className="w-full p-3 flex justify-between hover:bg-slate-50 rounded-xl">{t('manage_memories')}<ChevronRight/></button>
                                </div>
                             </div>
                        </div>
                    ) : settingsView === 'GROWTH' ? (
                        <div>
                           <button onClick={() => setSettingsView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
                           <h2 className="text-xl font-bold mb-4">{t('manage_growth')}</h2>
                           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-4">
                               <div className="grid grid-cols-3 gap-2 mb-2">
                                   <input type="number" placeholder={t('month')} value={newGrowth.month || ''} onChange={e => setNewGrowth({...newGrowth, month: Number(e.target.value)})} className="p-2 border rounded-lg bg-slate-50"/>
                                   <input type="number" placeholder="cm" value={newGrowth.height || ''} onChange={e => setNewGrowth({...newGrowth, height: Number(e.target.value)})} className="p-2 border rounded-lg bg-slate-50"/>
                                   <input type="number" placeholder="kg" value={newGrowth.weight || ''} onChange={e => setNewGrowth({...newGrowth, weight: Number(e.target.value)})} className="p-2 border rounded-lg bg-slate-50"/>
                               </div>
                               <button onClick={handleAddGrowthRecord} className="w-full py-2 bg-teal-500 text-white rounded-lg font-bold">{t('add_record')}</button>
                           </div>
                           <div className="space-y-2">
                               {growthData.map((d, i) => (
                                   <div key={i} className="flex justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                       <span className="font-bold text-teal-600">Month {d.month}</span>
                                       <span>{d.height}cm | {d.weight}kg</span>
                                       <button onClick={() => requestDeleteGrowth(d.id!)} className="text-rose-500"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                        </div>
                    ) : (
                        <div>
                           <button onClick={() => setSettingsView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
                           <h2 className="text-xl font-bold mb-4">{t('manage_memories')}</h2>
                           <div className="space-y-2">
                               {memories.map(m => (
                                   <div key={m.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                       <span className="truncate w-32 font-bold text-slate-700">{m.title}</span>
                                       <div className="flex gap-2">
                                           <button onClick={() => handleEditStart(m)} className="p-2 bg-slate-100 rounded-lg text-slate-500"><Pencil className="w-4 h-4"/></button>
                                           <button onClick={e => requestDeleteMemory(m.id, e)} className="p-2 bg-rose-50 rounded-lg text-rose-500"><Trash2 className="w-4 h-4"/></button>
                                       </div>
                                   </div>
                               ))}
                           </div>
                        </div>
                    )
                )}
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans transition-colors duration-300">
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent z-50 max-w-md mx-auto" />
      <main className="px-5 pt-8 min-h-screen box-border">
        {renderContent()}
      </main>

      {/* Modals are kept the same structure as original for brevity */}
      {selectedMemory && (
        <MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} onEdit={() => handleEditStart(selectedMemory!)} onDelete={() => requestDeleteMemory(selectedMemory!.id)} />
      )}
      
      {/* Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 flex items-center gap-1 z-50 max-w-sm w-[90%] mx-auto transition-colors duration-300">
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === TabView.SETTINGS) setSettingsView('MAIN'); }}
                className={`relative flex items-center justify-center gap-2 h-12 rounded-full transition-all duration-500 ${isActive ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-md' : 'flex-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500'}`}
             >
                 <tab.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                 <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4'}`}>
                    <span className="text-[11px] font-bold whitespace-nowrap pr-1">{t(tab.label)}</span>
                 </div>
             </button>
           );
        })}
      </nav>
    </div>
  );
}

export default App;