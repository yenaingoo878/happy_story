import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete, Bell, Lock, ChevronLeft, Sun, Moon, Keyboard, ShieldCheck, CheckCircle2 } from 'lucide-react';

const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory').then(module => ({ default: module.AddMemory })));
const SettingsComponent = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));
const StoryDetailModal = React.lazy(() => import('./components/StoryDetailModal').then(module => ({ default: module.StoryDetailModal })));
const Onboarding = React.lazy(() => import('./components/Onboarding').then(module => ({ default: module.Onboarding })));
const CreateFirstProfile = React.lazy(() => import('./components/CreateFirstProfile').then(module => ({ default: module.default })));


import { AuthScreen } from './components/AuthScreen';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData, Reminder, Story } from './types';
import { getTranslation, translations } from './utils/translations';
import { initDB, DataService, syncData, getImageSrc, fetchServerProfiles } from './lib/db';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { uploadManager } from './lib/uploadManager';
import { syncManager } from './lib/syncManager';
import { initializeAntiInspect } from './lib/security';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem('guest_mode') === 'true');
  const [authLoading, setAuthLoading] = useState(true);

  // Passcode states
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');

  const [deleteCallback, setDeleteCallback] = useState<(() => Promise<any>) | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => localStorage.getItem('reminders_enabled') !== 'false');
  const [showBirthdayBanner, setShowBirthdayBanner] = useState(true);

  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'mm');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  const [uploadProgress, setUploadProgress] = useState(-1);
  const [syncState, setSyncState] = useState({ status: 'idle', progress: 0, total: 0, completed: 0 });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerSuccess = (messageKey: keyof typeof translations) => {
    setSuccessMessage(t(messageKey));
    setTimeout(() => setSuccessMessage(null), 2500);
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
    
    // FIX: Use Supabase v2-compatible onAuthStateChange, which fires immediately with the session.
    // This resolves errors from using deprecated v1 methods like supabase.auth.session().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  const createDefaultProfile = async () => {
    const defaultName = getTranslation(language, 'default_child_name');
    const defaultProfile: ChildProfile = { 
        id: crypto.randomUUID(), 
        name: defaultName, 
        dob: new Date().toISOString().split('T')[0], 
        gender: 'boy' 
    };
    await DataService.saveProfile(defaultProfile);
    await refreshData();
  };

  useEffect(() => {
    if (session || isGuestMode) {
        const initialLoad = async () => {
          await initDB();

          if (isGuestMode) {
            setIsInitialLoading(true);
            await refreshData();
            setIsInitialLoading(false);
            return;
          }

          // Logged-in user flow
          const userId = session.user.id;
          const syncFlagKey = `hasCompletedFirstSync_${userId}`;
          const firstSyncSetting = await DataService.getSetting(syncFlagKey);
          const hasSyncedBefore = firstSyncSetting?.value === true;

          if (!hasSyncedBefore) {
            setIsInitialLoading(true); // Show loading screen
            
            let serverProfiles: ChildProfile[] = [];
            if (navigator.onLine) {
                // Directly check the server for profiles first.
                serverProfiles = await fetchServerProfiles();
            }

            if (serverProfiles.length > 0) {
                // Profiles exist on the server. Now perform a full sync to get all data.
                if (navigator.onLine) {
                    await syncData();
                }
                await refreshData(); // Load all data from local DB into state.
            } else {
                // No profiles found on the server. We can safely show the 'Create Profile' screen.
                setProfiles([]);
            }

            await DataService.saveSetting(syncFlagKey, true);
            setIsInitialLoading(false);
          } else {
            // Subsequent app open. Load local data first for speed.
            setIsInitialLoading(true);
            await refreshData();
            setIsInitialLoading(false);

            // Then, trigger a non-blocking background sync.
            if (navigator.onLine) {
              syncData().then(() => {
                refreshData(); 
              });
            }
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
            syncData().then(() => { refreshData(); });
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

  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const strs = await DataService.getStories(childId);
      const growth = await DataService.getGrowth(childId);
      const rems = await DataService.getReminders();
      setMemories(mems); setStories(strs); setGrowthData(growth); setReminders(rems);
  };

  const refreshData = async () => {
    const fetchedProfiles = await DataService.getProfiles();
    setProfiles(fetchedProfiles);

    let targetId = activeProfileId;
    if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) {
        targetId = fetchedProfiles.length > 0 ? fetchedProfiles[0].id! : '';
        setActiveProfileId(targetId);
    }

    if (targetId) {
        await loadChildData(targetId);
    } else {
        setMemories([]);
        setStories([]);
        setGrowthData([]);
    }
  };

  const handleProfileChange = async (id: string) => {
    setIsLoading(true);
    setActiveProfileId(id);
    await loadChildData(id);
    setIsLoading(false);
  };

  const handleGuestLogin = async () => {
    await DataService.clearAllUserData();
    setProfiles([]); setMemories([]); setStories([]); setGrowthData([]); setReminders([]);
    setActiveTab(TabView.HOME);
    setIsGuestMode(true);
    localStorage.setItem('guest_mode', 'true');
  };

  const handleLogout = async () => {
      try { 
        if (session && isSupabaseConfigured()) await supabase.auth.signOut(); 
      } catch (e) {
        console.error("Error signing out:", e);
      } finally {
        await DataService.clearAllUserData(); 
        localStorage.removeItem('guest_mode');
        setIsGuestMode(false); setSession(null); setProfiles([]); setMemories([]); setStories([]); 
        setGrowthData([]); setReminders([]); setActiveTab(TabView.HOME); setIsAppUnlocked(false); 
        setShowPasscodeModal(false);
      }
  };

  const handleSaveGrowth = async (data: GrowthData) => {
      await DataService.saveGrowth(data);
      await refreshData();
      triggerSuccess('profile_saved');
  };

  const requestDeleteConfirmation = (onConfirm: () => Promise<any>) => {
      setDeleteCallback(() => onConfirm);
      setShowConfirmModal(true);
  };

  const executeDelete = async () => {
    if (!deleteCallback) return;
    
    try {
      await deleteCallback();
      triggerSuccess('delete_success');
      await refreshData();
    } catch (e) {
      console.error("Deletion failed:", e);
      alert(t('delete_error_fallback'));
    } finally {
      setShowConfirmModal(false);
      setDeleteCallback(null);
    }
  };

  const validatePasscode = (code: string) => {
    if (code.length !== 4) return;
    
    setPasscodeError(false);
    if (passcodeMode === 'UNLOCK') {
      if (code === passcode) { setIsAppUnlocked(true); setShowPasscodeModal(false); setPasscodeInput(''); }
      else { setPasscodeError(true); setPasscodeInput(''); }
    } else if (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW') {
      localStorage.setItem('app_passcode', code); setPasscode(code); setIsAppUnlocked(true);
      setShowPasscodeModal(false); setPasscodeInput('');
    } else if (passcodeMode === 'CHANGE_VERIFY') {
      if (code === passcode) { setPasscodeMode('CHANGE_NEW'); setPasscodeInput(''); }
      else { setPasscodeError(true); setPasscodeInput(''); }
    } else if (passcodeMode === 'REMOVE') {
      if (code === passcode) {
        localStorage.removeItem('app_passcode'); setPasscode(null); setIsAppUnlocked(true);
        setShowPasscodeModal(false); setPasscodeInput('');
      } else { setPasscodeError(true); setPasscodeInput(''); }
    }
  };

  useEffect(() => {
    if (passcodeInput.length === 4) {
      const timer = setTimeout(() => validatePasscode(passcodeInput), 150);
      return () => clearTimeout(timer);
    }
  }, [passcodeInput]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.length === 4) validatePasscode(passcodeInput);
  };

  const getBirthdayStatus = () => {
    if (!activeProfile.dob) return 'NONE';
    const today = new Date(); const dob = new Date(activeProfile.dob);
    if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) return 'TODAY';
    return 'NONE';
  };

  const tabs: { id: TabView; icon: React.ElementType; label: keyof typeof translations }[] = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>;
  if (!session && !isGuestMode) return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={handleGuestLogin} />;
  
  if (isInitialLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="font-bold text-slate-500 dark:text-slate-400">{t('syncing_data')}</p>
        </div>
    );
  }
  
  const handleCreateFirstProfile = async (profileData: Omit<ChildProfile, 'id'>) => {
      const newProfile: ChildProfile = {
          ...profileData,
          id: crypto.randomUUID(),
      };
      await DataService.saveProfile(newProfile);
      await refreshData();
  };

  if (profiles.length === 0) {
      if (isGuestMode) {
          return (
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>}>
                  <Onboarding language={language} onCreateProfile={createDefaultProfile} />
              </Suspense>
          );
      } else {
          // New logged-in user with no profile
          return (
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>}>
                  <CreateFirstProfile language={language} onProfileCreated={handleCreateFirstProfile} />
              </Suspense>
          );
      }
  }

  const renderContent = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin"/></div>;
    const bStatus = getBirthdayStatus();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysReminders = reminders.filter(r => r.date === todayStr);
    const latestMemory = memories[0];

    switch (activeTab) {
      case TabView.HOME:
        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
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
                  {latestMemory && latestMemory.imageUrls && latestMemory.imageUrls.length > 0 ? (
                      <div className="relative h-72 md:h-96 rounded-[40px] overflow-hidden shadow-lg group cursor-pointer border border-transparent dark:border-slate-700 transition-transform active:scale-95" onClick={() => setSelectedMemory(latestMemory)}>
                        <img src={getImageSrc(latestMemory.imageUrls[0])} className="w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-110" />
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
                 {memories.slice(0, 4).map(m => (
                    <div key={m.id} onClick={() => setSelectedMemory(m)} className="bg-white dark:bg-slate-800 p-2.5 rounded-[32px] border border-slate-50 dark:border-slate-700 flex items-center gap-3.5 active:scale-[0.98] transition-all cursor-pointer shadow-sm group">
                       <div className="w-14 h-14 rounded-[18px] overflow-hidden shrink-0 shadow-sm border border-slate-50 dark:border-slate-700">
                        {m.imageUrls && m.imageUrls.length > 0 ? (<img src={getImageSrc(m.imageUrls[0])} className="w-full h-full object-cover" />) : (<ImageIcon className="w-8 h-8 text-slate-300"/>)}
                       </div>
                       <div className="flex-1 min-w-0"><h4 className="font-black text-slate-800 dark:text-white truncate text-sm tracking-tight leading-none mb-1.5">{m.title}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.date}</p></div>
                       <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 group-hover:text-primary transition-all"><ChevronRight className="w-4.5 h-4.5" /></div>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
            <div className="pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
              <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
                {activeTab === TabView.ADD_MEMORY && <AddMemory language={language} activeProfileId={activeProfileId} editMemory={editingMemory} onSaveComplete={async () => { await refreshData(); triggerSuccess(editingMemory ? 'update_success' : 'save_success'); setEditingMemory(null); setActiveTab(TabView.HOME); }} onCancel={() => { setEditingMemory(null); setActiveTab(TabView.HOME); }} />}
                {activeTab === TabView.STORY && <StoryGenerator language={language} activeProfileId={activeProfileId} defaultChildName={activeProfile.name} onSaveComplete={async () => { await refreshData(); triggerSuccess('save_success'); setActiveTab(TabView.HOME); }} />}
                {activeTab === TabView.GROWTH && <div className="max-w-4xl mx-auto"><h1 className="text-2xl font-black mb-6 text-slate-800 dark:text-slate-100">{t('growth_title')}</h1><GrowthChart data={growthData} language={language} /></div>}
                {activeTab === TabView.GALLERY && <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} userId={session?.user?.id} activeProfileId={activeProfileId} requestDeleteConfirmation={requestDeleteConfirmation} />}
                {activeTab === TabView.SETTINGS && (
                  <SettingsComponent 
                    language={language} setLanguage={setLanguage} theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                    profiles={profiles} activeProfileId={activeProfileId} onProfileChange={handleProfileChange} onRefreshData={refreshData} 
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
                    onSaveReminder={async (rem) => { await DataService.saveReminder(rem); await refreshData(); triggerSuccess('profile_saved'); }}
                    onSaveSuccess={() => triggerSuccess('profile_saved')}
                    session={session}
                  />
                )}
              </Suspense>
            </div>
        );
    }
  };

  const SyncProgressBar = () => {
    if (syncState.status === 'idle' || (syncState.status === 'syncing' && syncState.total === 0)) return null;

    const isSyncing = syncState.status === 'syncing';
    const isSuccess = syncState.status === 'success';

    let text, Icon, iconColorClass, bgColorClass;

    if (isSyncing) {
        text = `${t('sync_now')}...`;
        Icon = Loader2;
        iconColorClass = 'text-sky-500 animate-spin';
        bgColorClass = 'bg-sky-500/10';
    } else if (isSuccess) {
        text = `${t('sync_now')} Complete!`;
        Icon = CheckCircle2;
        iconColorClass = 'text-emerald-500';
        bgColorClass = 'bg-emerald-500/10';
    } else { // isError
        text = `${t('sync_now')} Failed!`;
        Icon = X;
        iconColorClass = 'text-rose-500';
        bgColorClass = 'bg-rose-500/10';
    }

    return (
        <div className="p-3 animate-fade-in">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl p-3 flex items-center gap-4">
                <div className={`w-10 h-10 ${bgColorClass} rounded-xl flex items-center justify-center shadow-inner shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColorClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">{text}</p>
                </div>
            </div>
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 flex flex-col md:flex-row font-sans selection:bg-primary/30 overflow-hidden transition-colors duration-300">
      {successMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] animate-fade-in pointer-events-none">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/20">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 md:left-64 w-full md:w-[calc(100%-16rem)] z-[99] pointer-events-none animate-fade-in">
          {uploadProgress > -1 && (<div className="p-3"><div className="max-w-md mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl p-3 flex items-center gap-4"><div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner shrink-0">{uploadProgress < 100 ? (<Loader2 className="w-5 h-5 animate-spin" />) : (<CheckCircle2 className="w-5 h-5" />)}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-1"><p className="text-xs font-black text-slate-800 dark:text-white truncate">{uploadProgress < 100 ? t('uploading') : t('profile_saved')}</p><p className="text-xs font-black text-primary">{Math.round(uploadProgress)}%</p></div><div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 shadow-inner"><div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div></div></div></div>)}
          <SyncProgressBar />
      </div>

      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/95 dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700 z-50 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-10 pl-2"><div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden p-1"><img src="/logo.png" className="w-full h-full object-contain" alt="Logo"/></div><h1 className="font-extrabold text-xl text-slate-800 dark:text-slate-100 tracking-tight">Little Moments</h1></div>
          <nav className="flex-1 space-y-1">{tabs.map(tab => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-95 ${isActive ? 'bg-primary/10 text-primary font-black shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:text-slate-400'}`}><tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`}/><span className="text-sm">{t(tab.label)}</span></button>); })}</nav>
      </aside>
      <main className="flex-1 px-4 sm:px-5 pt-8 min-h-screen md:ml-64 relative overflow-x-hidden">{renderContent()}</main>
      
      {showPasscodeModal && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/75 backdrop-blur-xl animate-fade-in" onClick={() => passcodeMode !== 'UNLOCK' && setShowPasscodeModal(false)}/><div className="relative bg-white dark:bg-slate-800 w-full max-w-[280px] rounded-[48px] p-8 shadow-2xl animate-zoom-in text-center border border-white/20"><div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner"><ShieldCheck className="w-8 h-8"/></div><h3 className="text-lg font-black mb-1 text-slate-800 dark:text-white uppercase tracking-widest leading-tight">{passcodeMode === 'UNLOCK' ? t('enter_passcode') : passcodeMode === 'SETUP' ? t('create_passcode') : passcodeMode === 'CHANGE_VERIFY' ? t('enter_old_passcode') : passcodeMode === 'CHANGE_NEW' ? t('enter_new_passcode') : t('enter_passcode')}</h3><p className="text-slate-400 text-[10px] font-black mb-8 uppercase tracking-[0.2em] h-4">{passcodeError ? <span className="text-rose-500">{t('wrong_passcode')}</span> : t('private_info')}</p><form onSubmit={handlePasscodeSubmit} className="space-y-8"><input autoFocus type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={passcodeInput} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setPasscodeInput(val); if (passcodeError) setPasscodeError(false);}} className="w-full text-center text-4xl tracking-[0.6em] font-black bg-slate-50 dark:bg-slate-900/50 py-5 rounded-3xl outline-none focus:ring-4 focus:ring-primary/20 transition-all border-none placeholder-slate-200 dark:placeholder-slate-800 shadow-inner" placeholder="••••" /><div className="flex flex-col gap-2"><button type="submit" disabled={passcodeInput.length < 4} className={`w-full py-4.5 rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs transition-all active:scale-95 ${passcodeInput.length === 4 ? 'bg-primary text-white shadow-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}>{t('confirm')}</button>{passcodeMode !== 'UNLOCK' && (<button type="button" onClick={() => setShowPasscodeModal(false)} className="w-full py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest active:scale-90">{t('cancel_btn')}</button>)}</div></form></div></div>)}

      {selectedMemory && (<Suspense fallback={null}><MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} /></Suspense>)}
      {selectedStory && (<Suspense fallback={null}><StoryDetailModal story={selectedStory} language={language} onClose={() => setSelectedStory(null)} onDelete={() => requestDeleteConfirmation(() => DataService.deleteStory(selectedStory.id))} /></Suspense>)}

      {showConfirmModal && (<div className="fixed inset-0 z-[110] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}/><div className="relative bg-white dark:bg-slate-800 w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-zoom-in text-center border border-white/20"><div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-rose-500"/></div><h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">{t('delete_title')}</h3><p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">{t('confirm_delete')}</p><div className="flex flex-col gap-3"><button onClick={executeDelete} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg shadow-rose-500/30 active:scale-95 transition-all">{t('confirm')}</button><button onClick={() => setShowConfirmModal(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-bold active:scale-95 transition-all">{t('cancel_btn')}</button></div></div></div>)}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[32px] p-2 flex items-center gap-1 z-50 w-[92%] md:hidden transition-all duration-300">
        {tabs.map(tab => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center justify-center h-14 rounded-3xl transition-all duration-500 active:scale-95 ${isActive ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-lg' : 'flex-1 text-slate-400'}`}><tab.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-100 stroke-[2px]'}`}/>{isActive && <span className="ml-2 text-xs font-black animate-fade-in">{t(tab.label)}</span>}</button>); })}
      </nav>
    </div>
  );
}

export default App;