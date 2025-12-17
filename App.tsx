
import React, { useState, useEffect, Suspense } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete } from 'lucide-react';
// Lazy load components to reduce initial bundle size
const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory').then(module => ({ default: module.AddMemory })));
const SettingsComponent = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));

import { AuthScreen } from './components/AuthScreen'; // Keep AuthScreen eager as it's the first thing seen
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData } from './types';
import { getTranslation } from './utils/translations';
import { initDB, DataService, syncData } from './lib/db';
import { supabase } from './lib/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Security State
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isDetailsUnlocked, setIsDetailsUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'MEMORY' | 'GROWTH' | 'PROFILE', id: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Application Data State
  const [memories, setMemories] = useState<Memory[]>([]);
  
  // Profile Management State
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Memory State for AddMemory Component
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  
  // Settings view control
  const [settingsInitialView, setSettingsInitialView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES'>('MAIN');

  // Reminder Preferences
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reminders_enabled') !== 'false'; // Default true
  });

  // Birthday Banner State
  const [showBirthdayBanner, setShowBirthdayBanner] = useState(true);

  // Preferences
  const [language, setLanguage] = useState<Language>(() => {
     return (localStorage.getItem('language') as Language) || 'mm';
  });

  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = (key: any) => getTranslation(language, key);

  // Auth Initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      
      if (!session && !isGuestMode) {
          // Cleanup on logout if not guest
          setProfiles([]);
          setMemories([]);
          setGrowthData([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuestMode]);

  // Data Loading - Depends on Session OR Guest Mode
  useEffect(() => {
    if (session || isGuestMode) {
        const loadData = async () => {
          setIsLoading(true);
          await initDB();
          await refreshData();
          setIsLoading(false);
        };
        loadData();
    }
    
    const handleOnline = () => { setIsOnline(true); if(session) syncData(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, [session, isGuestMode]);

  // Theme & Language
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

  const toggleReminders = () => {
    const newVal = !remindersEnabled;
    setRemindersEnabled(newVal);
    localStorage.setItem('reminders_enabled', String(newVal));
  };

  const formatDateDisplay = (isoDate: string | undefined) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };
  
  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  // --- Logic for Birthday ---
  
  const getBirthdayStatus = () => {
    if (!activeProfile.dob) return 'NONE';
    
    const today = new Date();
    const dob = new Date(activeProfile.dob);
    const currentYear = today.getFullYear();
    
    // Create Date objects for birthday in current year
    const bdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
    
    // Reset hours for comparison
    today.setHours(0,0,0,0);
    bdayThisYear.setHours(0,0,0,0);
    
    const oneDay = 24 * 60 * 60 * 1000;
    const diff = (bdayThisYear.getTime() - today.getTime()) / oneDay;

    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'TOMORROW';
    
    // Handle year wrap around (e.g. today is Dec 31, bday is Jan 1)
    if (today.getMonth() === 11 && today.getDate() === 31 && dob.getMonth() === 0 && dob.getDate() === 1) {
        return 'TOMORROW';
    }
    
    return 'NONE';
  };

  // Confetti Component for "Boom" effect
  const ConfettiBoom = () => {
      // 20 particles with random colors and positions
      const colors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400'];
      const particles = Array.from({ length: 30 }).map((_, i) => ({
          id: i,
          color: colors[Math.floor(Math.random() * colors.length)],
          left: `${Math.random() * 100}%`,
          delay: `${Math.random() * 0.2}s`,
          top: `${Math.random() * 100}%`
      }));

      return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
              {particles.map(p => (
                  <div 
                    key={p.id}
                    className={`confetti-piece ${p.color} animate-boom`}
                    style={{ 
                        left: p.left, 
                        top: p.top, 
                        animationDelay: p.delay 
                    }}
                  />
              ))}
          </div>
      );
  };

  // --- End Logic ---

  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const growth = await DataService.getGrowth(childId);
      setMemories(mems);
      setGrowthData(growth);
  };

  const refreshData = async () => {
      let fetchedProfiles = await DataService.getProfiles();
      
      // Auto-create profile for Guest Mode if none exist
      if (fetchedProfiles.length === 0) {
          const defaultProfile: ChildProfile = {
              id: crypto.randomUUID(),
              name: 'My Child',
              dob: new Date().toISOString().split('T')[0],
              gender: 'boy',
              hospitalName: '',
              birthLocation: '',
              country: '',
              synced: 0
          };
          await DataService.saveProfile(defaultProfile);
          fetchedProfiles = [defaultProfile];
      }

      // Sort profiles: Put "My Child" at the end, so real profiles come first
      fetchedProfiles.sort((a, b) => {
          if (a.name === 'My Child') return 1;
          if (b.name === 'My Child') return -1;
          return 0; // Maintain default DB sort (usually creation order)
      });

      setProfiles(fetchedProfiles);

      let targetId = activeProfileId;

      if (fetchedProfiles.length > 0) {
          // If no active profile, or current active profile is not in the list (deleted), pick the first one
          if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) {
             targetId = fetchedProfiles[0].id || '';
             setActiveProfileId(targetId);
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

  const handleManualSync = async () => {
      if (!session) {
          alert("Please sign in to sync your data.");
          return;
      }
      setIsSyncing(true);
      await syncData();
      await refreshData();
      setIsSyncing(false);
  };

  const handleLogout = async () => {
      // 1. Clear Supabase tokens immediately to prevent auto-relogin loops
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
              localStorage.removeItem(key);
          }
      });

      try {
          if (session) {
              // Attempt standard sign out, catch any immediate errors
              const { error } = await supabase.auth.signOut();
              if (error) console.warn("Supabase signOut warning:", error.message);
          }
      } catch (error) {
          console.error("Logout exception:", error);
      } finally {
          // Force cleanup of local state regardless of server response
          setProfiles([]);
          setMemories([]);
          setGrowthData([]);
          setSession(null); 
          setIsGuestMode(false);
      }
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
    // Logic for submit is now mostly handled in the NumberPad click
    // But we keep this if needed for Enter key etc.
  };
  
  // Effect to handle auto-submit when passcode reaches 4 digits
  useEffect(() => {
      if (passcodeInput.length === 4) {
          const timeout = setTimeout(() => {
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
                  setPasscodeInput(''); // Clear input on error
                  setTimeout(() => setPasscodeError(false), 800);
              }
          }, 200); // Slight delay for visual feedback

          return () => clearTimeout(timeout);
      }
  }, [passcodeInput, passcodeMode, passcode]);

  
  const getModalTitle = () => {
      switch(passcodeMode) {
          case 'SETUP': return t('create_passcode');
          case 'CHANGE_NEW': return t('enter_new_passcode');
          case 'CHANGE_VERIFY': return t('enter_old_passcode');
          case 'REMOVE': return t('enter_passcode');
          default: return !passcode ? t('create_passcode') : t('enter_passcode');
      }
  };

  const handleEditStart = (memory: Memory) => {
    setEditingMemory(memory);
    setActiveTab(TabView.ADD_MEMORY);
    setSelectedMemory(null);
  };

  const handleCancelEdit = () => {
    setEditingMemory(null);
    setActiveTab(TabView.HOME);
  };
  
  const handleSaveMemoryComplete = async () => {
      await loadChildData(activeProfileId);
      setEditingMemory(null);
      setActiveTab(TabView.HOME);
  };

  // Request to delete - Shows Modal
  const requestDeleteMemory = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); 
    setItemToDelete({ type: 'MEMORY', id });
    setShowConfirmModal(true);
  };

  const requestDeleteGrowth = (id: string) => {
    setItemToDelete({ type: 'GROWTH', id });
    setShowConfirmModal(true);
  };

  const requestDeleteProfile = (id: string) => {
      if (profiles.length <= 1 && id === profiles[0].id) {
          alert("Cannot delete the only profile.");
          return;
      }
      setItemToDelete({ type: 'PROFILE', id });
      setShowConfirmModal(true);
  };

  // Actual Execute Delete
  const executeDelete = async () => {
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
     setShowConfirmModal(false);
     setItemToDelete(null);
  };

  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>;
  }

  // Show Auth Screen if no session AND not in guest mode
  if (!session && !isGuestMode) {
      return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={() => setIsGuestMode(true)} />;
  }

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center text-slate-400">Loading Data...</div>;
    }

    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        const currentFormattedDate = new Date().toLocaleDateString('en-GB');
        
        const birthdayStatus = getBirthdayStatus();

        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
            {/* Birthday Banners - Only show if reminders are enabled */}
            {remindersEnabled && showBirthdayBanner && (
               <>
               {birthdayStatus === 'TOMORROW' && (
                <div className="bg-gradient-to-r from-amber-200 to-yellow-400 rounded-2xl p-4 text-amber-900 shadow-md relative mb-2 animate-zoom-in">
                   <button onClick={() => setShowBirthdayBanner(false)} className="absolute top-2 right-2 p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors z-20">
                       <X className="w-4 h-4"/>
                   </button>
                   <div className="flex items-center gap-3 relative z-10">
                       <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center shrink-0">
                           <Calendar className="w-6 h-6 animate-pulse" />
                       </div>
                       <div>
                           <h3 className="font-bold text-lg">{t('birthday_tomorrow_title')}</h3>
                           <p className="text-sm opacity-90 leading-tight">{t('birthday_tomorrow_msg').replace('{name}', activeProfile.name)}</p>
                       </div>
                   </div>
                </div>
               )}

               {birthdayStatus === 'TODAY' && (
                <div className="bg-gradient-to-r from-rose-400 to-pink-500 rounded-2xl p-4 text-white shadow-md relative mb-2 animate-zoom-in overflow-hidden">
                   <ConfettiBoom />
                   <button onClick={() => setShowBirthdayBanner(false)} className="absolute top-2 right-2 p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors z-20">
                       <X className="w-4 h-4"/>
                   </button>
                   <div className="flex items-center gap-3 relative z-10">
                       <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                           <Gift className="w-6 h-6 animate-bounce" />
                       </div>
                       <div>
                           <h3 className="font-bold text-lg">{t('happy_birthday_title')}</h3>
                           <p className="text-sm opacity-90 leading-tight">{t('happy_birthday_msg').replace('{name}', activeProfile.name)}</p>
                       </div>
                   </div>
                </div>
               )}
               </>
            )}

            <div className="flex justify-between items-center mb-2">
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                    {activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}
                    {isUploading && <span className="text-xs ml-2 text-primary animate-pulse">Uploading...</span>}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors flex items-center gap-2">
                      {currentFormattedDate}
                      {session ? (
                          <span onClick={handleManualSync} className={`cursor-pointer ${isOnline ? 'text-teal-500' : 'text-slate-300'}`}>
                              {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3"/>}
                          </span>
                      ) : (
                          <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">Offline Mode</span>
                      )}
                  </p>
               </div>
               
               {activeProfile.profileImage && (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                      <img src={activeProfile.profileImage} alt="Profile" className="w-full h-full object-cover"/>
                  </div>
               )}
            </div>

            {/* Responsive Grid System */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              
              {/* Latest Memory - Takes 2 cols on both mobile and desktop (but occupies 2/3 width on desktop) */}
              <div className="col-span-2 md:col-span-2">
                  {latestMemory ? (
                      <div 
                        className="relative h-64 md:h-80 rounded-[32px] overflow-hidden shadow-sm group cursor-pointer border border-transparent dark:border-slate-700"
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
                      <div className="h-64 md:h-80 rounded-[32px] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                          {t('no_photos')}
                      </div>
                  )}
              </div>

              {/* Stacked Cards for Story and Growth - 1 col on mobile (split), 1 col on desktop (stacked) */}
              <div className="col-span-2 md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
                  <div 
                    onClick={() => setActiveTab(TabView.STORY)}
                    className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-5 text-white flex flex-col justify-between h-40 md:h-[9.5rem] shadow-sm relative overflow-hidden cursor-pointer active:scale-95 transition-transform border border-transparent dark:border-slate-700"
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
                    className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-5 flex flex-col justify-between h-40 md:h-[9.5rem] shadow-sm cursor-pointer active:scale-95 transition-transform"
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
              </div>

              {/* Memories List - Spans full width on both mobile and desktop */}
              <div className="col-span-2 md:col-span-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">{t('memories')}</h3>
                  <button onClick={() => setActiveTab(TabView.GALLERY)} className="text-primary text-xs font-bold">{t('see_all')}</button>
                </div>
                <div className="space-y-4 grid md:grid-cols-2 md:gap-4 md:space-y-0">
                  {memories.slice(1, 3).map(mem => (
                    <div 
                      key={mem.id} 
                      onClick={() => setSelectedMemory(mem)}
                      className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-xl transition-colors -mx-2 md:mx-0 md:border md:border-slate-50 md:dark:border-slate-700"
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
            <div className="pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
              <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
                {activeTab === TabView.ADD_MEMORY && (
                    <AddMemory 
                      language={language} 
                      activeProfileId={activeProfileId}
                      editMemory={editingMemory}
                      onSaveComplete={handleSaveMemoryComplete}
                      onCancel={handleCancelEdit}
                    />
                )}

                {activeTab === TabView.STORY && (
                    <StoryGenerator language={language} defaultChildName={activeProfile.name} />
                )}

                {activeTab === TabView.GROWTH && (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('growth_title')}</h1></div>
                        <GrowthChart data={growthData} language={language} />
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                                <span className="text-slate-400 text-xs mb-1">{t('current_height')}</span>
                                <span className="text-2xl font-bold text-primary">{growthData.length > 0 ? growthData[growthData.length - 1]?.height : 0} cm</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
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
                    <SettingsComponent 
                      language={language}
                      setLanguage={setLanguage}
                      theme={theme}
                      toggleTheme={toggleTheme}
                      profiles={profiles}
                      activeProfileId={activeProfileId}
                      onProfileChange={(id) => { setActiveProfileId(id); loadChildData(id); }}
                      onRefreshData={refreshData}
                      passcode={passcode}
                      isDetailsUnlocked={isDetailsUnlocked}
                      onUnlockRequest={handleUnlockClick}
                      onPasscodeSetup={openPasscodeSetup}
                      onPasscodeChange={openChangePasscode}
                      onPasscodeRemove={openRemovePasscode}
                      onHideDetails={() => setIsDetailsUnlocked(false)}
                      growthData={growthData}
                      memories={memories}
                      onEditMemory={handleEditStart}
                      onDeleteMemory={(id) => requestDeleteMemory(id)}
                      onDeleteGrowth={(id) => requestDeleteGrowth(id)}
                      onDeleteProfile={(id) => requestDeleteProfile(id)}
                      isGuestMode={isGuestMode}
                      onLogout={handleLogout}
                      initialView={settingsInitialView}
                      remindersEnabled={remindersEnabled}
                      toggleReminders={toggleReminders}
                    />
                )}
              </Suspense>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 font-sans transition-colors duration-300 flex flex-col md:flex-row">
      {/* Mobile Top Bar Background */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent z-50 md:hidden" />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/95 dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700 z-50 p-6">
          <div className="flex items-center gap-3 mb-10 pl-2">
             <div className="w-10 h-10 bg-gradient-to-br from-primary to-rose-400 rounded-full flex items-center justify-center shadow-md">
                <Baby className="w-6 h-6 text-white" />
             </div>
             <h1 className="font-bold text-xl text-slate-800 dark:text-slate-100 tracking-tight">Little Moments</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => { 
                            if (tab.id === TabView.SETTINGS) {
                                setSettingsInitialView('MAIN'); 
                            }
                            setActiveTab(tab.id); 
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                            isActive 
                            ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <tab.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                        <span className="text-sm">{t(tab.label)}</span>
                    </button>
                );
            })}
          </nav>
          
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
             <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${isGuestMode ? 'text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/10' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10'}`}>
                <LogOut className="w-5 h-5"/>
                {isGuestMode ? "Sign In to Sync" : t('logout')}
             </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-5 pt-8 min-h-screen box-border md:ml-64 md:p-10 max-w-[1920px]">
        {renderContent()}
      </main>

      {/* Modals */}
      {selectedMemory && (
        <Suspense fallback={null}>
          <MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} onEdit={() => handleEditStart(selectedMemory!)} onDelete={() => requestDeleteMemory(selectedMemory!.id)} />
        </Suspense>
      )}
      
      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}/>
           <div className="relative bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-zoom-in text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500"/>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('delete_title')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">{t('confirm_delete')}</p>
              
              <div className="flex gap-3">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors hover:bg-slate-200 dark:hover:bg-slate-600">{t('cancel_btn')}</button>
                  <button onClick={executeDelete} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-colors">{t('confirm')}</button>
              </div>
           </div>
        </div>
      )}

      {/* Modern iOS Style Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
           {/* Background Blur */}
           <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-md" onClick={() => setShowPasscodeModal(false)}/>
           
           <div className="relative w-full md:w-[380px] md:rounded-[40px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl md:shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[800px] overflow-hidden rounded-t-[32px] md:border border-white/20 dark:border-slate-700 transition-all duration-300 ease-out animate-slide-up">
              
              {/* Header */}
              <div className="pt-8 pb-4 px-6 text-center">
                 <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8 md:hidden"></div>
                 <div className="mb-6 flex justify-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-primary">
                        <Settings className="w-6 h-6"/>
                    </div>
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{getModalTitle()}</h3>
                 {passcodeError && <p className="text-rose-500 text-xs animate-pulse font-medium">{t('wrong_passcode')}</p>}
              </div>

              {/* Dots Display */}
              <div className="flex justify-center mb-8 gap-4">
                 {[0, 1, 2, 3].map(i => (
                    <div 
                        key={i} 
                        className={`w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 transition-all duration-200 ${
                            passcodeInput.length > i 
                            ? 'bg-slate-800 dark:bg-slate-100 scale-110 border-transparent' 
                            : 'bg-transparent'
                        }`}
                    />
                 ))}
              </div>

              {/* Keypad */}
              <div className="px-8 pb-8 flex-1 flex flex-col justify-end md:justify-center">
                 <div className="grid grid-cols-3 gap-y-6 gap-x-6 max-w-[280px] mx-auto">
                     {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button 
                           key={num} 
                           onClick={() => {
                               if (passcodeInput.length < 4) setPasscodeInput(prev => prev + num);
                           }}
                           className="w-[72px] h-[72px] rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 flex items-center justify-center text-2xl font-medium text-slate-800 dark:text-slate-100 transition-colors duration-150 shadow-sm"
                        >
                            {num}
                        </button>
                     ))}
                     
                     {/* Bottom Row */}
                     <div className="flex items-center justify-center">
                        <button 
                           onClick={() => setShowPasscodeModal(false)}
                           className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        >
                            {t('cancel_btn')}
                        </button>
                     </div>

                     <button 
                       onClick={() => {
                           if (passcodeInput.length < 4) setPasscodeInput(prev => prev + '0');
                       }}
                       className="w-[72px] h-[72px] rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 flex items-center justify-center text-2xl font-medium text-slate-800 dark:text-slate-100 transition-colors duration-150 shadow-sm"
                    >
                        0
                    </button>

                     <div className="flex items-center justify-center">
                        <button 
                           onClick={() => setPasscodeInput(prev => prev.slice(0, -1))}
                           className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 active:scale-95 transition-transform"
                        >
                            <Delete className="w-6 h-6"/>
                        </button>
                     </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 flex items-center gap-1 z-50 max-w-sm w-[90%] mx-auto transition-colors duration-300 md:hidden">
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => { 
                    if (tab.id === TabView.SETTINGS) {
                        setSettingsInitialView('MAIN'); 
                    }
                    setActiveTab(tab.id); 
                }}
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
