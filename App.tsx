
import React, { useState, useEffect, Suspense, useMemo, useTransition, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AuthScreen } from './components/AuthScreen';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData, Reminder, Story } from './types';
import { getTranslation, translations } from './utils/translations';
import { initDB, DataService, syncData, getImageSrc } from './lib/db';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { uploadManager } from './lib/uploadManager';
import { syncManager } from './lib/syncManager';

// Lazy loaded components
const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory'));
const SettingsComponent = React.lazy(() => import('./components/Settings'));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));
const StoryDetailModal = React.lazy(() => import('./components/StoryDetailModal').then(module => ({ default: module.StoryDetailModal })));
const Onboarding = React.lazy(() => import('./components/Onboarding').then(module => ({ default: module.Onboarding })));
const CloudPhotoModal = React.lazy(() => import('./components/CloudPhotoModal').then(module => ({ default: module.CloudPhotoModal })));

// FontAwesome Icon Bridge
const Home = ({ className }: { className?: string }) => <i className={`fa-solid fa-house flex items-center justify-center ${className}`} />;
const PlusCircle = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-plus flex items-center justify-center ${className}`} />;
const BookOpen = ({ className }: { className?: string }) => <i className={`fa-solid fa-book-open flex items-center justify-center ${className}`} />;
const Activity = ({ className }: { className?: string }) => <i className={`fa-solid fa-chart-line flex items-center justify-center ${className}`} />;
const ImageIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-image flex items-center justify-center ${className}`} />;
const ChevronRight = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-right flex items-center justify-center ${className}`} />;
const SettingsIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-gear flex items-center justify-center ${className}`} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin flex items-center justify-center ${className}`} />;
const Baby = ({ className }: { className?: string }) => <i className={`fa-solid fa-baby flex items-center justify-center ${className}`} />;
const LogOut = ({ className }: { className?: string }) => <i className={`fa-solid fa-right-from-bracket flex items-center justify-center ${className}`} />;
const AlertTriangle = ({ className }: { className?: string }) => <i className={`fa-solid fa-triangle-exclamation flex items-center justify-center ${className}`} />;
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark flex items-center justify-center ${className}`} />;
const Lock = ({ className }: { className?: string }) => <i className={`fa-solid fa-lock flex items-center justify-center ${className}`} />;
const CheckCircle2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-check flex items-center justify-center ${className}`} />;
const Wand2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-wand-magic-sparkles flex items-center justify-center ${className}`} />;

const navItems = [
  { id: TabView.HOME, label: 'nav_home' as keyof typeof translations, icon: Home },
  { id: TabView.GALLERY, label: 'nav_gallery' as keyof typeof translations, icon: ImageIcon },
  { id: TabView.ADD_MEMORY, label: 'nav_create' as keyof typeof translations, icon: PlusCircle },
  { id: TabView.GROWTH, label: 'nav_growth' as keyof typeof translations, icon: Activity },
  { id: TabView.SETTINGS, label: 'nav_settings' as keyof typeof translations, icon: SettingsIcon },
];

