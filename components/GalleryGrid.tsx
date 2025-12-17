
import React, { useState, useMemo } from 'react';
import { Memory, Language } from '../types';
import { Image as ImageIcon, Search } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick }) => {
  const t = (key: any) => getTranslation(language, key);
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
    <div className="pb-24 animate-fade-in">
       <div className="mb-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center transition-colors">
                <ImageIcon className="w-6 h-6 mr-2 text-rose-400" />
                {t('gallery_title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('gallery_subtitle')}</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
             </div>
             <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-200"
             />
          </div>
       </div>
       
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredMemories.map((memory, index) => (
            <div 
              key={memory.id} 
              onClick={() => onMemoryClick(memory)}
              className={`group relative rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md border border-transparent dark:border-slate-700 cursor-pointer
                aspect-square
              `}
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
           {searchTerm ? (
               <>
                <Search className="w-12 h-12 mb-2 opacity-50" />
                <p>No matches found</p>
               </>
           ) : (
               <>
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <p>{t('no_photos')}</p>
               </>
           )}
         </div>
       )}
    </div>
  );
};
