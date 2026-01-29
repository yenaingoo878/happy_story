
import React, { useState, useMemo } from 'react';
import { Memory, Language } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { getImageSrc } from '../lib/db';

// FontAwesome Icon Bridge
const ImageIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-image ${className}`} />;
const Search = ({ className }: { className?: string }) => <i className={`fa-solid fa-magnifying-glass ${className}`} />;

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
  userId?: string;
  activeProfileId: string;
  requestDeleteConfirmation: (onConfirm: () => Promise<any>) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMemories = useMemo(() => {
     if (!searchTerm.trim()) return memories;
     const lowerTerm = searchTerm.toLowerCase();
     return memories.filter(mem => 
        mem.title.toLowerCase().includes(lowerTerm) ||
        (mem.tags && mem.tags.some(tag => tag.toLowerCase().includes(lowerTerm))) ||
        (mem.description && mem.description.toLowerCase().includes(lowerTerm))
     );
  }, [memories, searchTerm]);

  return (
    <div className="pb-12 animate-fade-in relative w-full max-w-7xl mx-auto">
       <div className="mb-4 md:mb-5 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 flex items-center transition-colors tracking-tight">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-rose-400" />
                  {t('gallery_title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-1 transition-colors">{t('gallery_subtitle')}</p>
            </div>
          </div>

          <div className="relative w-full max-w-xl group mx-auto md:mx-0">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder={t('search_placeholder')} 
              className="w-full pl-10 pr-4 py-3 sm:py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 dark:text-slate-200" 
            />
          </div>
       </div>
       
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {filteredMemories.map((memory) => (
            <div 
              key={memory.id} 
              onClick={() => onMemoryClick(memory)} 
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm transition-all duration-500 hover:shadow-xl border border-white/40 dark:border-slate-700/50 cursor-pointer aspect-square active:scale-[0.97] bg-white dark:bg-slate-800"
            >
              {memory.imageUrls && memory.imageUrls.length > 0 ? (
                <img src={getImageSrc(memory.imageUrls[0])} alt={memory.title} className="w-full h-full object-cover transform transition-transform duration-1000 md:group-hover:scale-110" loading="lazy"/>
              ) : (
                <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-slate-200 dark:text-slate-700"/>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500 flex items-end p-2 sm:p-4 pointer-events-none text-left">
                <span className="text-white text-[7px] sm:text-[8px] font-black truncate uppercase tracking-[0.2em]">{memory.title}</span>
              </div>
            </div>
          ))}
       </div>
    </div>
  );
};