function App() {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const tabScrollPositions = useRef<Record<string, number>>({});
  
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [cloudPhoto, setCloudPhoto] = useState<{ url: string; name: string } | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem('guest_mode') === 'true');
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');
  const [unlockCallback, setUnlockCallback] = useState<(() => void) | null>(null);
  
  const [pinValue, setPinValue] = useState('');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const [deleteCallback, setDeleteCallback] = useState<(() => Promise<boolean | any>) | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [syncState, setSyncState] = useState<any>({ status: 'idle', progress: 0, total: 0, completed: 0 });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => localStorage.getItem('reminders_enabled') !== 'false');

  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  const profiles = useLiveQuery(() => DataService.getProfiles(), []);
  const memories = useLiveQuery(() => DataService.getMemories(activeProfileId), [activeProfileId]) || [];
  const stories = useLiveQuery(() => DataService.getStories(activeProfileId), [activeProfileId]) || [];
  const growthData = useLiveQuery(() => DataService.getGrowth(activeProfileId), [activeProfileId]) || [];
  const reminders = useLiveQuery(() => DataService.getReminders(), []) || [];

  // Swipe Gesture State
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  const triggerSuccess = (key: keyof typeof translations) => {
    setSuccessMessage(t(key));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const resetPinInputs = () => {
    setPinValue('');
    setTimeout(() => hiddenInputRef.current?.focus(), 100);
  };

  const handlePasscodeSubmit = (code: string) => {
    if (passcodeMode === 'SETUP') {
      localStorage.setItem('app_passcode', code);
      setPasscode(code);
      setIsAppUnlocked(true);
      setShowPasscodeModal(false);
      triggerSuccess('save_success');
      if (unlockCallback) { unlockCallback(); setUnlockCallback(null); }
    } else if (passcodeMode === 'UNLOCK') {
      if (code === passcode) {
        setIsAppUnlocked(true);
        setShowPasscodeModal(false);
        setPasscodeError(false);
        if (unlockCallback) { unlockCallback(); setUnlockCallback(null); }
      } else {
        setPasscodeError(true);
        resetPinInputs();
      }
    } else if (passcodeMode === 'CHANGE_VERIFY') {
      if (code === passcode) {
        setPasscodeMode('CHANGE_NEW');
        resetPinInputs();
        setPasscodeError(false);
      } else {
        setPasscodeError(true);
        resetPinInputs();
      }
    } else if (passcodeMode === 'CHANGE_NEW') {
      localStorage.setItem('app_passcode', code);
      setPasscode(code);
      setShowPasscodeModal(false);
      triggerSuccess('save_success');
    } else if (passcodeMode === 'REMOVE') {
      if (code === passcode) {
        localStorage.removeItem('app_passcode');
        setPasscode(null);
        setIsAppUnlocked(true);
        setShowPasscodeModal(false);
        triggerSuccess('delete_success');
      } else {
        setPasscodeError(true);
        resetPinInputs();
      }
    }
  };

  const handlePinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPinValue(val);
    if (val.length === 4) {
      setTimeout(() => handlePasscodeSubmit(val), 150);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    tabScrollPositions.current[activeTab] = currentScrollY;
    
    if (Math.abs(currentScrollY - lastScrollY.current) < 15) return;
    if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
      if (isNavVisible) setIsNavVisible(false);
    } else {
      if (!isNavVisible) setIsNavVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest('.recharts-wrapper')) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current !== null) {
      touchEndRef.current = e.targetTouches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null || touchEndRef.current === null) return;
    
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > 80;
    const isRightSwipe = distance < -80;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = navItems.findIndex(item => item.id === activeTab);
      if (isLeftSwipe && currentIndex < navItems.length - 1) {
        handleTabChange(navItems[currentIndex + 1].id);
      } else if (isRightSwipe && currentIndex > 0) {
        handleTabChange(navItems[currentIndex - 1].id);
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  const handleTabChange = (tab: TabView) => {
    if (tab === activeTab) return;
    startTransition(() => {
      setActiveTab(tab);
      setIsNavVisible(true);
      if (scrollContainerRef.current) {
        const targetScroll = tabScrollPositions.current[tab] || 0;
        scrollContainerRef.current.scrollTo({ top: targetScroll, behavior: 'auto' });
      }
    });
  };

  useEffect(() => {
    syncManager.subscribe(setSyncState);
    return () => {
      syncManager.unsubscribe();
    }
  }, []);

  useEffect(() => { if (!passcode) setIsAppUnlocked(true); }, [passcode]);
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setAuthLoading(false); setIsInitialLoading(false); return; }
    supabase.auth.getSession().then(({ data, error }: any) => {
      if (error) {
        supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(data?.session || null);
      }
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
      setIsInitialLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profiles && profiles.length > 0 && !activeProfileId) {
        setActiveProfileId(profiles[0].id!);
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    if (session || isGuestMode) {
        const initialLoad = async () => {
          try {
            setIsInitialLoading(true);
            setLoadingStatus(language === 'mm' ? 'ပြင်ဆင်နေသည်...' : 'Initializing...');
            const dbInitResult = await initDB();
            if (!dbInitResult.success) {
                setDbError(dbInitResult.error || 'Database Initialization Failed');
                setIsInitialLoading(false);
                return;
            }
            if (navigator.onLine && session && isSupabaseConfigured()) {
                const initialSyncDone = localStorage.getItem('initial_sync_done') === 'true';
                if (!initialSyncDone) {
                    setLoadingStatus(language === 'mm' ? 'Cloud မှ အချက်အလက်များကို ရယူနေသည်...' : 'Performing initial sync...');
                    await syncData();
                    localStorage.setItem('initial_sync_done', 'true');
                } else {
                    syncData().catch(e => console.warn("Background sync failed:", e));
                }
            }
            setIsInitialLoading(false);
          } catch (err) {
            setDbError('Critical Setup Error');
            setIsInitialLoading(false);
          }
        };
        initialLoad();
    } else {
        setIsInitialLoading(false);
    }
  }, [session, isGuestMode, language]);

  const activeProfile = (profiles || []).find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  const handleLogout = async () => {
      setIsLoggingOut(true);
      try { 
        if (session && isSupabaseConfigured()) await supabase.auth.signOut(); 
      } 
      catch (e) { console.error("Error signing out:", e); } 
      finally {
        await DataService.clearAllUserData(); 
        localStorage.removeItem('guest_mode');
        localStorage.removeItem('initial_sync_done');
        setIsGuestMode(false); setSession(null); 
        startTransition(() => setActiveTab(TabView.HOME));
        setIsAppUnlocked(false); 
        setShowPasscodeModal(false);
        tabScrollPositions.current = {};
        setIsLoggingOut(false);
      }
  };

  const executeDelete = async () => {
    if (!deleteCallback) return;
    try {
      const result = await deleteCallback();
      if (result !== false) triggerSuccess('delete_success');
    } finally {
      setShowConfirmModal(false);
      setDeleteCallback(null);
    }
  };

  const requestDeleteConfirmation = (callback: () => Promise<boolean | any>) => {
    setDeleteCallback(() => callback);
    setShowConfirmModal(true);
  };

  const homeView = useMemo(() => {
    const latestMemory = memories[0];
    const heroImg = latestMemory?.imageUrls?.[0] || latestMemory?.imageUrl || null;
    return (
      <div className="space-y-3 md:space-y-4 pb-4 animate-fade-in">
        {/* Responsive Header - Compact */}
        <div className="flex justify-between items-center mb-1 mt-1">
           <div className="text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                {activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-0.5">
                {new Date().toLocaleDateString('en-GB')}
              </p>
           </div>
           {activeProfile.profileImage && (
             <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg shrink-0">
               <img src={getImageSrc(activeProfile.profileImage)} className="w-full h-full object-cover" alt="Profile" />
             </div>
           )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {/* Main Hero Card - Compact */}
          <div className="md:col-span-8">
              {latestMemory && heroImg ? (
                  <div className="relative h-48 sm:h-60 md:h-[300px] xl:h-[380px] rounded-3xl sm:rounded-[40px] overflow-hidden shadow-xl group cursor-pointer border border-transparent dark:border-slate-700 transition-all hover:scale-[1.01] active:scale-95" onClick={() => setSelectedMemory(latestMemory)}>
                    <img src={getImageSrc(heroImg)} className="w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-110" alt="Latest Memory" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-6 pointer-events-none text-left">
                      <span className="bg-primary text-white text-[8px] sm:text-[9px] font-black px-2 py-1 rounded-full w-fit mb-1 sm:mb-2 uppercase tracking-[0.2em] shadow-lg">
                        {t('latest_arrival')}
                      </span>
                      <h3 className="text-white text-lg sm:text-xl md:text-2xl font-black leading-tight max-w-lg">
                        {latestMemory.title}
                      </h3>
                    </div>
                  </div>
              ) : (
                <div className="h-48 sm:h-60 md:h-[300px] xl:h-[380px] rounded-3xl sm:rounded-[40px] bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 opacity-10" />
                  <p className="font-black text-[10px] sm:text-xs uppercase tracking-[0.3em]">{t('no_photos')}</p>
                </div>
              )}
          </div>

          {/* Quick Actions & Stats - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-1 md:col-span-4 gap-2 md:gap-3 lg:gap-4">
              <div onClick={() => handleTabChange(TabView.STORY)} className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl sm:rounded-[32px] p-4 sm:p-5 text-white flex flex-col justify-between aspect-square md:aspect-auto shadow-lg cursor-pointer transition-all active:scale-95 hover:shadow-indigo-500/20 overflow-hidden relative text-left">
                <Wand2 className="w-5 h-5 sm:w-8 sm:h-8 text-indigo-100 mb-1" />
                <h3 className="font-black text-base sm:text-lg md:text-xl leading-tight z-10">{t('create_story')}</h3>
                <div className="absolute -bottom-4 -right-4 opacity-10 scale-100">
                  <BookOpen className="w-24 h-24" />
                </div>
              </div>
              <div onClick={() => handleTabChange(TabView.GROWTH)} className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl sm:rounded-[32px] p-4 sm:p-5 flex flex-col justify-between aspect-square md:aspect-auto shadow-lg cursor-pointer active:scale-95 transition-all text-left">
                <Activity className="w-5 h-5 sm:w-8 sm:h-8 text-teal-500 mb-1" />
                <div>
                  <p className="text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5">{t('current_height')}</p>
                  <h3 className="font-black text-slate-800 dark:text-white text-lg sm:text-2xl md:text-3xl">
                    {growthData[growthData.length-1]?.height || 0} <span className="text-[10px] sm:text-xs font-bold text-slate-400">cm</span>
                  </h3>
                </div>
              </div>
          </div>
        </div>

        {/* Recent Memories Section - Compact */}
        <div className="mt-4 md:mt-6 animate-slide-up">
          <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
              {t('memories')}
            </h3>
            <button onClick={() => handleTabChange(TabView.GALLERY)} className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity">
              {t('see_all')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 md:gap-4">
             {memories.slice(0, 4).map(m => (
                <div key={m.id} onClick={() => setSelectedMemory(m)} className="bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-50 dark:border-slate-700 flex items-center gap-3 sm:gap-4 active:scale-[0.98] transition-all cursor-pointer shadow-sm hover:shadow-md group">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-sm border border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                      {m.imageUrls?.[0] ? (
                        <img src={getImageSrc(m.imageUrls[0])} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={m.title} />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-200"/>
                      )}
                   </div>
                   <div className="flex-1 min-w-0 overflow-hidden text-left">
                      <h4 className="font-black text-slate-800 dark:text-white truncate text-xs sm:text-sm md:text-base tracking-tight leading-none mb-1">{m.title}</h4>
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{m.date}</p>
                   </div>
                   <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-200 group-hover:text-primary transition-all shrink-0">
                     <ChevronRight className="w-4 h-4" />
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    );
  }, [memories, remindersEnabled, activeProfile, activeTab, language]);

  const renderContent = () => {
    if (isLoading) return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-[9999]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
    
    return (
      <div className="w-full">
        <div key="view-home" style={{ display: activeTab === TabView.HOME ? 'block' : 'none' }}>
           {homeView}
        </div>
        
        <div key="view-gallery" style={{ display: activeTab === TabView.GALLERY ? 'block' : 'none' }}>
           <Suspense fallback={null}>
             <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} activeProfileId={activeProfileId} requestDeleteConfirmation={requestDeleteConfirmation} />
           </Suspense>
        </div>

        <div key="view-add" style={{ display: activeTab === TabView.ADD_MEMORY ? 'block' : 'none' }}>
           <Suspense fallback={null}>
             <AddMemory language={language} activeProfileId={activeProfileId} editMemory={editingMemory} onSaveComplete={() => { triggerSuccess('save_success'); setEditingMemory(null); handleTabChange(TabView.HOME); }} onCancel={() => { setEditingMemory(null); handleTabChange(TabView.HOME); }} session={session} />
           </Suspense>
        </div>

        <div key="view-story" style={{ display: activeTab === TabView.STORY ? 'block' : 'none' }}>
           <Suspense fallback={null}>
             <StoryGenerator language={language} activeProfileId={activeProfileId} defaultChildName={activeProfile.name} onSaveComplete={() => { triggerSuccess('save_success'); handleTabChange(TabView.HOME); }} />
           </Suspense>
        </div>

        <div key="view-growth" style={{ display: activeTab === TabView.GROWTH ? 'block' : 'none' }}>
           <Suspense fallback={null}>
             <div className="px-1"><h1 className="text-xl sm:text-2xl font-black mb-4 text-slate-800 dark:text-slate-100 text-left tracking-tight">{t('growth_title')}</h1><GrowthChart data={growthData} language={language} /></div>
           </Suspense>
        </div>

        <div key="view-settings" style={{ display: activeTab === TabView.SETTINGS ? 'block' : 'none' }}>
           <Suspense fallback={null}>
             <SettingsComponent 
                language={language} setLanguage={setLanguage} theme={theme} toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                profiles={profiles} activeProfileId={activeProfileId} onProfileChange={(id) => setActiveProfileId(id)} onRefreshData={async () => {}}
                passcode={passcode} isDetailsUnlocked={isAppUnlocked} onUnlockRequest={(cb) => { setPasscodeMode('UNLOCK'); resetPinInputs(); setShowPasscodeModal(true); if(cb) setUnlockCallback(() => cb); }}
                onPasscodeSetup={() => { setPasscodeMode('SETUP'); resetPinInputs(); setShowPasscodeModal(true); }}
                onPasscodeChange={() => { setPasscodeMode('CHANGE_VERIFY'); resetPinInputs(); setShowPasscodeModal(true); }}
                onPasscodeRemove={() => { setPasscodeMode('REMOVE'); resetPinInputs(); setShowPasscodeModal(true); }}
                onHideDetails={() => setIsAppUnlocked(false)}
                growthData={growthData} memories={memories} stories={stories}
                onEditMemory={(m) => { setEditingMemory(m); handleTabChange(TabView.ADD_MEMORY); }}
                onDeleteMemory={(id) => requestDeleteConfirmation(() => DataService.deleteMemory(id))}
                onStoryClick={setSelectedStory}
                onDeleteStory={(id) => requestDeleteConfirmation(() => DataService.deleteStory(id))}
                onDeleteGrowth={(id) => requestDeleteConfirmation(() => DataService.deleteGrowth(id))}
                onSaveGrowth={(d) => DataService.saveGrowth(d)}
                onDeleteProfile={(id) => requestDeleteConfirmation(() => DataService.deleteProfile(id))}
                isGuestMode={isGuestMode} onLogout={handleLogout}
                remindersEnabled={remindersEnabled} toggleReminders={() => setRemindersEnabled(!remindersEnabled)}
                remindersList={reminders}
                onDeleteReminder={(id) => requestDeleteConfirmation(() => DataService.deleteReminder(id))}
                onSaveReminder={(r) => DataService.saveReminder(r)}
                onSaveSuccess={() => triggerSuccess('save_success')}
                session={session}
                onViewCloudPhoto={(url, name) => setCloudPhoto({ url, name })}
              />
           </Suspense>
        </div>
      </div>
    );
  };

  const activeTabIndex = navItems.findIndex(item => item.id === activeTab);

  if (authLoading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-[9999]">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );
  
  if (!session && !isGuestMode) return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={() => { setIsGuestMode(true); localStorage.setItem('guest_mode', 'true'); }} />;
  
  if (isInitialLoading || profiles === undefined) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center p-4">
      <Loader2 className="w-10 h-10 text-primary mb-3 animate-spin" />
      <p className="text-xs font-bold text-slate-400">{loadingStatus || t('welcome_subtitle')}</p>
    </div>
  );

  if (profiles.length === 0) return (
    <Suspense fallback={null}>
      <Onboarding 
        language={language} 
        onCreateProfile={async (d) => { await DataService.saveProfile({ ...d, id: crypto.randomUUID() } as ChildProfile); }} 
        onLogout={handleLogout} 
      />
    </Suspense>
  );

  return (
    <>
      <div className="debug-safe-area-top"></div>
      <div className="debug-safe-area-bottom"></div>
      <div className="debug-safe-area-left"></div>
      <div className="debug-safe-area-right"></div>

      {/* Desktop Sidebar Navigation - Compact */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 xl:w-64 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex-col py-6 px-4 z-[1000] shadow-sm transition-all">
        <div className="flex items-center gap-3 mb-8 px-2 text-left">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner shrink-0"><Baby className="w-5 h-5" /></div>
            <div className="min-w-0">
              <h2 className="font-black text-slate-800 dark:text-white leading-tight truncate text-sm">Little Moments</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{t('welcome_subtitle')}</p>
            </div>
        </div>
        <div className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => handleTabChange(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <item.icon className={`w-4 h-4 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-105'}`} />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.15em]">{t(item.label)}</span>
              </button>
            ))}
        </div>
        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700/50">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all duration-300 group">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.15em]">{t('logout')}</span>
            </button>
        </div>
      </nav>

      <main 
        ref={scrollContainerRef} 
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="main-content lg:pl-56 xl:pl-64 flex-1 relative no-scrollbar"
      >
        <div className="max-w-6xl mx-auto relative">
          <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
            {renderContent()}
          </Suspense>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Compact */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-[1000] pointer-events-none mobile-nav-container ${!isNavVisible ? 'mobile-nav-hidden' : ''}`}>
        <div className="relative pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl flex justify-between items-center shadow-[0_-8px_30px_rgb(0,0,0,0.06)] border-t border-slate-100 dark:border-slate-700/50 relative overflow-hidden pb-[env(safe-area-inset-bottom,8px)]">
            <div className="absolute top-0 transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)" style={{ width: `calc(100% / ${navItems.length})`, left: `calc(${activeTabIndex} * (100% / ${navItems.length}))` }}>
               <div className="w-full h-1 bg-primary rounded-b-full shadow-[0_4px_12px_rgba(255,154,162,0.4)]" />
            </div>
            {navItems.map((item) => (
              <button key={item.id} onClick={() => handleTabChange(item.id)} className={`relative z-10 flex-1 flex flex-col items-center pt-3 pb-1 transition-all duration-500 active:scale-90 group ${activeTab === item.id ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                <div className="w-6 h-6 flex items-center justify-center mb-0.5">
                  <item.icon className={`w-5 h-5 transition-all duration-500 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-105 opacity-70'}`} />
                </div>
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>
                  {t(item.label)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Global Modals - Reduced Padding */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-[2000000] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 animate-fade-in" onClick={() => hiddenInputRef.current?.focus()}>
           <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
              <button onClick={(e) => { e.stopPropagation(); setShowPasscodeModal(false); setUnlockCallback(null); }} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 transition-colors z-50">
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-6 flex flex-col items-center">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-xl transition-all ${passcodeError ? 'bg-rose-500 text-white animate-bounce' : 'bg-primary/10 text-primary'}`}>
                    <Lock className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-1">
                    {passcodeMode === 'SETUP' ? t('create_passcode') : 
                     passcodeMode === 'UNLOCK' ? t('enter_passcode') : 
                     passcodeMode === 'CHANGE_VERIFY' ? t('enter_old_passcode') : 
                     passcodeMode === 'CHANGE_NEW' ? t('enter_new_passcode') : 
                     t('enter_passcode')}
                 </h3>
                 <p className={`text-[9px] font-black uppercase tracking-widest ${passcodeError ? 'text-rose-500' : 'text-slate-400'}`}>
                    {passcodeError ? t('wrong_passcode') : 'Security Verification'}
                 </p>
              </div>

              <div className={`flex justify-center gap-4 mb-6 transition-transform ${passcodeError ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                 {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        pinValue.length > i 
                          ? 'bg-primary scale-125 shadow-[0_0_10px_rgba(255,154,162,0.8)]' 
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`} 
                    />
                 ))}
              </div>

              <input 
                ref={hiddenInputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinValue}
                onChange={handlePinInputChange}
                className="opacity-0 absolute inset-0 w-full h-full cursor-default"
                autoFocus
              />

              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">AES-256 Protected</p>
           </div>
        </div>
      )}

      <Suspense fallback={null}>
        {selectedMemory && <MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} />}
        {selectedStory && <StoryDetailModal story={selectedStory} language={language} onClose={() => setSelectedStory(null)} onDelete={() => requestDeleteConfirmation(() => DataService.deleteStory(selectedStory.id))} />}
        {cloudPhoto && <CloudPhotoModal url={cloudPhoto.url} data={null} isLoading={false} language={language} onClose={() => setCloudPhoto(null)} onDelete={(fileName) => requestDeleteConfirmation(() => DataService.deleteCloudPhoto(session.user.id, activeProfileId, fileName))} />}
      </Suspense>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[600000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-zoom-in border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-4 shadow-inner">
               <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t('delete_title')}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed mb-6 px-1">{t('confirm_delete')}</p>
            <div className="flex flex-col gap-2">
               <button onClick={executeDelete} className="w-full py-3 bg-rose-500 text-white font-black rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                 {t('delete')}
               </button>
               <button onClick={() => setShowConfirmModal(false)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-xl active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                 {t('cancel_btn')}
               </button>
            </div>
          </div>
        </div>
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 z-[1000000] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-fade-in">
           <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4 shadow-2xl border border-white/10 animate-pulse">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
           </div>
           <h3 className="text-lg font-black text-white uppercase tracking-[0.3em] mb-1">{language === 'mm' ? 'ထွက်ခွာနေသည်' : 'Logging Out'}</h3>
           <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest animate-pulse">{language === 'mm' ? 'အချက်အလက်များကို သိမ်းဆည်းနေပါသည်...' : 'Finalizing your session...'}</p>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-0 right-0 z-[1000000] px-4 pointer-events-none flex justify-center animate-slide-down">
          <div className="bg-emerald-500/95 dark:bg-emerald-600/95 backdrop-blur-2xl text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 border border-emerald-400/30 max-w-xs pointer-events-auto ring-4 ring-emerald-500/10">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
               <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">{successMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
