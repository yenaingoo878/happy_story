
import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete, Bell, Lock, ChevronLeft, Sun, Moon, Keyboard, ShieldCheck, CheckCircle2, Plus, LayoutDashboard } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory').then(module => ({ default: module.AddMemory })));
const SettingsComponent = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
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

  const profiles = useLiveQuery(() => DataService.getProfiles(), []) || [];
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
    if (profiles.length > 0 && !activeProfileId) {
        setActiveProfileId(profiles[0].id!);
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    if (!session?.user?.id || !isSupabaseConfigured()) return;
    const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            syncData().catch(err => console.error("Realtime sync pull failed:", err));
        })
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // OPTIMIZED STARTUP: Skip blocking sync if local data exists
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

            // Check if we have any child profiles locally
            const profileCount = await db.profiles.count();
            const initialSyncDone = localStorage.getItem('initial_sync_done') === 'true';

            // IF returning user (has local data), enter app immediately
            if (profileCount > 0 && initialSyncDone) {
                setIsInitialLoading(false);
                // Background sync only
                if (navigator.onLine && session && isSupabaseConfigured()) {
                    syncData().catch(e => console.warn("Background sync failed", e));
                }
            } else {
                // IF new user (no local data), we MUST wait for the first sync to see their data
                if (navigator.onLine && session && isSupabaseConfigured()) {
                    setLoadingStatus(language === 'mm' ? 'Cloud မှ အချက်အလက်များကို ရယူနေသည်...' : 'First-time sync...');
                    await syncData();
                    localStorage.setItem('initial_sync_done', 'true');
                }
                setIsInitialLoading(false);
            }
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
  }, [session, isGuestMode]);

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

  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

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

  const handleProfileChange = (id: string) => { setActiveProfileId(id); };

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

  useEffect(() => {
    if (passcodeInputStr.length === 4) {
      const timer = setTimeout(() => validatePasscode(passcodeInputStr), 150);
      return () => clearTimeout(timer);
    }
  }, [passcode, passcodeMode, passcodeInputStr]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInputStr.length === 4) validatePasscode(passcodeInputStr);
  };

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
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>;
  if (!session && !isGuestMode) return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={handleGuestLogin} />;
  
  if (dbError) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center p-8">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2.5rem] flex items-center justify-center mb-8 text-rose-500">
                <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">{language === 'mm' ? 'ဒေတာဘေ့စ် အမှားရှိနေပါသည်' : 'Database Error'}</h2>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-primary text-white font-black rounded-2xl">Retry</button>
        </div>
    );
  }

  if (isInitialLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center p-6">
            <div className="relative mb-8">
               <div className="w-20 h-20 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin" />
               <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-widest">{t('syncing_data')}</h2>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 max-w-xs">{loadingStatus}</p>
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
        if (mem.imageUrl) return mem.imageUrl;
        return null;
    };

    switch (activeTab) {
      case TabView.HOME:
        const heroImg = latestMemory ? getHeroImage(latestMemory) : null;
        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in max-w-6xl mx-auto">
            {remindersEnabled && (
               <div className="space-y-3">
                  {bStatus === 'TODAY' && showBirthdayBanner && (
                    <div className="bg-gradient-to-r from-rose-400 to-pink-500 p-5 rounded-[32px] text-white shadow-lg relative overflow-hidden">
                       <button onClick={() => setShowBirthdayBanner(false)} className="absolute top-4 right-4 text-white/60"><X className="w-5 h-5"/></button>
                       <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Gift className="w-6 h-6 animate-bounce" /></div>
                          <div><h3 className="font-black text-lg leading-none">{t('happy_birthday_title')}</h3><p className="text-xs opacity-90 mt-1">{t('happy_birthday_msg').replace('{name}', activeProfile.name)}</p></div>
                       </div>
                    </div>
                  )}
                  {todaysReminders.map(rem => (
                    <div key={rem.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                       <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl flex items-center justify-center"><Bell className="w-5 h-5"/></div>
                       <div><h4 className="font-black text-slate-800 dark:text-white text-sm">{rem.title}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">Today</p></div>
                    </div>
                  ))}
               </div>
            )}
            <div className="flex justify-between items-center mb-2">
               <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}</h1>
                  <div className="flex items-center gap-3">
                      <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">{new Date().toLocaleDateString('en-GB')}</p>
                      {syncState.status === 'syncing' && (
                          <div className="flex items-center gap-1.5 text-sky-500 animate-fade-in">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t('sync_now')}...</span>
                          </div>
                      )}
                  </div>
               </div>
               {activeProfile.profileImage && (<div className="w-12 h-12 rounded-[20px] overflow-hidden border-2 border-white dark:border-slate-700 shadow-md"><img src={getImageSrc(activeProfile.profileImage)} className="w-full h-full object-cover" /></div>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-2">
              <div className="md:col-span-2">
                  {latestMemory && heroImg ? (
                      <div className="relative h-72 md:h-96 rounded-[40px] overflow-hidden shadow-lg group cursor-pointer active:scale-95" onClick={() => setSelectedMemory(latestMemory)}>
                        <img src={getImageSrc(heroImg)} className="w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-8 pointer-events-none">
                          <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full w-fit mb-3 uppercase tracking-widest">{t('latest_arrival')}</span>
                          <h3 className="text-white text-2xl font-black leading-tight">{latestMemory.title}</h3>
                        </div>
                      </div>
                  ) : (
                    <div className="h-72 md:h-96 rounded-[40px] bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2"><ImageIcon className="w-12 h-12 opacity-20" /><p className="font-bold text-sm">{t('no_photos')}</p></div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-1 md:col-span-1 md:gap-6">
                  <div onClick={() => setActiveTab(TabView.STORY)} className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] p-6 text-white flex flex-col justify-between shadow-xl cursor-pointer active:scale-95 transition-all"><Sparkles className="w-8 h-8 text-indigo-200 opacity-60" /><h3 className="font-black text-xl leading-tight">{t('create_story')}</h3></div>
                  <div onClick={() => setActiveTab(TabView.GROWTH)} className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[40px] p-6 flex flex-col justify-between shadow-xl cursor-pointer active:scale-95"><Activity className="w-8 h-8 text-teal-500" /><div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('current_height')}</p><h3 className="font-black text-slate-800 dark:text-white text-2xl">{growthData[growthData.length-1]?.height || 0} cm</h3></div></div>
              </div>
            </div>
            <div className="mt-8 animate-slide-up">
              <div className="flex justify-between items-center mb-5 px-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{t('memories')}</h3>
                <button onClick={() => setActiveTab(TabView.GALLERY)} className="text-[11px] font-black text-primary uppercase">{t('see_all')}</button>
              </div>
              <div className="space-y-3">
                 {memories.slice(0, 4).map(m => {
                    const thumb = getHeroImage(m);
                    return (
                      <div key={m.id} onClick={() => setSelectedMemory(m)} className="bg-white dark:bg-slate-800 p-2.5 rounded-[32px] border border-slate-50 dark:border-slate-700 flex items-center gap-3.5 active:scale-[0.98] transition-all cursor-pointer shadow-sm group overflow-hidden">
                         <div className="w-14 h-14 rounded-[18px] overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-900">
                          {thumb ? (<img src={getImageSrc(thumb)} className="w-full h-full object-cover" />) : (<ImageIcon className="w-8 h-8 text-slate-300"/>)}
                         </div>
                         <div className="flex-1 min-w-0 overflow-hidden text-left">
                            <h4 className="font-black text-slate-800 dark:text-white truncate text-sm mb-1.5">{m.title}</h4>
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
      default:
        return (
            <div className="pb-32 md:pb-8 animate-fade-in max-w-6xl mx-auto">
              <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
                {activeTab === TabView.ADD_MEMORY && <AddMemory language={language} activeProfileId={activeProfileId} editMemory={editingMemory} onSaveComplete={() => { triggerSuccess(editingMemory ? 'update_success' : 'save_success'); setEditingMemory(null); setActiveTab(TabView.HOME); }} onCancel={() => { setEditingMemory(null); setActiveTab(TabView.HOME); }} session={session} />}
                {activeTab === TabView.STORY && <StoryGenerator language={language} activeProfileId={activeProfileId} defaultChildName={activeProfile.name} onSaveComplete={() => { triggerSuccess('save_success'); setActiveTab(TabView.HOME); }} />}
                {activeTab === TabView.GROWTH && <div className="max-w-4xl mx-auto"><h1 className="text-2xl font-black mb-6 text-slate-800 dark:text-slate-100">{t('growth_title')}</h1><GrowthChart data={growthData} language={language} /></div>}
                {activeTab === TabView.GALLERY && <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} userId={session?.user?.id} activeProfileId={activeProfileId} requestDeleteConfirmation={requestDeleteConfirmation} />}
                {activeTab === TabView.SETTINGS && (
                  <SettingsComponent 
                    language={language} setLanguage={setLanguage} theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                    profiles={profiles} activeProfileId={activeProfileId} onProfileChange={handleProfileChange} onRefreshData={async () => { await syncData(); }} 
                    passcode={passcode} isDetailsUnlocked={isAppUnlocked} onUnlockRequest={() => { setPasscodeMode('UNLOCK'); setShowPasscodeModal(true); }} 
                    onPasscodeSetup={() => { setPasscodeMode('SETUP'); setShowPasscodeModal(true); }} onPasscodeChange={() => { setPasscodeMode('CHANGE_VERIFY'); setShowPasscodeModal(true); }} 
                    onPasscodeRemove={() => { setPasscodeMode('REMOVE'); setShowPasscodeModal(true); }} onHideDetails={() => setIsAppUnlocked(false)} 
                    growthData={growthData} memories={memories} stories={stories} 
                    onEditMemory={(m) => { setEditingMemory(m); setActiveTab(TabView.ADD_MEMORY); }} 
                    onDeleteMemory={(id) => requestDeleteConfirmation(() => DataService.deleteMemory(id))} 
                    onStoryClick={setSelectedStory} 
                    onDeleteStory={(id) => requestDeleteConfirmation(() => DataService.deleteStory(id))}
                    onDeleteGrowth={(id) => requestDeleteConfirmation(() => DataService.deleteGrowth(id))}
                    onSaveGrowth={handleSaveGrowth}
                    onDeleteProfile={(id) => requestDeleteConfirmation(() => DataService.deleteProfile(id))} 
                    isGuestMode={isGuestMode} onLogout={handleLogout} remindersEnabled={remindersEnabled} 
                    toggleReminders={() => { const next = !remindersEnabled; setRemindersEnabled(next); localStorage.setItem('reminders_enabled', String(next)); }} 
                    remindersList={reminders} 
                    onDeleteReminder={(id) => requestDeleteConfirmation(() => DataService.deleteReminder(id))} 
                    onSaveReminder={async (rem) => { await DataService.saveReminder(rem); triggerSuccess('profile_saved'); }}
                    onSaveSuccess={() => triggerSuccess('profile_saved')}
                    session={session}
                    onViewCloudPhoto={(url, name) => setCloudPhoto({ url, name })}
                    cloudRefreshTrigger={cloudRefreshTrigger}
                  />
                )}
              </Suspense>
            </div>
        );
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-50'} transition-colors duration-500 font-sans pb-24 lg:pb-0 lg:flex`}>
      {successMessage && (
        <div className="fixed top-8 inset-x-0 z-[2000000] flex justify-center pointer-events-none px-4 animate-fade-in lg:left-80">
          <div className="bg-emerald-500 text-white px-8 py-3.5 rounded-full shadow-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{successMessage}</span>
          </div>
        </div>
      )}
      {syncState.status === 'syncing' && (
        <div className="fixed top-0 left-0 right-0 z-[101] h-1.5 bg-slate-100 dark:bg-slate-800 lg:left-80">
          <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${syncState.progress}%` }} />
        </div>
      )}
      <aside className="hidden lg:flex flex-col w-64 fixed top-6 bottom-6 left-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-[48px] border border-slate-100 dark:border-slate-700 shadow-xl z-40 overflow-hidden">
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
             <img src="/logo.png" className="w-7 h-7 object-contain" alt="Logo"/>
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none">Little Moments</h2>
        </div>
        <div className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-[22px] transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
              <tab.icon className="w-4.5 h-4.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t(tab.label)}</span>
            </button>
          ))}
        </div>
        <div className="p-6">
           <button onClick={handleLogout} className="w-full py-3.5 flex items-center justify-center gap-3 text-rose-500 bg-rose-50/50 dark:bg-rose-900/10 rounded-[22px] text-[9px] font-black uppercase tracking-widest"><LogOut className="w-3.5 h-3.5" />{t('logout')}</button>
        </div>
      </aside>
      <main className="flex-1 lg:ml-80 container mx-auto px-4 pt-6 md:pt-12">
        {renderContent()}
      </main>
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-xl flex justify-around items-center px-4 z-40 lg:hidden">
        {navItems.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === tab.id ? 'text-primary scale-110' : 'text-slate-400'}`}>
            <tab.icon className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">{t(tab.label)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
