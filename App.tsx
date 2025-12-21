
import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Image as ImageIcon, ChevronRight, Sparkles, Settings, Trash2, Cloud, RefreshCw, Loader2, Baby, LogOut, AlertTriangle, Gift, X, Calendar, Delete, Bell, Lock, ChevronLeft, Sun, Moon, Keyboard, ShieldCheck } from 'lucide-react';

const GrowthChart = React.lazy(() => import('./components/GrowthChart').then(module => ({ default: module.GrowthChart })));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator').then(module => ({ default: module.StoryGenerator })));
const GalleryGrid = React.lazy(() => import('./components/GalleryGrid').then(module => ({ default: module.GalleryGrid })));
const AddMemory = React.lazy(() => import('./components/AddMemory').then(module => ({ default: module.AddMemory })));
const SettingsComponent = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const MemoryDetailModal = React.lazy(() => import('./components/MemoryDetailModal').then(module => ({ default: module.MemoryDetailModal })));
const StoryDetailModal = React.lazy(() => import('./components/StoryDetailModal').then(module => ({ default: module.StoryDetailModal })));

import { AuthScreen } from './components/AuthScreen';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData, Reminder, Story } from './types';
import { getTranslation } from './utils/translations';
import { initDB, DataService, syncData } from './lib/db';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem('guest_mode') === 'true');
  const [authLoading, setAuthLoading] = useState(true);

  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('app_passcode'));
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE_VERIFY' | 'CHANGE_NEW' | 'REMOVE'>('UNLOCK');
  const passcodeInputRef = useRef<HTMLInputElement>(null);

  const [itemToDelete, setItemToDelete] = useState<{ type: 'MEMORY' | 'GROWTH' | 'PROFILE' | 'REMINDER' | 'STORY', id: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(''); 
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [settingsInitialView, setSettingsInitialView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES'>('MAIN');

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reminders_enabled') !== 'false';
  });

  const [showBirthdayBanner, setShowBirthdayBanner] = useState(true);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'mm');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const t = (key: any) => getTranslation(language, key);

  useEffect(() => { if (!passcode) setIsAppUnlocked(true); }, [passcode]);
  useEffect(() => { if (showPasscodeModal) setTimeout(() => passcodeInputRef.current?.focus(), 100); }, [showPasscodeModal]);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data?.session || null);
      setAuthLoading(false);
    }).catch(() => setAuthLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); setAuthLoading(false); });
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
            syncData().then(() => { refreshData(); setIsSyncing(false); }).catch(() => setIsSyncing(false));
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
          syncData().then(() => { refreshData(); setIsSyncing(false); });
        }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setIsOnline(false));
    return () => { window.removeEventListener('online', handleOnline); };
  }, [session]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || { id: '', name: '', dob: '', gender: 'boy' } as ChildProfile;

  const loadChildData = async (childId: string) => {
      const mems = await DataService.getMemories(childId);
      const strs = await DataService.getStories(childId);
      const growth = await DataService.getGrowth(childId);
      const rems = await DataService.getReminders();
      setMemories(mems);
      setStories(strs);
      setGrowthData(growth);
      setReminders(rems);
  };

  const refreshData = async () => {
      let fetchedProfiles = await DataService.getProfiles();
      if (fetchedProfiles.length === 0) {
          const defaultProfile: ChildProfile = { id: crypto.randomUUID(), name: 'My Child', dob: new Date().toISOString().split('T')[0], gender: 'boy', synced: 0 };
          await DataService.saveProfile(defaultProfile);
          fetchedProfiles = [defaultProfile];
      }
      setProfiles(fetchedProfiles);
      let targetId = activeProfileId;
      if (!targetId || !fetchedProfiles.find(p => p.id === targetId)) { targetId = fetchedProfiles[0].id || ''; setActiveProfileId(targetId); }
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
      try { if (session && isSupabaseConfigured()) await supabase.auth.signOut(); } 
      catch (e) { console.error("Logout error", e); } 
      finally {
          localStorage.removeItem('guest_mode');
          setIsGuestMode(false);
          setSession(null);
          setProfiles([]); setMemories([]); setStories([]); setGrowthData([]); setReminders([]);
          setActiveTab(TabView.HOME);
          setIsAppUnlocked(false);
          setShowPasscodeModal(false);
      }
  };

  const executeDelete = async () => {
     if (!itemToDelete) return;
     if (itemToDelete.type === 'MEMORY') await DataService.deleteMemory(itemToDelete.id);
     else if (itemToDelete.type === 'STORY') await DataService.deleteStory(itemToDelete.id);
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
  if (!session && !isGuestMode) return <AuthScreen language={language} setLanguage={setLanguage} onGuestLogin={() => { setIsGuestMode(true); localStorage.setItem('guest_mode', 'true'); }} />;

  const renderContent = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin"/></div>;
    const activeRemindersList = reminders.filter(r => r.date === new Date().toISOString().split('T')[0]);

    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        return (
          <div className="space-y-4 pb-32 md:pb-8 animate-fade-in max-w-7xl mx-auto">
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

            <div className="mt-8 animate-slide-up">
              <div className="flex justify-between items-center mb-5 px-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{t('memories')}</h3>
                <button onClick={() => setActiveTab(TabView.GALLERY)} className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{t('see_all')}</button>
              </div>
              <div className="space-y-3">
                 {memories.slice(0, 4).map(m => (
                    <div key={m.id} onClick={() => setSelectedMemory(m)} className="bg-white dark:bg-slate-800 p-2.5 rounded-[32px] border border-slate-50 dark:border-slate-700 flex items-center gap-3.5 active:scale-[0.98] transition-all cursor-pointer shadow-sm group">
                       <div className="w-14 h-14 rounded-[18px] overflow-hidden shrink-0 shadow-sm border border-slate-50 dark:border-slate-700"><img src={m.imageUrl} className="w-full h-full object-cover" /></div>
                       <div className="flex-1 min-w-0"><h4 className="font-black text-slate-800 dark:text-white truncate text-sm tracking-tight leading-none mb-1.5">{m.title}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.date}</p></div>
                       <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 group-hover:text-primary group-hover:bg-primary/5 transition-all"><ChevronRight className="w-4.5 h-4.5" /></div>
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
                {activeTab === TabView.ADD_MEMORY && <AddMemory language={language} activeProfileId={activeProfileId} editMemory={editingMemory} onSaveComplete={async () => { await loadChildData(activeProfileId); setEditingMemory(null); setActiveTab(TabView.HOME); }} onCancel={() => { setEditingMemory(null); setActiveTab(TabView.HOME); }} />}
                {activeTab === TabView.STORY && <StoryGenerator language={language} activeProfileId={activeProfileId} defaultChildName={activeProfile.name} onSaveComplete={async () => { await loadChildData(activeProfileId); setActiveTab(TabView.HOME); }} />}
                {activeTab === TabView.GROWTH && <div className="max-w-4xl mx-auto"><h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">{t('growth_title')}</h1><GrowthChart data={growthData} language={language} /></div>}
                {activeTab === TabView.GALLERY && <GalleryGrid memories={memories} language={language} onMemoryClick={setSelectedMemory} />}
                {activeTab === TabView.SETTINGS && (
                  <SettingsComponent 
                    language={language} setLanguage={setLanguage} theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                    profiles={profiles} activeProfileId={activeProfileId} onProfileChange={(id) => { setActiveProfileId(id); loadChildData(id); }} onRefreshData={refreshData} 
                    passcode={passcode} isDetailsUnlocked={isAppUnlocked} onUnlockRequest={() => { setPasscodeMode('UNLOCK'); setShowPasscodeModal(true); }} 
                    onPasscodeSetup={() => { setPasscodeMode('SETUP'); setShowPasscodeModal(true); }} onPasscodeChange={() => { setPasscodeMode('CHANGE_VERIFY'); setShowPasscodeModal(true); }} 
                    onPasscodeRemove={() => { setPasscodeMode('REMOVE'); setShowPasscodeModal(true); }} onHideDetails={() => setIsAppUnlocked(false)} 
                    growthData={growthData} memories={memories} stories={stories} onEditMemory={(m) => { setEditingMemory(m); setActiveTab(TabView.ADD_MEMORY); }} 
                    onDeleteMemory={(id) => { setItemToDelete({type:'MEMORY', id}); setShowConfirmModal(true); }} 
                    onStoryClick={setSelectedStory}
                    onDeleteStory={(id) => { setItemToDelete({type:'STORY', id}); setShowConfirmModal(true); }}
                    onDeleteGrowth={(id) => { setItemToDelete({type:'GROWTH', id}); setShowConfirmModal(true); }} 
                    onDeleteProfile={(id) => { setItemToDelete({type:'PROFILE', id}); setShowConfirmModal(true); }} 
                    isGuestMode={isGuestMode} onLogout={handleLogout} initialView={settingsInitialView} remindersEnabled={remindersEnabled} 
                    toggleReminders={() => { setRemindersEnabled(!remindersEnabled); localStorage.setItem('reminders_enabled', String(!remindersEnabled)); }} 
                    remindersList={reminders} onDeleteReminder={(id) => { setItemToDelete({type:'REMINDER', id}); setShowConfirmModal(true); }} 
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
          <div className="flex items-center gap-3 mb-10 pl-2"><div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden p-1"><img src="/logo.png" className="w-full h-full object-contain" alt="Logo"/></div><h1 className="font-extrabold text-xl text-slate-800 dark:text-slate-100 tracking-tight">Little Moments</h1></div>
          <nav className="flex-1 space-y-1">{tabs.map(tab => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 btn-active-scale ${isActive ? 'bg-primary/10 text-primary font-extrabold shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:text-slate-400'}`}><tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`}/><span className="text-sm">{t(tab.label)}</span></button>); })}</nav>
      </aside>
      <main className="flex-1 px-5 pt-8 min-h-screen md:ml-64 relative overflow-x-hidden">{renderContent()}</main>
      
      {selectedMemory && (<Suspense fallback={null}><MemoryDetailModal memory={selectedMemory} language={language} onClose={() => setSelectedMemory(null)} onEdit={() => { setEditingMemory(selectedMemory); setActiveTab(TabView.ADD_MEMORY); setSelectedMemory(null); }} onDelete={() => { setItemToDelete({type:'MEMORY', id:selectedMemory.id}); setShowConfirmModal(true); }} /></Suspense>)}
      
      {selectedStory && (<Suspense fallback={null}><StoryDetailModal story={selectedStory} language={language} onClose={() => setSelectedStory(null)} onDelete={() => { setItemToDelete({type:'STORY', id:selectedStory.id}); setShowConfirmModal(true); }} /></Suspense>)}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}/>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-zoom-in text-center border border-white/20">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-rose-500"/></div>
            <h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">{t('delete_title')}</h3><p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">{t('confirm_delete')}</p>
            <div className="flex flex-col gap-3"><button onClick={executeDelete} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-extrabold shadow-lg shadow-rose-500/30 btn-primary-active btn-active-scale">{t('confirm')}</button><button onClick={() => setShowConfirmModal(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-bold btn-active-scale">{t('cancel_btn')}</button></div>
          </div>
        </div>
      )}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[32px] p-2 flex items-center gap-1 z-50 w-[92%] md:hidden transition-all duration-300">
        {tabs.map(tab => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center justify-center h-14 rounded-3xl transition-all duration-500 btn-active-scale ${isActive ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-lg' : 'flex-1 text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}><tab.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-100 stroke-[2px]'}`}/>{isActive && <span className="ml-2 text-xs font-extrabold animate-fade-in">{t(tab.label)}</span>}</button>); })}
      </nav>
    </div>
  );
}

export default App;
