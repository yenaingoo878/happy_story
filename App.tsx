
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings as SettingsIcon, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete, Bell, Lock, ChevronLeft, Sun, Moon, Keyboard, ShieldCheck, CheckCircle2, Plus, LayoutDashboard, Heart } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory'));
const SettingsComponent = React.lazy(() => import('./components/Settings'));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));
const StoryDetailModal = React.lazy(() => import('./components/StoryDetailModal').then(module => ({ default: module.StoryDetailModal })));
const Onboarding = React.lazy(() => import('./components/Onboarding').then(module => ({ default: module.Onboarding })));
const CloudPhotoModal = React.lazy(() => import('./components/CloudPhotoModal').then(module => ({ default: module.CloudPhotoModal })));

import { AuthScreen } from './components/AuthScreen';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData, Reminder, Story } from './types';
import { getTranslation, translations } from './utils/translations';
import { initDB, DataService, syncData, getImageSrc, resetDatabase, db } from './lib/db';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { uploadManager } from './lib/uploadManager';
import { syncManager } from './lib/syncManager';
import { initializeAntiInspect } from './lib/security';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [cloudPhoto, setCloudPhoto] = useState<{ url: string; name: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cloudRefreshTrigger, setCloudRefreshTrigger] = useState(0);
  
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem('guest_mode') === 'true');
  const [authLoading, setAuthLoading] = useState(true);

  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');
  const [passcodeInputStr, setPasscodeInputStr] = useState('');

  const [deleteCallback, setDeleteCallback] = useState<(() => Promise<boolean | any>) | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(-1);
  const [syncState, setSyncState] = useState<any>({ status: 'idle', progress: 0, total: 0, completed: 0 });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => localStorage.getItem('reminders_enabled') !== 'false');
  const [showBirthdayBanner, setShowBirthdayBanner] = useState(true);

  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  const profiles = useLiveQuery(() => DataService.getProfiles(), []);
  const memories = useLiveQuery(() => DataService.getMemories(activeProfileId), [activeProfileId]) || [];
  const stories = useLiveQuery(() => DataService.getStories(activeProfileId), [activeProfileId]) || [];
  const growthData = useLiveQuery(() => DataService.getGrowth(activeProfileId), [activeProfileId]) || [];
  const reminders = useLiveQuery(() => DataService.getReminders(), []) || [];

  const triggerSuccess = (key: keyof typeof translations) => {
    setSuccessMessage(t(key));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  useEffect(() => {
    initializeAntiInspect();
    uploadManager.subscribe((progress) => setUploadProgress(progress));
    syncManager.subscribe(setSyncState);
    return () => {
      uploadManager.unsubscribe();
      syncManager.unsubscribe();
    }
  }, []);

  useEffect(() => { if (!passcode) setIsAppUnlocked(true); }, [passcode]);
  useEffect(() => { localStorage.setItem('language', language); }, [language]);
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

  // Real-time Database Sync Logic (Push/Pull Background)
  useEffect(() => {
    if (!session?.user?.id || !isSupabaseConfigured()) return;

    // Listen to changes on ALL tables relevant to the user
    const tables = ['memories', 'stories', 'growth_data', 'child_profile', 'reminders'];
    
    const channel = supabase.channel('db-changes');
    
    tables.forEach(table => {
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: table,
        filter: `user_id=eq.${session.user.id}`
      }, (payload) => {
          // Debounce and trigger sync
          setTimeout(() => {
              if (navigator.onLine) {
                syncData().catch(err => console.debug("Realtime background sync failed", err));
              }
          }, 1000);
      });
    });

    channel.subscribe();

    // Periodic Poll (every 5 minutes) as a fallback
    const pollInterval = setInterval(() => {
       if (navigator.onLine) syncData().catch(() => {});
    }, 1000 * 60 * 5);

    // Sync on visibility change (re-entering app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
         syncData().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);

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
            
            const initialSyncDone = localStorage.getItem('initial_sync_done') === 'true';

            if (navigator.onLine && session && isSupabaseConfigured()) {
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
            console.error("Critical error during setup:", err);
            setDbError('Critical Setup Error');
            setIsInitialLoading(false);
          }
        };
        initialLoad();
    } else {
        setIsInitialLoading(false);
    }
  }, [session, isGuestMode, language]);

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        if (session && isSupabaseConfigured()) {
            syncData().catch(e => console.warn("Sync failed when coming online:", e));
        }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, [session]);

  const activeProfile = (profiles || []).find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  const handleCreateFirstProfile = async (childData: Partial<ChildProfile>) => {
    const newProfile: ChildProfile = { 
        id: crypto.randomUUID(), 
        name: childData.name || getTranslation(language, 'default_child_name'), 
        dob: childData.dob || new Date().toISOString().split('T')[0], 
        gender: childData.gender || 'boy',
        synced: 0
    };
    await DataService.saveProfile(newProfile);
    setActiveProfileId(newProfile.id!);
  };

  const handleProfileChange = (id: string) => {
    setActiveProfileId(id);
  };

  const handleGuestLogin = async () => {
    await DataService.clearAllUserData();
    localStorage.removeItem('initial_sync_done');
    setActiveTab(TabView.HOME);
    setIsGuestMode(true);
    localStorage.setItem('guest_mode', 'true');
  };

  const handleLogout = async () => {
      try { if (session && isSupabaseConfigured()) await supabase.auth.signOut(); } 
      catch (e) { console.error("Error signing out:", e); } 
      finally {
        await DataService.clearAllUserData(); 
        localStorage.removeItem('guest_mode');
        localStorage.removeItem('initial_sync_done');
        setIsGuestMode(false); setSession(null); 
        setActiveTab(TabView.HOME); setIsAppUnlocked(false); 
        setShowPasscodeModal(false);
      }
  };

  const handleSaveGrowth = async (data: GrowthData) => {
      await DataService.saveGrowth(data);
      triggerSuccess('profile_saved');
  };

  const requestDeleteConfirmation = (onConfirm: () => Promise<boolean | any>) => {
      setDeleteCallback(() => onConfirm);
      setShowConfirmModal(true);
  };

  const executeDelete = async () => {
    if (!deleteCallback) return;
    try {
      const result = await deleteCallback();
      if (result !== false) {
        triggerSuccess('delete_success');
      }
    } catch (e) {
      console.error("Deletion failed:", e);
    } finally {
      setShowConfirmModal(false);
      setDeleteCallback(null);
    }
  };

  const validatePasscode = (code: string) => {
    if (code.length !== 4) return;
    setPasscodeError(false);
    if (passcodeMode === 'UNLOCK') {
      if (code === passcode) { setIsAppUnlocked(true); setShowPasscodeModal(false); setPasscodeInputStr(''); }
      else { setPasscodeError(true); setPasscodeInputStr(''); }
    } else if (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW') {
      localStorage.setItem('app_passcode', code); setPasscode(code); setIsAppUnlocked(true);
      setShowPasscodeModal(false); setPasscodeInputStr('');
    } else if (passcodeMode === 'CHANGE_VERIFY') {
      if (code === passcode) { setPasscodeMode('CHANGE_NEW'); setPasscodeInputStr(''); }
      else { setPasscodeError(true); setPasscodeInputStr(''); }
    } else if (passcodeMode === 'REMOVE') {
      if (code === passcode) {
        localStorage.removeItem('app_passcode'); setPasscode(null); setIsAppUnlocked(true);
        setShowPasscodeModal(false); setPasscodeInputStr('');
      } else { setPasscodeError(true); setPasscodeInputStr(''); }
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInputStr.length === 4) {
      validatePasscode(passcodeInputStr);
    }
  };

  useEffect(() => {
    if (passcodeInputStr.length === 4) {
      const timer = setTimeout(() => validatePasscode(passcodeInputStr), 150);
      return () => clearTimeout(timer);
    }
  }, [passcode, passcodeMode, passcodeInputStr]);

  const getBirthdayStatus = () => {
    if (!activeProfile.dob) return 'NONE';
    const today = new Date(); const dob = new Date(activeProfile.dob);
    if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) return 'TODAY';
    return 'NONE';
  };

  const navItems: { id: TabView; icon: React.ElementType; label: keyof typeof translations }[] = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: SettingsIcon, label: 'nav_settings' },
  ];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>;
  
  if (!session && !isGuestMode) return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={handleGuestLogin} />;
  
  if (isInitialLoading || profiles === undefined) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center p-6">
            <div className="relative mb-8">
               <div className="w-20 h-20 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin" />
               <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-widest">{t('syncing_data')}</h2>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 max-w-xs">{loadingStatus || t('welcome_subtitle')}</p>
        </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>}>
        <Onboarding language={language} onCreateProfile={handleCreateFirstProfile} onLogout={handleLogout} />
      </Suspense>
    );
  }

  if (dbError) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center p-8">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10 text-rose-500">
                <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest">{language === 'mm' ? 'ဒေတာဘေ့စ် အမှားရှိနေပါသည်' : 'Database Error'}</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 max-w-sm mb-8 shadow-sm">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">{dbError}</p>
                <div className="text-xs text-slate-400 dark:text-slate-500 text-left space-y-2">
                    <p>• {language === 'mm' ? 'Incognito Mode ကို ပိတ်ပြီး ပြန်ဖွင့်ကြည့်ပါ။' : 'Make sure you are NOT in Incognito mode.'}</p>
                    <p>• {language === 'mm' ? 'ဖုန်းမှ Storage နေရာလွတ် ရှိမရှိ စစ်ဆေးပါ။' : 'Check if your device storage is full.'}</p>
                    <p>• {language === 'mm' ? 'Browser ကို Refresh လုပ်ကြည့်ပါ။' : 'Try refreshing the browser.'}</p>
                </div>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={() => window.location.reload()} className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">{language === 'mm' ? 'ပြန်လည်စတင်မည်' : 'Retry'}</button>
                <button onClick={() => { if (confirm(language === 'mm' ? "App ကို Reset လုပ်မှာ သေချာပါသလား?" : "Are you sure?")) { resetDatabase(); } }} className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all">{language === 'mm' ? 'App ကို Reset လုပ်မည်' : 'Reset App'}</button>
            </div>
        </div>
    );
  }

  const renderContent = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin"/></div>;
    const bStatus = getBirthdayStatus();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysReminders = reminders.filter(r => r.date === todayStr);
    const latestMemory = memories[0];

    const getHeroImage = (mem: Memory) => {
        if (mem.imageUrls && mem.imageUrls.length > 0) return mem.imageUrls[0];
        return mem.imageUrl || null;
    };

    switch (activeTab) {
      case TabView.HOME:
        const heroImg = latestMemory ? getHeroImage(latestMemory) : null;
        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in">
            {remindersEnabled && (
               <div className="space-y-3">
                  {bStatus === 'TODAY' && showBirthdayBanner && (
                    <div className="bg-gradient-to-r from-rose-400 to-pink-500 p-5 rounded-[32px] text-white shadow-lg relative overflow-hidden animate-zoom-in">
                       <button onClick={() => setShowBirthdayBanner(false)} className="absolute top-4 right-4 text-white/60"><X className="w-5 h-5"/></button>
                       <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Gift className="w-6 h-6 animate-bounce" /></div>
                          <div><h3 className="font-black text-lg leading-none">{t('happy_birthday_title')}</h3><p className="text-xs opacity-90 mt-1">{t('happy_birthday_msg').replace('{name}', activeProfile.name)}</p></div>
                       </div>
                    </div>
                  )}
                  {todaysReminders.map(rem => (
                    <div key={rem.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 animate-slide-up">
                       <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl flex items-center justify-center"><Bell className="w-5 h-5"/></div>
                       <div><h4 className="font-black text-slate-800 dark:text-white text-sm">{rem.title}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">Today</p></div>
                    </div>
                  ))}
               </div>
            )}
            <div className="flex justify-between items-center mb-2 mt-4">
               <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}</h1>
                  <div className="flex items-center gap-3">
                      <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">{new Date().toLocaleDateString('en-GB')}</p>
                      {(syncState.status === 'syncing' || syncState.status === 'success') && (
                          <div className={`flex items-center gap-1.5 ${syncState.status === 'success' ? 'text-emerald-500' : 'text-sky-500'} animate-fade-in`}>
                              {syncState.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <RefreshCw className="w-3 h-3 animate-spin" />}
                              <span className="text-[10px] font-black uppercase tracking-widest">{syncState.status === 'success' ? 'Updated' : t('sync_now')}...</span>
                          </div>
                      )}
                  </div>
               </div>
               {activeProfile.profileImage && (<div className="w-12 h-12 rounded-[20px] overflow-hidden border-2 border-white dark:border-slate-700 shadow-md"><img src={getImageSrc(activeProfile.profileImage)} className="w-full h-full object-cover" /></div>)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-2">
              <div className="md:col-span-2">
                  {latestMemory && heroImg ? (
                      <div className="relative h-72 md:h-96 rounded-[40px] overflow-hidden shadow-lg group cursor-pointer border border-transparent dark:border-slate-700 transition-transform active:scale-95" onClick={() => setSelectedMemory(latestMemory)}>
                        <img src={getImageSrc(heroImg)} className="w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-8 pointer-events-none">
                          <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full w-fit mb-3 uppercase tracking-widest shadow-lg">{t('latest_arrival')}</span>
                          <h3 className="text-white text-2xl font-black leading-tight">{latestMemory.title}</h3>
                        </div>
                      </div>
                  ) : (
                    <div className="h-72 md:h-96 rounded-[40px] bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2"><ImageIcon className="w-12 h-12 opacity-20" /><p className="font-bold text-sm">{t('no_photos')}</p></div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-1 md:col-span-1 md:gap-6">
                  <div onClick={() => setActiveTab(TabView.STORY)} className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] p-6 text-white flex flex-col justify-between aspect-square md:aspect-auto shadow-xl cursor-pointer transition-all relative overflow-hidden active:scale-95"><Sparkles className="w-8 h-8 text-indigo-200 opacity-60 transition-transform" /><h3 className="font-black text-xl leading-tight relative z-10">{t('create_story')}</h3><div className="absolute -bottom-4 -right-4 opacity-10"><BookOpen className="w-32 h-32" /></div></div>
                  <div onClick={() => setActiveTab(TabView.GROWTH)} className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[40px] p-6 flex flex-col justify-between aspect-square md:aspect-auto shadow-xl cursor-pointer active:scale-95"><Activity className="w-8 h-8 text-teal-500" /><div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('current_height')}</p><h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">{growthData[growthData.length-1]?.height || 0} <span className="text-sm font-bold text-slate-400">cm</span></h3></div></div>
              </div>
            </div>

            <div className="mt-8 animate-slide-up">
              <div className="flex justify-between items-center mb-5 px-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{t('memories')}</h3>
                <button onClick={() => setActiveTab(TabView.GALLERY)} className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{t('see_all')}</button>
              </div>
              <div className="space-y-3">
                 {memories.slice(0, 4).map(m => {
                    const thumb = getHeroImage(m);
                    return (
                      <div key={m.id} onClick={() => setSelectedMemory(m)} className="bg-white dark:bg-slate-800 p-2.5 rounded-[32px] border border-slate-50 dark:border-slate-700 flex items-center gap-3.5 active:scale-[0.98] transition-all cursor-pointer shadow-sm group overflow-hidden">
                         <div className="w-14 h-14 rounded-[18px] overflow-hidden shrink-0 shadow-sm border border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          {thumb ? (<img src={getImageSrc(thumb)} className="w-full h-full object-cover" />) : (<ImageIcon className="w-8 h-8 text-slate-300"/>)}
                         </div>
                         <div className="flex-1 min-w-0 overflow-hidden text-left">
                            <h4 className="font-black text-slate-800 dark:text-white truncate text-sm tracking-tight leading-none mb-1.5 w-full pr-2">{m.title}</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.date}</p>
                         </div>
                         <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 group-hover:text-primary transition-all shrink-0"><ChevronRight className="w-4.5 h-4.5" /></div>
                      </div>
                    );
                 })}
              </div>
            </div>
          </div>
        );
      case TabView.GALLERY:
        return <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} activeProfileId={activeProfileId} requestDeleteConfirmation={requestDeleteConfirmation} />;
      case TabView.ADD_MEMORY:
        return <AddMemory language={language} activeProfileId={activeProfileId} editMemory={editingMemory} onSaveComplete={() => { triggerSuccess(editingMemory ? 'update_success' : 'save_success'); setEditingMemory(null); setActiveTab(TabView.HOME); }} onCancel={() => { setEditingMemory(null); setActiveTab(TabView.HOME); }} session={session} />;
      case TabView.STORY:
        return <StoryGenerator language={language} activeProfileId={activeProfileId} defaultChildName={activeProfile.name} onSaveComplete={() => { triggerSuccess('save_success'); setActiveTab(TabView.HOME); }} />;
      case TabView.GROWTH:
        return (
            <div><h1 className="text-2xl font-black mb-6 text-slate-800 dark:text-slate-100">{t('growth_title')}</h1><GrowthChart data={growthData} language={language} /></div>
        );
      case TabView.SETTINGS:
        return (
          <SettingsComponent 
            language={language} setLanguage={setLanguage} theme={theme} toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            profiles={profiles} activeProfileId={activeProfileId} onProfileChange={handleProfileChange} onRefreshData={async () => {}}
            passcode={passcode} isDetailsUnlocked={isAppUnlocked} onUnlockRequest={() => { setPasscodeMode('UNLOCK'); setShowPasscodeModal(true); }}
            onPasscodeSetup={() => { setPasscodeMode('SETUP'); setShowPasscodeModal(true); }}
            onPasscodeChange={() => { setPasscodeMode('CHANGE_VERIFY'); setShowPasscodeModal(true); }}
            onPasscodeRemove={() => { setPasscodeMode('REMOVE'); setShowPasscodeModal(true); }}
            onHideDetails={() => setIsAppUnlocked(false)}
            growthData={growthData} memories={memories} stories={stories}
            onEditMemory={(m) => { setEditingMemory(m); setActiveTab(TabView.ADD_MEMORY); }}
            onDeleteMemory={(id) => requestDeleteConfirmation(() => DataService.deleteMemory(id))}
            onStoryClick={setSelectedStory}
            onDeleteStory={(id) => requestDeleteConfirmation(() => DataService.deleteStory(id))}
            onDeleteGrowth={(id) => requestDeleteConfirmation(() => DataService.deleteGrowth(id))}
            onSaveGrowth={handleSaveGrowth}
            onDeleteProfile={(id) => requestDeleteConfirmation(() => DataService.deleteProfile(id))}
            isGuestMode={isGuestMode} onLogout={handleLogout}
            remindersEnabled={remindersEnabled} toggleReminders={() => { const next = !remindersEnabled; setRemindersEnabled(next); localStorage.setItem('reminders_enabled', String(next)); }}
            remindersList={reminders}
            onDeleteReminder={(id) => DataService.deleteReminder(id)}
            onSaveReminder={(r) => DataService.saveReminder(r)}
            onSaveSuccess={() => triggerSuccess('save_success')}
            session={session}
            onViewCloudPhoto={(url, name) => setCloudPhoto({ url, name })}
            cloudRefreshTrigger={cloudRefreshTrigger}
          />
        );
      default:
        return null;
    }
  };

  const activeTabIndex = navItems.findIndex(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-slate-900 transition-colors">
      <main className="max-w-5xl mx-auto px-5 pt-4 md:pt-8 relative min-h-screen">
        <Suspense fallback={<div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
           {renderContent()}
        </Suspense>
      </main>

      {/* SUCCESS NOTIFICATION - FLOATING TOP CENTER */}
      {successMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[2000000] animate-slide-down w-full max-w-xs px-4">
           <div className="bg-emerald-500/90 dark:bg-emerald-600/90 backdrop-blur-xl text-white px-6 py-4 rounded-[28px] font-black text-xs uppercase tracking-[0.15em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 border border-emerald-400/20">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="truncate">{successMessage}</span>
           </div>
        </div>
      )}

      {/* UPLOAD STATUS BAR - FLOATING TOP CENTER (Positions below success if present) */}
      {uploadProgress >= 0 && (
          <div className={`fixed ${successMessage ? 'top-28' : 'top-8'} left-1/2 -translate-x-1/2 z-[1999999] w-full max-w-[280px] px-4 animate-slide-down transition-all duration-500`}>
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl p-4 rounded-[32px] shadow-[0_25px_50px_rgba(0,0,0,0.1)] border border-slate-100/50 dark:border-slate-700/50">
               <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{t('uploading')}</span>
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    <span className="text-[11px] font-black text-primary">{Math.round(uploadProgress)}%</span>
                  </div>
               </div>
               <div className="h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(255,154,162,0.5)]" style={{ width: `${uploadProgress}%` }} />
               </div>
            </div>
          </div>
      )}

      {showPasscodeModal && (
        <div className="fixed inset-0 z-[2000000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-xs text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
               <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">
              {passcodeMode === 'UNLOCK' ? t('enter_passcode') : (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW' ? t('create_passcode') : (passcodeMode === 'CHANGE_VERIFY' ? t('enter_old_passcode') : t('enter_passcode')))}
            </h3>
            {passcodeError && <p className="text-rose-400 text-xs font-bold mb-6 animate-shake">{t('wrong_passcode')}</p>}
            
            <form onSubmit={handlePasscodeSubmit} className="relative mb-8">
              <div className="flex justify-center gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${passcodeInputStr.length > i ? 'bg-primary border-primary scale-110' : 'border-white/20'}`} />
                ))}
              </div>
              <input 
                type="password" pattern="[0-9]*" inputMode="numeric" autoFocus maxLength={4}
                value={passcodeInputStr} onChange={(e) => setPasscodeInputStr(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                className="absolute inset-0 opacity-0 cursor-default"
              />
            </form>
            <button onClick={() => { setShowPasscodeModal(false); setPasscodeInputStr(''); setPasscodeError(false); }} className="text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">{t('cancel_btn')}</button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[2000000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-[40px] p-8 text-center shadow-2xl border border-white/10 animate-zoom-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('delete_title')}</h3>
            <p className="text-xs font-bold text-slate-400 leading-relaxed mb-8">{t('confirm_delete')}</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDelete} className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all uppercase tracking-widest text-[11px]">{t('delete')}</button>
              <button onClick={() => setShowConfirmModal(false)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">{t('cancel_btn')}</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-[100000] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div className="max-w-md mx-auto relative pointer-events-auto">
          <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-3xl rounded-[32px] p-2 flex justify-between items-center shadow-[0_25px_50px_rgba(0,0,0,0.15)] border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
            
            <div 
              className="absolute top-2 bottom-2 transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              style={{ 
                width: `calc((100% - 16px) / ${navItems.length})`,
                left: `calc(8px + (${activeTabIndex} * (100% - 16px) / ${navItems.length}))` 
              }}
            >
               <div className="w-full h-full bg-primary/10 dark:bg-primary/20 rounded-[24px]" />
            </div>

            {navItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                className={`relative z-10 flex-1 flex flex-col items-center py-3 rounded-[24px] transition-all duration-500 active:scale-90 group ${activeTab === item.id ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <item.icon className={`w-6 h-6 transition-all duration-500 ${activeTab === item.id ? 'scale-110 stroke-[2.5px]' : 'group-hover:scale-105'}`} />
              </button>
            ))}
          </div>
        </div>
      </nav>

      <Suspense fallback={null}>
        {selectedMemory && <MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} />}
        {selectedStory && <StoryDetailModal story={selectedStory} language={language} onClose={() => setSelectedStory(null)} onDelete={() => requestDeleteConfirmation(() => DataService.deleteStory(selectedStory.id))} />}
        {cloudPhoto && <CloudPhotoModal url={cloudPhoto.url} data={null} isLoading={false} language={language} onClose={() => setCloudPhoto(null)} onDelete={async () => {
             if (confirm(t('confirm_delete'))) {
                 const res = await DataService.deleteCloudPhoto(session.user.id, activeProfileId, cloudPhoto.name);
                 if (res.success) { triggerSuccess('delete_success'); setCloudRefreshTrigger(prev => prev + 1); setCloudPhoto(null); }
                 else { alert(res.error || "Failed to delete from cloud"); }
             }
        }} />}
      </Suspense>
    </div>
  );
}

export default App;
