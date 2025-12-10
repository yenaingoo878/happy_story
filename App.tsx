import React, { useState, useEffect, useRef } from 'react';
import { Home, PlusCircle, BookOpen, Activity, Camera, Image as ImageIcon, Baby, ChevronRight, Sparkles, Plus, Moon, Sun, Pencil, X, Settings, User, Trash2, ArrowLeft, Ruler, Scale, Calendar, Upload } from 'lucide-react';
import { MemoryCard } from './components/MemoryCard';
import { GrowthChart } from './components/GrowthChart';
import { StoryGenerator } from './components/StoryGenerator';
import { GalleryGrid } from './components/GalleryGrid';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { MOCK_MEMORIES, MOCK_GROWTH_DATA } from './constants';
import { Memory, TabView, Language, Theme, ChildProfile, GrowthData } from './types';
import { getTranslation } from './translations';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.HOME);
  const [settingsView, setSettingsView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES'>('MAIN');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  
  // Persistence for Memories
  const [memories, setMemories] = useState<Memory[]>(() => {
    const saved = localStorage.getItem('memories');
    return saved ? JSON.parse(saved) : MOCK_MEMORIES;
  });

  // Persistence for Child Profile
  const [childProfile, setChildProfile] = useState<ChildProfile>(() => {
    const saved = localStorage.getItem('childProfile');
    return saved ? JSON.parse(saved) : { name: '', dob: '', gender: 'boy' };
  });

  // Persistence for Growth Data
  const [growthData, setGrowthData] = useState<GrowthData[]>(() => {
    const saved = localStorage.getItem('growthData');
    return saved ? JSON.parse(saved) : MOCK_GROWTH_DATA;
  });

  // State for new growth record input in Settings
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [isEditingGrowth, setIsEditingGrowth] = useState(false);

  // Updated state to include imageUrl
  const [newMemory, setNewMemory] = useState<{title: string; desc: string; imageUrl?: string}>({ title: '', desc: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Persistence for Language
  const [language, setLanguage] = useState<Language>(() => {
     return (localStorage.getItem('language') as Language) || 'mm';
  });

  // Persistence for Theme
  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = (key: any) => getTranslation(language, key);

  // Effect to save Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Effect to save Language
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Effect to save Memories
  useEffect(() => {
    localStorage.setItem('memories', JSON.stringify(memories));
  }, [memories]);

  // Effect to save Child Profile
  useEffect(() => {
    localStorage.setItem('childProfile', JSON.stringify(childProfile));
  }, [childProfile]);

  // Effect to save Growth Data
  useEffect(() => {
    localStorage.setItem('growthData', JSON.stringify(growthData));
  }, [growthData]);

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

  const handleEditStart = (memory: Memory) => {
    setNewMemory({ title: memory.title, desc: memory.description, imageUrl: memory.imageUrl });
    setEditingId(memory.id);
    setActiveTab(TabView.ADD_MEMORY);
    setSettingsView('MAIN'); // Reset settings view
  };

  const handleCancelEdit = () => {
    setNewMemory({ title: '', desc: '' }); // Clears imageUrl as well
    setEditingId(null);
    setActiveTab(TabView.HOME);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMemory(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteMemory = (id: string) => {
     if (window.confirm(t('confirm_delete'))) {
        setMemories(prev => prev.filter(m => m.id !== id));
     }
  };

  const handleSaveMemory = () => {
    if (!newMemory.title) return;

    // Use uploaded image or fallback to random if creating new and no image selected
    // For editing, if no new image selected, we keep existing (handled by state)
    const finalImageUrl = newMemory.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`;

    if (editingId) {
      // Update existing memory
      const updatedMemories = memories.map(mem => 
        mem.id === editingId 
          ? { ...mem, title: newMemory.title, description: newMemory.desc, imageUrl: finalImageUrl }
          : mem
      );
      setMemories(updatedMemories);
    } else {
      // Create new memory
      const memory: Memory = {
        id: Date.now().toString(),
        title: newMemory.title,
        description: newMemory.desc,
        date: new Date().toISOString().split('T')[0],
        imageUrl: finalImageUrl,
        tags: ['New Memory']
      };
      setMemories([memory, ...memories]);
    }

    // Reset state
    setNewMemory({ title: '', desc: '' });
    setEditingId(null);
    setActiveTab(TabView.HOME);
  };

  const handleAddGrowthRecord = () => {
    if (newGrowth.month && newGrowth.height && newGrowth.weight) {
      // Check if month already exists, if so update it
      const existingIndex = growthData.findIndex(d => d.month === Number(newGrowth.month));
      let newData = [...growthData];
      
      if (existingIndex >= 0) {
        newData[existingIndex] = {
            month: Number(newGrowth.month),
            height: Number(newGrowth.height),
            weight: Number(newGrowth.weight)
        };
      } else {
        newData.push({ 
            month: Number(newGrowth.month), 
            height: Number(newGrowth.height), 
            weight: Number(newGrowth.weight) 
        });
      }
      
      // Sort by month
      newData.sort((a, b) => a.month - b.month);
      setGrowthData(newData);
      setNewGrowth({ month: undefined, height: undefined, weight: undefined });
      setIsEditingGrowth(false);
    }
  };

  const handleEditGrowthRecord = (data: GrowthData) => {
      setNewGrowth(data);
      setIsEditingGrowth(true);
  };

  const handleDeleteGrowthRecord = (index: number) => {
    setGrowthData(prev => prev.filter((_, i) => i !== index));
  };

  // Logic for Expandable Pill Nav Bar
  const tabs = [
    { id: TabView.HOME, icon: Home, label: 'nav_home' },
    { id: TabView.STORY, icon: BookOpen, label: 'nav_story' },
    { id: TabView.ADD_MEMORY, icon: PlusCircle, label: 'nav_create' },
    { id: TabView.GROWTH, icon: Activity, label: 'nav_growth' },
    { id: TabView.SETTINGS, icon: Settings, label: 'nav_settings' },
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
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                    {childProfile.name ? `${t('greeting')}, ${childProfile.name}` : t('greeting')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">{formattedDate}</p>
               </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Main Feature: Latest Memory (Span 2 columns) */}
              <div 
                className="col-span-2 relative h-64 rounded-[32px] overflow-hidden shadow-sm group cursor-pointer border border-transparent dark:border-slate-700"
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
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl">
                    {growthData[growthData.length - 1]?.height || 0} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">cm</span>
                  </h3>
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
                    <div 
                      key={mem.id} 
                      onClick={() => setSelectedMemory(mem)}
                      className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-xl transition-colors -mx-2"
                    >
                      <div className="flex items-center space-x-4">
                        <img src={mem.imageUrl} className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 dark:ring-slate-700" alt={mem.title} />
                        <div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{mem.title}</h4>
                          <p className="text-slate-400 dark:text-slate-500 text-xs">{mem.date}</p>
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
        return (
          <div className="pb-32 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">
                {editingId ? t('edit_memory_title') : t('add_memory_title')}
              </h2>
              {editingId && (
                <button 
                  onClick={handleCancelEdit}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                >
                  {t('cancel_btn')}
                </button>
              )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
              <div 
                onClick={triggerFileInput}
                className="relative w-full h-48 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group overflow-hidden"
              >
                {newMemory.imageUrl ? (
                  <>
                    <img 
                      src={newMemory.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
                         <Camera className="w-6 h-6" />
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-500 group-hover:text-primary transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">{t('choose_photo')}</p>
                  </div>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden" 
                />
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
                
                <div className="flex gap-3">
                  {editingId && (
                    <button 
                      onClick={handleCancelEdit}
                      className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95"
                    >
                      {t('cancel_btn')}
                    </button>
                  )}
                  <button 
                    onClick={handleSaveMemory}
                    className={`
                      ${editingId ? 'flex-[2]' : 'w-full'}
                      bg-primary hover:bg-rose-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95
                    `}
                  >
                    {editingId ? t('update_btn') : t('record_btn')}
                  </button>
                </div>
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
            <StoryGenerator language={language} defaultChildName={childProfile.name} />
          </div>
        );

      case TabView.GROWTH:
        return (
          <div className="pb-32">
             <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('growth_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('growth_subtitle')}</p>
             </div>
            <GrowthChart data={growthData} language={language} />
            
            <div className="mt-6 grid grid-cols-2 gap-4">
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_height')}</span>
                  <span className="text-2xl font-bold text-primary">
                    {growthData[growthData.length - 1]?.height || 0} cm
                  </span>
               </div>
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 text-xs mb-1">{t('current_weight')}</span>
                  <span className="text-2xl font-bold text-accent">
                    {growthData[growthData.length - 1]?.weight || 0} kg
                  </span>
               </div>
            </div>
          </div>
        );
        
      case TabView.GALLERY:
        return (
          <GalleryGrid 
            memories={memories} 
            language={language} 
            onMemoryClick={setSelectedMemory}
          />
        );
      
      case TabView.SETTINGS:
        // SUB-VIEW: GROWTH MANAGEMENT
        if (settingsView === 'GROWTH') {
           return (
              <div className="pb-32 animate-fade-in space-y-4">
                 <div className="flex items-center mb-6">
                    <button onClick={() => setSettingsView('MAIN')} className="p-2 mr-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                       <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                       <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_growth')}</h1>
                       <p className="text-slate-500 dark:text-slate-400 text-xs">{t('settings_subtitle')}</p>
                    </div>
                 </div>

                 {/* Add/Edit Form */}
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center">
                       {isEditingGrowth ? <Pencil className="w-4 h-4 mr-2 text-teal-500"/> : <PlusCircle className="w-4 h-4 mr-2 text-teal-500"/>}
                       {t('growth_input_title')}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                       <div>
                          <label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('month')}</label>
                          <div className="relative">
                            <input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.month || ''} onChange={e => setNewGrowth({...newGrowth, month: Number(e.target.value)})}/>
                             <Calendar className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('cm')}</label>
                          <div className="relative">
                             <input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.height || ''} onChange={e => setNewGrowth({...newGrowth, height: Number(e.target.value)})}/>
                             <Ruler className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold ml-1 mb-1 block">{t('kg')}</label>
                          <div className="relative">
                             <input type="number" className="w-full pl-3 pr-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800" value={newGrowth.weight || ''} onChange={e => setNewGrowth({...newGrowth, weight: Number(e.target.value)})}/>
                             <Scale className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                       </div>
                    </div>
                    <button 
                       onClick={handleAddGrowthRecord} 
                       className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center
                          ${isEditingGrowth ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-teal-500 hover:bg-teal-600'}
                       `}
                    >
                       {isEditingGrowth ? t('update_record') : t('add_record')}
                    </button>
                 </div>

                 {/* List */}
                 <div className="space-y-3">
                    {growthData.map((data, index) => (
                       <div key={index} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm border border-teal-100 dark:border-teal-800">
                                {data.month}
                             </div>
                             <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase">{t('months_label')}</p>
                                <div className="flex gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                   <span>{data.height} cm</span>
                                   <span className="text-slate-300 dark:text-slate-600">|</span>
                                   <span>{data.weight} kg</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleEditGrowthRecord(data)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg transition-colors"><Pencil className="w-4 h-4"/></button>
                             <button onClick={() => handleDeleteGrowthRecord(index)} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )
        }

        // SUB-VIEW: MEMORIES MANAGEMENT
        if (settingsView === 'MEMORIES') {
           return (
              <div className="pb-32 animate-fade-in space-y-4">
                 <div className="flex items-center mb-6">
                    <button onClick={() => setSettingsView('MAIN')} className="p-2 mr-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                       <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                       <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_memories')}</h1>
                       <p className="text-slate-500 dark:text-slate-400 text-xs">{t('gallery_subtitle')}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                   {memories.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                         <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                         <p className="text-sm">{t('no_photos')}</p>
                      </div>
                   ) : (
                      memories.map(mem => (
                        <div key={mem.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group transition-all hover:shadow-md">
                           <div className="flex items-center gap-3 overflow-hidden">
                              <img src={mem.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-slate-200" alt="" />
                              <div className="min-w-0">
                                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{mem.title}</p>
                                 <p className="text-xs text-slate-400 dark:text-slate-500">{mem.date}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={() => handleEditStart(mem)} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"><Pencil className="w-4 h-4"/></button>
                              <button onClick={() => handleDeleteMemory(mem.id)} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"><Trash2 className="w-4 h-4"/></button>
                           </div>
                        </div>
                      ))
                   )}
                </div>
              </div>
           )
        }

        // MAIN SETTINGS VIEW
        return (
          <div className="pb-32 animate-fade-in space-y-6">
             <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('settings_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('settings_subtitle')}</p>
             </div>

             {/* 1. Profile Card */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50 pb-3">
                   <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl mr-3 text-rose-500">
                      <Baby className="w-5 h-5" />
                   </div>
                   <h3 className="font-bold">{t('about_child')}</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                     <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('child_name')}</label>
                     <input 
                       type="text" 
                       value={childProfile.name}
                       onChange={(e) => setChildProfile({...childProfile, name: e.target.value})}
                       className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium"
                       placeholder="Baby Name"
                     />
                  </div>
                  <div className="relative">
                     <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute top-2 left-3">{t('child_dob')}</label>
                     <input 
                       type="date" 
                       value={childProfile.dob}
                       onChange={(e) => setChildProfile({...childProfile, dob: e.target.value})}
                       className="w-full px-3 pb-2 pt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors font-medium"
                     />
                  </div>
                </div>
             </div>

             {/* 2. Preferences Card */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center">
                   <Settings className="w-4 h-4 mr-2 text-slate-400" />
                   <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('app_settings')}</h3>
                </div>
                <div className="p-2">
                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mr-3">
                            <span className="text-xs font-bold">Aa</span>
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('language')}</span>
                      </div>
                      <button 
                        onClick={toggleLanguage}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-600 transition-colors"
                      >
                         {language === 'en' ? 'English' : 'မြန်မာ'}
                      </button>
                   </div>
                   
                   <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center mr-3">
                            <Moon className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('theme')}</span>
                      </div>
                      <button 
                        onClick={toggleTheme}
                        className={`
                           w-10 h-6 rounded-full transition-colors duration-300 flex items-center px-0.5
                           ${theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300'}
                        `}
                      >
                         <div className={`
                           w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300
                           ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}
                         `} />
                      </button>
                   </div>
                </div>
             </div>

             {/* 3. Data Management Menu */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center">
                   <Activity className="w-4 h-4 mr-2 text-slate-400" />
                   <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('data_management')}</h3>
                </div>
                <div className="p-2">
                    <button 
                       onClick={() => setSettingsView('GROWTH')}
                       className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                    >
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-500 flex items-center justify-center mr-3">
                            <Activity className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('manage_growth')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                   </button>

                   <button 
                       onClick={() => setSettingsView('MEMORIES')}
                       className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors text-left"
                    >
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center mr-3">
                            <ImageIcon className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('manage_memories')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                   </button>
                </div>
             </div>

          </div>
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

      {/* Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal 
          memory={selectedMemory} 
          onClose={() => setSelectedMemory(null)} 
        />
      )}

      {/* Expanding Pill Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 flex items-center gap-1 z-50 max-w-sm w-[90%] mx-auto transition-colors duration-300">
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => {
                   setActiveTab(tab.id);
                   if (tab.id === TabView.SETTINGS) setSettingsView('MAIN'); // Reset sub-nav on tab click
                }}
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