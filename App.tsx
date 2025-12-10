import React, { useState, useEffect } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Camera, Image as ImageIcon, Baby, ChevronRight, Sparkles, Plus, Moon, Sun } from 'lucide-react';
import { MemoryCard } from './components/MemoryCard';
import { GrowthChart } from './components/GrowthChart';
import { StoryGenerator } from './components/StoryGenerator';
import { GalleryGrid } from './components/GalleryGrid';
import { MOCK_MEMORIES, MOCK_GROWTH_DATA } from './constants';
import { Memory, TabView, Language, Theme } from './types';
import { getTranslation } from './translations';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [memories, setMemories] = useState<Memory[]>(MOCK_MEMORIES);
  const [newMemory, setNewMemory] = useState<{title: string; desc: string}>({ title: '', desc: '' });
  const [language, setLanguage] = useState<Language>('mm');
  const [theme, setTheme] = useState<Theme>('light');

  const t = (key: any) => getTranslation(language, key);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'mm' ? 'en' : 'mm');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const formattedDate = new Date().toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const handleAddMemory = () => {
    if (!newMemory.title) return;
    const memory: Memory = {
      id: Date.now().toString(),
      title: newMemory.title,
      description: newMemory.desc,
      date: new Date().toISOString().split('T')[0],
      imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`,
      tags: ['New Memory']
    };
    setMemories([memory, ...memories]);
    setNewMemory({ title: '', desc: '' });
    setActiveTab(TabView.HOME);
  };

  // Logic for Expandable Pill Nav Bar
  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.STORY, icon: BookOpen, label: 'nav_story' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.GALLERY, icon: ImageIcon, label: 'nav_gallery' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case TabView.HOME:
        const latestMemory = memories[0];
        return (
          <div className="space-y-4 pb-32">
             {/* Header Tile */}
            <div className="flex justify-between items-center mb-2">
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">{t('greeting')}</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">{formattedDate}</p>
               </div>
               
               <div className="flex space-x-2">
                 <button 
                    onClick={toggleLanguage}
                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                    aria-label="Change Language"
                 >
                    <span className="font-bold text-xs">{language === 'en' ? 'EN' : 'MM'}</span>
                 </button>
                 <button 
                    onClick={toggleTheme}
                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                    aria-label="Toggle Theme"
                 >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                 </button>
               </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Main Feature: Latest Memory (Span 2 columns) */}
              <div 
                className="col-span-2 relative h-64 rounded-[32px] overflow-hidden shadow-sm group cursor-pointer border border-transparent dark:border-slate-700"
                onClick={() => setActiveTab(TabView.GALLERY)}
              >
                <img 
                  src={latestMemory?.imageUrl} 
                  alt="Latest" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/20">
                    {t('latest_arrival')}
                  </span>
                  <h3 className="text-white text-xl font-bold leading-tight drop-shadow-sm">{latestMemory?.title}</h3>
                  <p className="text-white/80 text-sm mt-1 line-clamp-1 drop-shadow-sm">{latestMemory?.description}</p>
                </div>
              </div>

              {/* Story Widget (Span 1) */}
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

              {/* Growth Widget (Span 1) */}
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
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl">76 <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">cm</span></h3>
                </div>
              </div>

              {/* Recent Memories List (Span 2) */}
              <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">{t('memories')}</h3>
                  <button onClick={() => setActiveTab(TabView.GALLERY)} className="text-primary text-xs font-bold">{t('see_all')}</button>
                </div>
                <div className="space-y-4">
                  {memories.slice(1, 3).map(mem => (
                    <div key={mem.id} className="flex items-center space-x-4">
                      <img src={mem.imageUrl} className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 dark:ring-slate-700" alt={mem.title} />
                      <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{mem.title}</h4>
                        <p className="text-slate-400 dark:text-slate-500 text-xs">{mem.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        );

      case TabView.ADD_MEMORY:
        return (
          <div className="pb-32 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 transition-colors">{t('add_memory_title')}</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
              <div className="flex flex-col items-center justify-center w-full h-48 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-500 group-hover:text-primary transition-colors">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">{t('choose_photo')}</p>
                <input type="file" className="hidden" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('form_title')}</label>
                  <input 
                    type="text" 
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({...newMemory, title: e.target.value})}
                    placeholder={t('form_title_placeholder')} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('form_desc')}</label>
                  <textarea 
                    value={newMemory.desc}
                    onChange={(e) => setNewMemory({...newMemory, desc: e.target.value})}
                    placeholder={t('form_desc_placeholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-32 resize-none transition-colors"
                  />
                </div>
                <button 
                  onClick={handleAddMemory}
                  className="w-full bg-primary hover:bg-rose-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95"
                >
                  {t('record_btn')}
                </button>
              </div>
            </div>
          </div>
        );

      case TabView.STORY:
        return (
          <div className="pb-32">
             <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('story_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('story_subtitle')}</p>
             </div>
            <StoryGenerator language={language} />
          </div>
        );

      case TabView.GROWTH:
        return (
          <div className="pb-32">
             <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('growth_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('growth_subtitle')}</p>
             </div>
            <GrowthChart data={MOCK_GROWTH_DATA} language={language} />
            
            <div className="mt-6 grid grid-cols-2 gap-4">
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_height')}</span>
                  <span className="text-2xl font-bold text-primary">76 cm</span>
               </div>
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_weight')}</span>
                  <span className="text-2xl font-bold text-accent">10.5 kg</span>
               </div>
            </div>
          </div>
        );
        
      case TabView.GALLERY:
        return (
          <GalleryGrid memories={memories} language={language} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans transition-colors duration-300">
      {/* Top Decoration */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent z-50 max-w-md mx-auto" />

      {/* Main Content Area */}
      <main className="px-5 pt-8 min-h-screen box-border">
        {renderContent()}
      </main>

      {/* Expanding Pill Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 flex items-center gap-1 z-50 max-w-sm w-[90%] mx-auto transition-colors duration-300">
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center justify-center gap-2 h-12 rounded-full transition-all duration-500 ease-spring overflow-hidden
                  ${isActive 
                    ? 'flex-[2.5] bg-slate-800 dark:bg-primary text-white shadow-md' 
                    : 'flex-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500'
                  }
                `}
             >
                 <tab.icon 
                   className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} 
                   strokeWidth={isActive ? 2.5 : 2}
                 />
                 
                 <div className={`
                    overflow-hidden transition-all duration-500 ease-spring
                    ${isActive ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4'}
                 `}>
                    <span className="text-[11px] font-bold whitespace-nowrap pr-1">
                      {t(tab.label)}
                    </span>
                 </div>
             </button>
           );
        })}
      </nav>
    </div>
  );
}

export default App;