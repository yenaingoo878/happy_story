import React from 'react';
import { Memory, Language } from '../types';
import { ImageIcon } from 'lucide-react';
import { getTranslation } from '../translations';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language }) => {
  const t = (key: any) => getTranslation(language, key);

  return (
    <div className="pb-24 animate-fade-in">
       <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center transition-colors">
            <ImageIcon className="w-6 h-6 mr-2 text-rose-400" />
            {t('gallery_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">{t('gallery_subtitle')}</p>
       </div>
       
       <div className="grid grid-cols-2 gap-3">
          {memories.map((memory, index) => (
            <div 
              key={memory.id} 
              className={`group relative rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer border border-transparent dark:border-slate-700
                ${index % 3 === 0 ? 'col-span-2 aspect-[2/1]' : 'col-span-1 aspect-square'}
              `}
            >
               <img 
                src={memory.imageUrl} 
                alt={memory.title} 
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                 <span className="text-white text-sm font-medium truncate">{memory.title}</span>
               </div>
            </div>
          ))}
       </div>
       
       {memories.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
           <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
           <p>{t('no_photos')}</p>
         </div>
       )}
    </div>
  );
};