
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
    <div className="pb-24 animate-fade-in relative max-w-6xl mx-auto">
       <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center transition-colors tracking-tight">
                  <ImageIcon className="w-7 h-7 mr-3 text-rose-400" />
                  {t('gallery_title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1 transition-colors">{t('gallery_subtitle')}</p>
            </div>
          </div>

          <div className="relative max-w-lg mx-auto md:mx-0 px-2 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder={t('search_placeholder')} 
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-200 shadow-sm" 
            />
          </div>
       </div>
       
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-2">
          {filteredMemories.map((memory) => (
            <div 
              key={memory.id} 
              onClick={() => onMemoryClick(memory)} 
              className="group relative rounded-[32px] overflow-hidden shadow-sm transition-all duration-500 hover:shadow-xl border border-white dark:border-slate-700 cursor-pointer aspect-square active:scale-[0.97] bg-white dark:bg-slate-800"
            >
              {memory.imageUrls && memory.imageUrls.length > 0 ? (
                <img 
                  src={getImageSrc(memory.imageUrls[0])} 
                  alt={memory.title} 
                  className="w-full h-full object-cover transform transition-transform duration-1000 md:group-hover:scale-110" 
                />
              ) : (
                <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-slate-200 dark:text-slate-700"/>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6 pointer-events-none">
                <span className="text-white text-[10px] font-black truncate uppercase tracking-[0.2em]">{memory.title}</span>
              </div>
            </div>
          ))}
       </div>
       
       {filteredMemories.length === 0 && (
         <div className="flex flex-col items-center justify-center py-32 text-slate-400/50">
           {searchTerm ? (
             <>
               <Search className="w-16 h-16 mb-4 opacity-10" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No matches found</p>
             </>
           ) : (
             <>
               <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('no_photos')}</p>
             </>
           )}
         </div>
       )}
    </div>
  );
};
