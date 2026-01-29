
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
    <div className="pb-24 animate-fade-in relative max-w-6xl mx-auto px-1">
       <div className="mb-6 md:mb-10 space-y-5 md:space-y-8">
          <div className="flex items-center justify-between px-1">
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 flex items-center transition-colors tracking-tight">
                  <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-3 text-rose-400" />
                  {t('gallery_title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mt-1.5 transition-colors">{t('gallery_subtitle')}</p>
            </div>
          </div>

          <div className="relative w-full max-w-xl group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder={t('search_placeholder')} 
              className="w-full pl-12 pr-4 py-4 sm:py-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[20px] sm:rounded-[24px] text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-200 shadow-sm" 
            />
          </div>
       </div>
       
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          {filteredMemories.map((memory) => (
            <div 
              key={memory.id} 
              onClick={() => onMemoryClick(memory)} 
              className="group relative rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-sm transition-all duration-500 hover:shadow-xl border border-white/40 dark:border-slate-700/50 cursor-pointer aspect-square active:scale-[0.97] bg-white dark:bg-slate-800"
            >
              {memory.imageUrls && memory.imageUrls.length > 0 ? (
                <img 
                  src={getImageSrc(memory.imageUrls[0])} 
                  alt={memory.title} 
                  className="w-full h-full object-cover transform transition-transform duration-1000 md:group-hover:scale-110" 
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 dark:text-slate-700"/>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4 sm:p-6 pointer-events-none text-left">
                <span className="text-white text-[8px] sm:text-[10px] font-black truncate uppercase tracking-[0.2em]">{memory.title}</span>
              </div>
            </div>
          ))}
       </div>
       
       {filteredMemories.length === 0 && (
         <div className="flex flex-col items-center justify-center py-32 text-slate-400/50">
           {searchTerm ? (
             <>
               <Search className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-10" />
               <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">No matches found</p>
             </>
           ) : (
             <>
               <ImageIcon className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-10" />
               <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">{t('no_photos')}</p>
             </>
           )}
         </div>
       )}
    </div>
  );
};
