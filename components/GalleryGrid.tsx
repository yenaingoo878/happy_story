
import React, { useState, useMemo } from 'react';
import { Memory, Language } from '../types';
import { Image as ImageIcon, Search, Calendar, Filter, X } from 'lucide-react';
import { getTranslation } from '../translations';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick }) => {
  const t = (key: any) => getTranslation(language, key);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Extract Unique Tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    memories.forEach(m => {
        if(m.tags) m.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags);
  }, [memories]);

  // Filter Logic
  const filteredMemories = useMemo(() => {
    return memories.filter(memory => {
        // 1. Text Search (Title or Description)
        const query = searchQuery.toLowerCase();
        const matchesText = (memory.title?.toLowerCase().includes(query) || 
                             memory.description?.toLowerCase().includes(query));

        // 2. Date Range
        const matchesStart = startDate ? memory.date >= startDate : true;
        const matchesEnd = endDate ? memory.date <= endDate : true;

        // 3. Tag
        const matchesTag = selectedTag ? memory.tags?.includes(selectedTag) : true;

        return matchesText && matchesStart && matchesEnd && matchesTag;
    });
  }, [memories, searchQuery, startDate, endDate, selectedTag]);

  // Clear Filters
  const clearFilters = () => {
      setSearchQuery('');
      setStartDate('');
      setEndDate('');
      setSelectedTag('');
  };

  const hasActiveFilters = searchQuery || startDate || endDate || selectedTag;

  return (
    <div className="pb-24 animate-fade-in">
       <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center transition-colors">
            <ImageIcon className="w-6 h-6 mr-2 text-rose-400" />
            {t('gallery_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('gallery_subtitle')}</p>
       </div>

       {/* Search & Filter Bar */}
       <div className="mb-6 space-y-3">
          {/* Search Input */}
          <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-900/40 transition-shadow shadow-sm"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <X className="w-4 h-4" />
                  </button>
              )}
          </div>

          <div className="flex justify-between items-center">
             <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center text-xs font-bold px-3 py-2 rounded-xl transition-colors ${showFilters || hasActiveFilters ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
             >
                 <Filter className="w-3.5 h-3.5 mr-1.5" />
                 {t('filter_options')}
             </button>

             {hasActiveFilters && (
                 <button onClick={clearFilters} className="text-xs font-bold text-rose-400 hover:text-rose-500 transition-colors">
                     {t('cancel_btn')}
                 </button>
             )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-3 animate-zoom-in">
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1 block">{t('filter_date_start')}</label>
                          <div className="relative">
                              <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                              />
                              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1 block">{t('filter_date_end')}</label>
                          <div className="relative">
                              <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                              />
                              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1 block">{t('tags_label')}</label>
                      <select 
                        value={selectedTag} 
                        onChange={(e) => setSelectedTag(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                      >
                          <option value="">{t('all_tags')}</option>
                          {allTags.map(tag => (
                              <option key={tag} value={tag}>{tag}</option>
                          ))}
                      </select>
                  </div>
              </div>
          )}
       </div>
       
       {/* Grid */}
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMemories.map((memory) => (
            <div 
              key={memory.id} 
              onClick={() => onMemoryClick(memory)}
              className="group relative rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md border border-transparent dark:border-slate-700 cursor-pointer aspect-square"
            >
               <img 
                src={memory.imageUrl} 
                alt={memory.title} 
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none">
                 <div className="w-full flex justify-between items-end">
                    <span className="text-white text-sm font-medium truncate">{memory.title}</span>
                 </div>
               </div>
            </div>
          ))}
       </div>
       
       {filteredMemories.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
           <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
           <p>{t('no_photos')}</p>
         </div>
       )}
    </div>
  );
};
