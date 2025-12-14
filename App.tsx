import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB, DataService } from './db';
import { supabase } from './supabaseClient';
import { AuthScreen } from './components/AuthScreen';
import { GrowthChart } from './components/GrowthChart';
import { StoryGenerator } from './components/StoryGenerator';
import { GalleryGrid } from './components/GalleryGrid';
import { MemoryCard } from './components/MemoryCard';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { AddMemoryForm } from './components/AddMemoryForm';
import { TabView, Language, Memory } from './types';
import { getTranslation } from './translations';
import { 
  LayoutGrid, BookOpen, LineChart, Image as ImageIcon, Settings, 
  Plus, User, LogOut
} from 'lucide-react';

// Initialize DB immediately
initDB();

function App() {
  const [session, setSession] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [language, setLanguage] = useState<Language>('en');
  const [currentProfileId, setCurrentProfileId] = useState<string>('');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Fetch profiles using Dexie hook
  const profiles = useLiveQuery(() => db.profile.toArray()) || [];
  
  // Fetch data for current profile
  const memories = useLiveQuery(
    () => DataService.getMemories(currentProfileId), 
    [currentProfileId]
  ) || [];
  
  const growthData = useLiveQuery(
    () => DataService.getGrowth(currentProfileId), 
    [currentProfileId]
  ) || [];

  const t = (key: any) => getTranslation(language, key);

  // Auth Status Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setIsAuthenticated(true);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Select profile based on LocalStorage or default to first one
  useEffect(() => {
    if (profiles.length > 0) {
        // 1. Try to load last selected profile
        const savedProfileId = localStorage.getItem('lastActiveProfileId');
        
        // If we have a saved ID and it still exists in the profiles list
        if (savedProfileId && profiles.some(p => p.id === savedProfileId)) {
            if (currentProfileId !== savedProfileId) {
                setCurrentProfileId(savedProfileId);
            }
        } else if (!currentProfileId) {
            // 2. Fallback: Prefer a profile with a name, otherwise just the first one
            const p = profiles.find(p => p.name) || profiles[0];
            if (p && p.id) {
                setCurrentProfileId(p.id);
                localStorage.setItem('lastActiveProfileId', p.id);
            }
        }
    }
  }, [profiles, currentProfileId]);

  const handleProfileSelect = (id: string) => {
      setCurrentProfileId(id);
      localStorage.setItem('lastActiveProfileId', id);
  };

  const handleGuestMode = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setActiveTab(TabView.HOME);
    localStorage.removeItem('lastActiveProfileId');
  };
  
  const handleAddProfile = async () => {
      const newId = await DataService.saveProfile({
          name: 'New Child',
          dob: new Date().toISOString().split('T')[0],
          gender: 'boy'
      });
      // Automatically select the new profile
      if (newId) {
          handleProfileSelect(newId);
      }
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen 
        onAuthSuccess={() => setIsAuthenticated(true)} 
        onGuestMode={handleGuestMode}
        language={language}
      />
    );
  }
  
  const currentProfile = profiles.find(p => p.id === currentProfileId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 transition-colors duration-300 font-sans">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Little Moments
            </h1>
            <button 
                onClick={() => setLanguage(l => l === 'en' ? 'mm' : 'en')}
                className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center justify-center border border-indigo-100 dark:border-slate-600"
            >
                {language === 'en' ? 'MY' : 'EN'}
            </button>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-6">
             
             {/* 1. Profile Card with Multi-User Support */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 relative">
                {/* Profile List Container */}
                <div className="flex items-center gap-5 overflow-x-auto py-4 px-2 mb-2 no-scrollbar snap-x snap-mandatory scroll-smooth">
                   {/* Sort profiles: Active First, then Named ones, then Alphabetical */}
                   {[...profiles].sort((a, b) => {
                       // 1. Active Profile always first
                       if (a.id === currentProfileId) return -1;
                       if (b.id === currentProfileId) return 1;

                       // 2. Named profiles first
                       const nameA = a.name ? a.name.trim() : '';
                       const nameB = b.name ? b.name.trim() : '';
                       if (nameA && !nameB) return -1;
                       if (!nameA && nameB) return 1;
                       return nameA.localeCompare(nameB);
                   }).map(profile => (
                       <div 
                           key={profile.id} 
                           onClick={() => handleProfileSelect(profile.id!)}
                           className={`snap-center shrink-0 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${currentProfileId === profile.id ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                       >
                           <div className={`w-14 h-14 rounded-full border-2 p-0.5 flex items-center justify-center overflow-hidden transition-all duration-300 ${currentProfileId === profile.id ? 'border-rose-400 shadow-md shadow-rose-200 dark:shadow-rose-900/30' : 'border-transparent'}`}>
                               <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                   {profile.profileImage ? (
                                       <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                                   ) : (
                                       <User className="w-6 h-6 text-slate-400" />
                                   )}
                               </div>
                           </div>
                           <span className={`text-[10px] font-bold truncate max-w-[60px] transition-colors ${currentProfileId === profile.id ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                               {profile.name || t('child_name')}
                           </span>
                       </div>
                   ))}

                   {/* Add Profile Button */}
                   <button 
                       onClick={handleAddProfile}
                       className="snap-center shrink-0 flex flex-col items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 hover:scale-105 transition-all"
                   >
                       <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                           <Plus className="w-5 h-5 text-slate-400" />
                       </div>
                       <span className="text-[10px] font-bold text-slate-400">{t('create')}</span>
                   </button>
                </div>
             </div>

             {/* Content Area */}
             <div className="animate-fade-in">
                 {activeTab === TabView.HOME && (
                     <div className="space-y-6">
                        {/* Latest Memory Teaser */}
                        {memories.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('latest_arrival')}</h3>
                                </div>
                                <MemoryCard memory={memories[0]} />
                            </div>
                        )}

                        {/* Navigation Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setActiveTab(TabView.STORY)}
                                className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-none text-left flex flex-col justify-between h-40 transition-transform active:scale-95"
                            >
                                <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight mb-1">{t('create_story')}</h3>
                                    <p className="text-xs text-indigo-100 opacity-90">{t('story_subtitle')}</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setActiveTab(TabView.GROWTH)}
                                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 text-left flex flex-col justify-between h-40 transition-transform active:scale-95 shadow-sm"
                            >
                                <div className="bg-rose-50 dark:bg-rose-900/30 w-10 h-10 rounded-full flex items-center justify-center">
                                    <LineChart className="w-5 h-5 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 leading-tight mb-1">{t('growth_tracker')}</h3>
                                    <p className="text-xs text-slate-400">{t('growth_subtitle')}</p>
                                </div>
                            </button>
                        </div>
                     </div>
                 )}

                 {activeTab === TabView.ADD_MEMORY && (
                     <AddMemoryForm 
                        language={language}
                        currentProfileId={currentProfileId}
                        onClose={() => setActiveTab(TabView.HOME)}
                        onSave={() => setActiveTab(TabView.GALLERY)}
                     />
                 )}

                 {activeTab === TabView.STORY && (
                     <StoryGenerator 
                        language={language} 
                        defaultChildName={currentProfile?.name}
                     />
                 )}

                 {activeTab === TabView.GROWTH && (
                     <GrowthChart data={growthData} language={language} />
                 )}

                 {activeTab === TabView.GALLERY && (
                     <GalleryGrid 
                        memories={memories} 
                        language={language} 
                        onMemoryClick={setSelectedMemory} 
                     />
                 )}

                 {activeTab === TabView.SETTINGS && (
                     <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                         <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{t('settings_title')}</h2>
                         
                         <div className="space-y-4">
                             <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                 <div className="flex items-center">
                                     <User className="w-5 h-5 text-slate-400 mr-3" />
                                     <div>
                                         <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('account')}</p>
                                         <p className="text-xs text-slate-400">{session?.user?.email || 'Guest'}</p>
                                     </div>
                                 </div>
                             </div>

                             <button 
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-500 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                             >
                                 <LogOut className="w-4 h-4 mr-2" />
                                 {t('sign_out')}
                             </button>
                         </div>
                     </div>
                 )}
             </div>
        </div>
        
        {/* Memory Detail Modal */}
        {selectedMemory && (
            <MemoryDetailModal 
                memory={selectedMemory} 
                language={language}
                onClose={() => setSelectedMemory(null)}
            />
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 pb-safe pt-2 px-6 z-50">
            <div className="flex justify-between items-center h-16">
                <NavButton icon={<LayoutGrid className="w-6 h-6"/>} label={t('nav_home')} active={activeTab === TabView.HOME} onClick={() => setActiveTab(TabView.HOME)} />
                <NavButton icon={<BookOpen className="w-6 h-6"/>} label={t('nav_story')} active={activeTab === TabView.STORY} onClick={() => setActiveTab(TabView.STORY)} />
                
                <div className="relative -top-6">
                    <button 
                        onClick={() => setActiveTab(TabView.ADD_MEMORY)}
                        className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/50 hover:bg-rose-600 transition-colors transform hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-7 h-7 text-white" />
                    </button>
                </div>

                <NavButton icon={<LineChart className="w-6 h-6"/>} label={t('nav_growth')} active={activeTab === TabView.GROWTH} onClick={() => setActiveTab(TabView.GROWTH)} />
                <NavButton icon={<ImageIcon className="w-6 h-6"/>} label={t('nav_gallery')} active={activeTab === TabView.GALLERY} onClick={() => setActiveTab(TabView.GALLERY)} />
            </div>
        </div>
    </div>
  );
}

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-12 transition-colors ${active ? 'text-rose-500' : 'text-slate-300 dark:text-slate-500 hover:text-slate-400'}`}>
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

export default App;