
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete } from 'lucide-react';

const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory').then(module => ({ default: module.AddMemory })));
const SettingsComponent = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));

import { AuthScreen } from './components/AuthScreen';
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
  
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isDetailsUnlocked, setIsDetailsUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');

  const [itemToDelete, setItemToDelete] = useState<{ type: 'MEMORY' | 'GROWTH' | 'PROFILE', id: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [settingsInitialView, setSettingsInitialView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES'>('MAIN');

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (!session && !isGuestMode) {
          setProfiles([]);
          setMemories([]);
          setGrowthData([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [isGuestMode]);

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

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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

  const getBirthdayStatus = () => {
    if (!activeProfile.dob) return 'NONE';
    const today = new Date();
    const dob = new Date(activeProfile.dob);
    const bdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    today.setHours(0,0,0,0);
    bdayThisYear.setHours(0,0,0,0);
    const oneDay = 24 * 60 * 60 * 1000;
    const diff = (bdayThisYear.getTime() - today.getTime()) / oneDay;
    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'TOMORROW';
    return 'NONE';
  };

  const BirthdayBoomCelebration = () => {
    const particles = useMemo(() => {
      const colors = ['bg-rose-400', 'bg-blue-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-violet-400', 'bg-orange-400'];
      
      const explosive = Array.from({ length: 60 }).map((_, i) => ({
        id: `boom-${i}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: '50%',
        top: '40%',
        delay: `${Math.random() * 0.2}s`,
        tx: `${(Math.random() - 0.5) * 600}px`,
        ty: `${(Math.random() - 0.5) * 600}px`,
        type: 'boom'
      }));

      const shower = Array.from({ length: 60 }).map((_, i) => ({
        id: `fall-${i}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: `${Math.random() * 100}%`,
        top: '-10%',
        delay: `${Math.random() * 5}s`,
        tx: '0px', // Added tx to ensure type consistency across particles
        ty: '0px', // Added ty to ensure type consistency across particles
        type: 'fall'
      }));

      return [...explosive, ...shower];
    }, []);

    return (
      <div className="fixed inset-0 pointer-events-none z-[1000] overflow-hidden">
        {particles.map(p => (
          <div 
            key={p.id}
            className={`celebration-particle ${p.color} ${p.type === 'boom' ? 'animate-boom-particle' : 'animate-fall-particle'}`}
            style={{ 
              left: p.left, 
              top: p.top, 
              animationDelay: p.delay,
              '--tw-translate-x': p.type === 'boom' ? (p as any).tx : '0', // Cast to any to safely access optional tx
              '--tw-translate-y': p.type === 'boom' ? (p as any).ty : '0', // Cast to any to safely access optional ty
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            } as any}
          />
        ))}
      </div>
    );
  };

  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const growth = await DataService.getGrowth(childId);
      setMemories(mems);
      setGrowthData(growth);
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
      fetchedProfiles.sort((a, b) => (a.name === 'My Child' ? 1 : b.name === 'My Child' ? -1 : 0));
      setProfiles(fetchedProfiles);
      let targetId = activeProfileId;
      if (fetchedProfiles.length > 0) {
          if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) {
             targetId = fetchedProfiles[0].id || '';
             setActiveProfileId(targetId);
          }
      }
      if (targetId) await loadChildData(targetId);
  };

  const handleManualSync = async () => {
      if (!session) return;
      setIsSyncing(true);
      await syncData();
      await refreshData();
      setIsSyncing(false);
  };

  const handleLogout = async () => {
      Object.keys(localStorage).forEach(key => { if (key.startsWith('sb-')) localStorage.removeItem(key); });
      try {
          if (session) await supabase.auth.signOut();
      } finally {
          setProfiles([]); setMemories([]); setGrowthData([]);
          setSession(null); setIsGuestMode(false);
      }
  };

  // Missing function handleEditStart implemented to fix compile error
  const handleEditStart = (memory: Memory) => {
    setEditingMemory(memory);
    setSelectedMemory(null);
    setActiveTab(TabView.ADD_MEMORY);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleUnlockClick = () => {
    if (isDetailsUnlocked) setIsDetailsUnlocked(false);
    else {
      setPasscodeMode('UNLOCK'); setPasscodeInput(''); setPasscodeError(false);
      setShowPasscodeModal(true);
    }
  };

  useEffect(() => {
      if (passcodeInput.length === 4) {
          const timeout = setTimeout(() => {
              if (passcodeMode === 'SETUP' || passcodeMode === 'CHANGE_NEW') {
                  localStorage.setItem('app_passcode', passcodeInput);
                  setPasscode(passcodeInput); setIsDetailsUnlocked(true);
                  setShowPasscodeModal(false); setPasscodeInput('');
                  return;
              }
              if (passcodeInput === passcode) {
                  if (passcodeMode === 'UNLOCK') { setIsDetailsUnlocked(true); setShowPasscodeModal(false); }
                  else if (passcodeMode === 'CHANGE_VERIFY') { setPasscodeMode('CHANGE_NEW'); setPasscodeInput(''); }
                  else if (passcodeMode === 'REMOVE') { localStorage.removeItem('app_passcode'); setPasscode(null); setIsDetailsUnlocked(true); setShowPasscodeModal(false); }
              } else {
                  setPasscodeError(true); setPasscodeInput('');
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
  if (!session && !isGuestMode) return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={() => setIsGuestMode(true)} />;

  const renderContent = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;
    const bStatus = getBirthdayStatus();

    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
            {remindersEnabled && showBirthdayBanner && bStatus === 'TODAY' && <BirthdayBoomCelebration />}
            {remindersEnabled && showBirthdayBanner && bStatus !== 'NONE' && (
               <div className={`rounded-2xl p-4 text-white shadow-md relative mb-2 animate-zoom-in ${bStatus === 'TODAY' ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}>
                   <button onClick={() => setShowBirthdayBanner(false)} className="absolute top-2 right-2 p-1 bg-white/20 rounded-full hover:bg-white/30 z-20"><X className="w-4 h-4"/></button>
                   <div className="flex items-center gap-3 relative z-10">
                       <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                           {bStatus === 'TODAY' ? <Gift className="w-6 h-6 animate-bounce" /> : <Calendar className="w-6 h-6 animate-pulse" />}
                       </div>
                       <div>
                           <h3 className="font-bold text-lg">{bStatus === 'TODAY' ? t('happy_birthday_title') : t('birthday_tomorrow_title')}</h3>
                           <p className="text-sm opacity-90">{bStatus === 'TODAY' ? t('happy_birthday_msg').replace('{name}', activeProfile.name) : t('birthday_tomorrow_msg').replace('{name}', activeProfile.name)}</p>
                       </div>
                   </div>
               </div>
            )}
            <div className="flex justify-between items-center mb-2">
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{activeProfile.name ? `${t('greeting')}, ${activeProfile.name}` : t('greeting')}</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                      {new Date().toLocaleDateString('en-GB')}
                      {session && <span onClick={handleManualSync} className={`cursor-pointer ${isOnline ? 'text-teal-500' : 'text-slate-300'}`}>{isSyncing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3"/>}</span>}
                  </p>
               </div>
               {activeProfile.profileImage && <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm"><img src={activeProfile.profileImage} className="w-full h-full object-cover"/></div>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="col-span-2 md:col-span-2">
                  {latestMemory ? (
                      <div className="relative h-64 md:h-80 rounded-[32px] overflow-hidden shadow-sm group cursor-pointer" onClick={() => setSelectedMemory(latestMemory)}>
                        <img src={latestMemory.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 pointer-events-none">
                          <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/20">{t('latest_arrival')}</span>
                          <h3 className="text-white text-xl font-bold">{latestMemory.title}</h3>
                        </div>
                      </div>
                  ) : <div className="h-64 md:h-80 rounded-[32px] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">{t('no_photos')}</div>}
              </div>
              <div className="col-span-2 md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
                  <div onClick={() => setActiveTab(TabView.STORY)} className="col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-5 text-white flex flex-col justify-between h-40 md:h-auto shadow-sm cursor-pointer active:scale-95 transition-transform"><Sparkles className="w-6 h-6"/><h3 className="font-bold text-lg leading-tight">{t('create_story')}</h3></div>
                  <div onClick={() => setActiveTab(TabView.GROWTH)} className="col-span-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-5 flex flex-col justify-between h-40 md:h-auto shadow-sm cursor-pointer active:scale-95 transition-transform"><Activity className="w-6 h-6 text-teal-500"/><div><p className="text-slate-400 text-xs">{t('current_height')}</p><h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl">{growthData[growthData.length-1]?.height || 0} cm</h3></div></div>
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
                {activeTab === TabView.SETTINGS && <SettingsComponent language={language} setLanguage={setLanguage} theme={theme} toggleTheme={toggleTheme} profiles={profiles} activeProfileId={activeProfileId} onProfileChange={(id) => { setActiveProfileId(id); loadChildData(id); }} onRefreshData={refreshData} passcode={passcode} isDetailsUnlocked={isDetailsUnlocked} onUnlockRequest={handleUnlockClick} onPasscodeSetup={() => { setPasscodeMode('SETUP'); setShowPasscodeModal(true); }} onPasscodeChange={() => { setPasscodeMode('CHANGE_VERIFY'); setShowPasscodeModal(true); }} onPasscodeRemove={() => { setPasscodeMode('REMOVE'); setShowPasscodeModal(true); }} onHideDetails={() => setIsDetailsUnlocked(false)} growthData={growthData} memories={memories} onEditMemory={(m) => { setEditingMemory(m); setActiveTab(TabView.ADD_MEMORY); }} onDeleteMemory={(id) => { setItemToDelete({type:'MEMORY', id}); setShowConfirmModal(true); }} onDeleteGrowth={(id) => { setItemToDelete({type:'GROWTH', id}); setShowConfirmModal(true); }} onDeleteProfile={(id) => { setItemToDelete({type:'PROFILE', id}); setShowConfirmModal(true); }} isGuestMode={isGuestMode} onLogout={handleLogout} initialView={settingsInitialView} remindersEnabled={remindersEnabled} toggleReminders={toggleReminders} />}
              </Suspense>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 flex flex-col md:flex-row font-sans">
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/95 dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700 z-50 p-6">
          <div className="flex items-center gap-3 mb-10 pl-2"><Baby className="w-8 h-8 text-primary"/><h1 className="font-bold text-xl text-slate-800 dark:text-slate-100">Little Moments</h1></div>
          <nav className="flex-1 space-y-2">{tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><tab.icon className="w-5 h-5"/><span className="text-sm">{t(tab.label)}</span></button>
          ))}</nav>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-colors"><LogOut className="w-5 h-5"/>{t('logout')}</button>
      </aside>
      <main className="flex-1 px-5 pt-8 min-h-screen md:ml-64 box-border">{renderContent()}</main>
      {selectedMemory && <Suspense fallback={null}><MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} onEdit={() => handleEditStart(selectedMemory!)} onDelete={() => { setItemToDelete({type:'MEMORY', id:selectedMemory!.id}); setShowConfirmModal(true); }} /></Suspense>}
      {showConfirmModal && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}/><div className="relative bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-zoom-in text-center"><AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4"/><h3 className="text-xl font-bold mb-2 dark:text-white">{t('delete_title')}</h3><p className="text-slate-500 text-sm mb-6">{t('confirm_delete')}</p><div className="flex gap-3"><button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold">{t('cancel_btn')}</button><button onClick={executeDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold">{t('confirm')}</button></div></div></div>}
      {showPasscodeModal && <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"><div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPasscodeModal(false)}/><div className="relative w-full md:w-[380px] bg-white/95 dark:bg-slate-900/95 rounded-t-[32px] md:rounded-[40px] p-8 animate-slide-up"><h3 className="text-center font-bold mb-6 dark:text-white">{t('enter_passcode')}</h3><div className="flex justify-center gap-4 mb-8">{[0,1,2,3].map(i => <div key={i} className={`w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 ${passcodeInput.length > i ? 'bg-slate-800 dark:bg-white border-transparent' : ''}`}/>)}</div><div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => passcodeInput.length < 4 && setPasscodeInput(p => p + num)} className="w-[72px] h-[72px] rounded-full bg-slate-100 dark:bg-slate-800 text-2xl font-medium active:scale-95 transition-transform dark:text-white">{num}</button>)}<button onClick={() => setPasscodeInput(p => p.slice(0, -1))} className="w-[72px] h-[72px] flex items-center justify-center text-slate-400"><Delete/></button></div></div></div>}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-full p-2 flex items-center gap-1 z-50 w-[90%] md:hidden">{tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center justify-center h-12 rounded-full transition-all ${activeTab === tab.id ? 'flex-[2.5] bg-slate-800 text-white' : 'flex-1 text-slate-400'}`}><tab.icon className="w-5 h-5"/></button>
      ))}</nav>
    </div>
  );
}
export default App;
