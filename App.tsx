
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete, Bell, Lock, ChevronLeft, Sun, Moon } from 'lucide-react';

const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory').then(module => ({ default: module.AddMemory })));
const SettingsComponent = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));

import { AuthScreen } from './components/AuthScreen';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData, Reminder } from './types';
import { getTranslation } from './utils/translations';
import { initDB, DataService, syncData } from './lib/db';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem('guest_mode') === 'true');
  const [authLoading, setAuthLoading] = useState(true);

  // Passcode Logic
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');

  const [itemToDelete, setItemToDelete] = useState<{ type: 'MEMORY' | 'GROWTH' | 'PROFILE' | 'REMINDER', id: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [settingsInitialView, setSettingsInitialView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS'>('MAIN');

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reminders_enabled') !== 'false';
  });

  const [showBirthdayBanner, setShowBirthdayBanner] = useState(true);

  const [language, setLanguage] = useState<Language>(() => {
     return (localStorage.getItem('language') as Language) || 'mm';
  });

  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = (key: any) => getTranslation(language, key);

  useEffect(() => {
    if (!passcode) {
      setIsAppUnlocked(true);
    }
  }, [passcode]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data?.session || null);
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session || isGuestMode) {
        const loadData = async () => {
          setIsLoading(true);
          await initDB();
          await refreshData();
          setIsLoading(false);

          if (navigator.onLine && session && isSupabaseConfigured()) {
            setIsSyncing(true);
            syncData().then(() => {
              refreshData();
              setIsSyncing(false);
            }).catch(() => setIsSyncing(false));
          }
        };
        loadData();
    }
  }, [session, isGuestMode]);

  useEffect(() => {
    const handleOnline = () => { 
        setIsOnline(true); 
        if(session && isSupabaseConfigured()) {
          setIsSyncing(true);
          syncData().then(() => {
            refreshData();
            setIsSyncing(false);
          });
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

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleReminders = () => {
    const newVal = !remindersEnabled;
    setRemindersEnabled(newVal);
    localStorage.setItem('reminders_enabled', String(newVal));
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  const getBirthdayStatus = () => {
    if (!activeProfile.dob) return 'NONE';
    const today = new Date();
    const dob = new Date(activeProfile.dob);
    const isBirthdayToday = today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isBirthdayTomorrow = tomorrow.getMonth() === dob.getMonth() && tomorrow.getDate() === dob.getDate();
    if (isBirthdayToday) return 'TODAY';
    if (isBirthdayTomorrow) return 'TOMORROW';
    return 'NONE';
  };

  const getActiveReminders = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      return reminders.filter(r => r.date === todayStr);
  };

  const BirthdayCelebration = () => {
    const particles = useMemo(() => {
      const colors = ['bg-rose-400', 'bg-blue-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-violet-400', 'bg-orange-400'];
      const explosive = Array.from({ length: 60 }).map((_, i) => ({
        id: `burst-${i}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: '50%',
        top: '50%',
        delay: `${Math.random() * 0.5}s`,
        tx: `${(Math.random() - 0.5) * 800}px`,
        ty: `${(Math.random() - 0.5) * 800}px`,
        rotate: `${Math.random() * 720}deg`,
        size: `${Math.random() * 10 + 6}px`,
        type: 'burst'
      }));
      return explosive;
    }, []);

    return (
      <div className="fixed inset-0 pointer-events-none z-[1000] overflow-hidden">
        {particles.map(p => (
          <div key={p.id} className={`celebration-particle ${p.color} animate-confetti-burst`} style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay, borderRadius: '50%', '--tw-translate-x': p.tx, '--tw-translate-y': p.ty, '--tw-rotate': p.rotate } as any} />
        ))}
      </div>
    );
  };

  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const growth = await DataService.getGrowth(childId);
      const rems = await DataService.getReminders();
      setMemories(mems);
      setGrowthData(growth);
      setReminders(rems);
  };

  const refreshData = async () => {
      let fetchedProfiles = await DataService.getProfiles();
      if (fetchedProfiles.length === 0) {
          const defaultProfile: ChildProfile = {
              id: crypto.randomUUID(),
              name: 'My Child',
              dob: new Date().toISOString().split('T')[0],
              gender: 'boy',
              synced: 0
          };
          await DataService.saveProfile(defaultProfile);
          fetchedProfiles = [defaultProfile];
      }
      setProfiles(fetchedProfiles);
      let targetId = activeProfileId;
      if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) {
         targetId = fetchedProfiles[0].id || '';
         setActiveProfileId(targetId);
      }
      if (targetId) await loadChildData(targetId);
  };

  const handleManualSync = async () => {
      if (!session || !isSupabaseConfigured()) return;
      setIsSyncing(true);
      await syncData();
      await refreshData();
      setIsSyncing(false);
  };

  const handleLogout = async () => {
      try { 
          if (session && isSupabaseConfigured()) {
            await supabase.auth.signOut();
          } 
      } catch (e) {
        console.error("Logout error", e);
      } finally {
          localStorage.removeItem('guest_mode');
          setIsGuestMode(false);
          setSession(null);
          setProfiles([]); 
          setMemories([]); 
          setGrowthData([]); 
          setReminders([]);
          setActiveTab(TabView.HOME);
          setIsAppUnlocked(false);
          setShowPasscodeModal(false);
      }
  };

  const handleEditStart = (memory: Memory) => {
    setEditingMemory(memory);
    setSelectedMemory(null);
    setActiveTab(TabView.ADD_MEMORY);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
      if (passcodeInput.length === 4) {
          const timeout = setTimeout(() => {
              if (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW') {
                  localStorage.setItem('app_passcode', passcodeInput);
                  setPasscode(passcodeInput); 
                  setIsAppUnlocked(true);
                  setShowPasscodeModal(false); 
                  setPasscodeInput('');
                  return;
              }
              
              if (passcodeInput === passcode) {
                  setIsAppUnlocked(true); 
                  setShowPasscodeModal(false); 
                  setPasscodeInput('');
                  if (passcodeMode === 'CHANGE_VERIFY') { 
                    setPasscodeMode('CHANGE_NEW'); 
                    setShowPasscodeModal(true);
                  } else if (passcodeMode === 'REMOVE') { 
                    localStorage.removeItem('app_passcode'); 
                    setPasscode(null); 
                  }
              } else {
                  setPasscodeError(true); 
                  setPasscodeInput('');
                  setTimeout(() => setPasscodeError(false), 800);
              }
          }, 200);
          return () => clearTimeout(timeout);
      }
  }, [passcodeInput, passcodeMode, passcode]);

  const executeDelete = async () => {
     if (!itemToDelete) return;
     if (itemToDelete.type === 'MEMORY') await DataService.deleteMemory(itemToDelete.id);
     else if (itemToDelete.type === 'GROWTH') await DataService.deleteGrowth(itemToDelete.id);
     else if (itemToDelete.type === 'PROFILE') await DataService.deleteProfile(itemToDelete.id);
     else if (itemToDelete.type === 'REMINDER') await DataService.deleteReminder(itemToDelete.id);
     await refreshData();
     setShowConfirmModal(false); setItemToDelete(null);
  };

  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
  ];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin"/></div>;
  
  if (!session && !isGuestMode) {
    return (
      <AuthScreen 
        language={language} 
        setLanguage={setLanguage} 
        onGuestLogin={() => {
          setIsGuestMode(true);
          localStorage.setItem('guest_mode', 'true');
        }} 
      />
    );
  }

  const renderContent = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin"/></div>;
    const bStatus = getBirthdayStatus();
    const activeRemindersList = getActiveReminders();

    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
            {remindersEnabled && bStatus === 'TODAY' && <BirthdayCelebration />}
            {remindersEnabled && (
                <div className="space-y-3 mb-6">
                    {showBirthdayBanner && bStatus !== 'NONE' && (
                       <div className={`rounded-3xl p-5 text-white shadow-xl relative animate-zoom-in overflow-hidden ${bStatus === 'TODAY' ? 'bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                           <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none"><Sparkles className="w-24 h-24 rotate-12" /></div>
                           <button onClick={() => setShowBirthdayBanner(false)} className="absolute top-3 right-3 p-1.5 bg-white/20 rounded-full hover:bg-white/30 z-20 transition-colors"><X className="w-4 h-4"/></button>
                           <div className="flex items-center gap-4 relative z-10">
                               <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                                   {bStatus === 'TODAY' ? <Gift className="w-8 h-8 animate-bounce" /> : <Calendar className="w-8 h-8 animate-pulse" />}
                               </div>
                               <div>
                                   <h3 className="font-extrabold text-xl leading-tight">{bStatus === 'TODAY' ? t('happy_birthday_title') : t('birthday_tomorrow_title')}</h3>
                                   <p className="text-sm font-medium opacity-90 mt-0.5">{bStatus === 'TODAY' ? t('happy_birthday_msg').replace('{name}', activeProfile.name) : t('birthday_tomorrow_msg').replace('{name}', activeProfile.name)}</p>
                               </div>
                           </div>
                       </div>
                    )}
                    {activeRemindersList.map(rem => (
                        <div key={rem.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex items-center justify-between animate-slide-up hover:border-primary/30 transition-colors btn-active-scale">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Bell className="w-5 h-5"/></div>
                                <div><h4 className="font-bold text-slate-800 dark:text-slate-100">{rem.title}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('nav_home')}</p></div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Today</div>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-center mb-2">
               <div><h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}</h1><p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">{new Date().toLocaleDateString('en-GB')}{session && isSupabaseConfigured() && (<span onClick={handleManualSync} className={`cursor-pointer transition-colors ${isOnline ? 'text-teal-500' : 'text-slate-300'}`}>{isSyncing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3"/>}</span>)}</p></div>
               {activeProfile.profileImage && (<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md ring-4 ring-slate-100 dark:ring-slate-800/50 transition-all"><img src={activeProfile.profileImage} className="w-full h-full object-cover" alt="Profile"/></div>)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 pt-2">
              <div className="col-span-2 md:col-span-2">
                  {latestMemory ? (
                      <div className="relative h-72 md:h-96 rounded-[40px] overflow-hidden shadow-lg group cursor-pointer border border-transparent dark:border-slate-700 transition-transform btn-active-scale" onClick={() => setSelectedMemory(latestMemory)}>
                        <img src={latestMemory.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-8 pointer-events-none">
                          <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-3 uppercase tracking-widest shadow-lg">{t('latest_arrival')}</span>
                          <h3 className="text-white text-2xl font-bold leading-tight drop-shadow-md">{latestMemory.title}</h3>
                        </div>
                      </div>
                  ) : (
                    <div className="h-72 md:h-96 rounded-[40px] bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2"><ImageIcon className="w-12 h-12 opacity-20" /><p className="font-bold text-sm">{t('no_photos')}</p></div>
                  )}
              </div>
              <div className="col-span-2 md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
                  <div onClick={() => setActiveTab(TabView.STORY)} className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] p-6 text-white flex flex-col justify-between h-44 md:h-auto shadow-xl cursor-pointer transition-all group overflow-hidden relative btn-primary-active btn-active-scale"><Sparkles className="w-8 h-8 text-indigo-200 opacity-60 transition-transform group-hover:scale-125" /><h3 className="font-bold text-xl leading-tight relative z-10">{t('create_story')}</h3><div className="absolute -bottom-4 -right-4 opacity-10"><BookOpen className="w-32 h-32" /></div></div>
                  <div onClick={() => setActiveTab(TabView.GROWTH)} className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[40px] p-6 flex flex-col justify-between h-44 md:h-auto shadow-xl cursor-pointer transition-all group overflow-hidden btn-active-scale"><Activity className="w-8 h-8 text-teal-500 group-hover:animate-pulse" /><div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('current_height')}</p><h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-3xl">{growthData[growthData.length-1]?.height || 0} <span className="text-sm font-bold text-slate-400">cm</span></h3></div></div>
              </div>
            </div>
          </div>
        );
      default:
        return (
            <div className="pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
              <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
                {activeTab === TabView.ADD_MEMORY && <AddMemory language={language} activeProfileId={activeProfileId} editMemory={editingMemory} onSaveComplete={async () => { await loadChildData(activeProfileId); setEditingMemory(null); setActiveTab(TabView.HOME); }} onCancel={() => { setEditingMemory(null); setActiveTab(TabView.HOME); }} />}
                {activeTab === TabView.STORY && <StoryGenerator language={language} defaultChildName={activeProfile.name} />}
                {activeTab === TabView.GROWTH && <div className="max-w-4xl mx-auto"><h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">{t('growth_title')}</h1><GrowthChart data={growthData} language={language} /></div>}
                {activeTab === TabView.GALLERY && <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} />}
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
                    isDetailsUnlocked={isAppUnlocked} 
                    onUnlockRequest={() => { setPasscodeMode('UNLOCK'); setShowPasscodeModal(true); }} 
                    onPasscodeSetup={() => { setPasscodeMode('SETUP'); setShowPasscodeModal(true); }} 
                    onPasscodeChange={() => { setPasscodeMode('CHANGE_VERIFY'); setShowPasscodeModal(true); }} 
                    onPasscodeRemove={() => { setPasscodeMode('REMOVE'); setShowPasscodeModal(true); }} 
                    onHideDetails={() => setIsAppUnlocked(false)} 
                    growthData={growthData} 
                    memories={memories} 
                    onEditMemory={handleEditStart} 
                    onDeleteMemory={(id) => { setItemToDelete({type:'MEMORY', id}); setShowConfirmModal(true); }} 
                    onDeleteGrowth={(id) => { setItemToDelete({type:'GROWTH', id}); setShowConfirmModal(true); }} 
                    onDeleteProfile={(id) => { setItemToDelete({type:'PROFILE', id}); setShowConfirmModal(true); }} 
                    isGuestMode={isGuestMode} 
                    onLogout={handleLogout} 
                    initialView={settingsInitialView} 
                    remindersEnabled={remindersEnabled} 
                    toggleReminders={toggleReminders} 
                    remindersList={reminders} 
                    onDeleteReminder={(id) => { setItemToDelete({type:'REMINDER', id}); setShowConfirmModal(true); }} 
                    onSaveReminder={async (rem) => { await DataService.saveReminder(rem); await refreshData(); }} 
                  />
                )}
              </Suspense>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 flex flex-col md:flex-row font-sans selection:bg-primary/30 overflow-hidden transition-colors duration-300">
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/95 dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700 z-50 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-10 pl-2">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden p-1">
              <img src="/logo.png" className="w-full h-full object-contain" alt="Logo"/>
            </div>
            <h1 className="font-extrabold text-xl text-slate-800 dark:text-slate-100 tracking-tight">Little Moments</h1>
          </div>
          <nav className="flex-1 space-y-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 btn-active-scale ${isActive ? 'bg-primary/10 text-primary font-extrabold shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:text-slate-400'}`}><tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`}/><span className="text-sm">{t(tab.label)}</span></button>);
            })}
          </nav>

          <div className="mt-auto space-y-2">
              <button 
                onClick={toggleTheme} 
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 btn-active-scale text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:text-slate-400"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3.5 text-rose-500 font-extrabold hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-colors btn-active-scale"><LogOut className="w-5 h-5"/>{t('logout')}</button>
          </div>
      </aside>

      <main id="root" className="flex-1 px-5 pt-8 min-h-screen md:ml-64 box-border relative overflow-x-hidden">{renderContent()}</main>

      {selectedMemory && (<Suspense fallback={null}><MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} onEdit={() => handleEditStart(selectedMemory!)} onDelete={() => { setItemToDelete({type:'MEMORY', id:selectedMemory!.id}); setShowConfirmModal(true); }} /></Suspense>)}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}/>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-zoom-in text-center border border-white/20">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-rose-500"/></div>
            <h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">{t('delete_title')}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">{t('confirm_delete')}</p>
            <div className="flex flex-col gap-3"><button onClick={executeDelete} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-extrabold shadow-lg shadow-rose-500/30 btn-primary-active btn-active-scale">{t('confirm')}</button><button onClick={() => setShowConfirmModal(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-bold btn-active-scale">{t('cancel_btn')}</button></div>
          </div>
        </div>
      )}

      {showPasscodeModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-fade-in" onClick={() => setShowPasscodeModal(false)}/>
          <div className="relative w-full max-w-sm bg-white/95 dark:bg-slate-900/95 rounded-[48px] p-10 shadow-2xl animate-zoom-in border border-white/20 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-8"><Lock className="w-8 h-8"/></div>
            <h3 className="text-center font-black text-xl mb-10 dark:text-white tracking-tight">{passcodeMode === 'SETUP' ? t('create_passcode') : passcodeMode === 'CHANGE_VERIFY' ? t('enter_old_passcode') : passcodeMode === 'CHANGE_NEW' ? t('enter_new_passcode') : t('enter_passcode')}</h3>
            <div className="flex justify-center gap-6 mb-16">
              {[0,1,2,3].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${passcodeInput.length > i ? 'bg-primary border-primary scale-125 shadow-lg shadow-primary/40' : 'border-slate-300 dark:border-slate-600'}`}/>
              ))}
            </div>
            {passcodeError && <p className="text-rose-500 text-center text-xs font-bold mb-6 animate-bounce">{t('wrong_passcode')}</p>}
            <div className="grid grid-cols-3 gap-6 w-full px-4">
              {[1,2,3,4,5,6,7,8,9].map(num => (
                  <button key={num} onClick={() => passcodeInput.length < 4 && setPasscodeInput(p => p + num)} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 text-2xl font-bold text-slate-700 dark:text-slate-200 md:hover:bg-primary md:hover:text-white transition-all shadow-sm btn-active-scale">{num}</button>
              ))}
              <div className="w-16 h-16"></div>
              <button onClick={() => passcodeInput.length < 4 && setPasscodeInput(p => p + '0')} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 text-2xl font-bold text-slate-700 dark:text-slate-200 md:hover:bg-primary md:hover:text-white transition-all shadow-sm btn-active-scale">0</button>
              <button onClick={() => setPasscodeInput(p => p.slice(0, -1))} className="w-16 h-16 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all btn-active-scale"><Delete className="w-8 h-8"/></button>
            </div>
            <button onClick={() => setShowPasscodeModal(false)} className="mt-12 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">{t('cancel_btn')}</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[32px] p-2 flex items-center gap-1 z-50 w-[92%] md:hidden transition-all duration-300">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center justify-center h-14 rounded-3xl transition-all duration-500 btn-active-scale ${isActive ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-lg' : 'flex-1 text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}><tab.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-100 stroke-[2px]'}`}/>{isActive && <span className="ml-2 text-xs font-extrabold animate-fade-in">{t(tab.label)}</span>}</button>);
        })}
      </nav>
    </div>
  );
}

export default App;
