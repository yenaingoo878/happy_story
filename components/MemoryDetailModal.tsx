
import React from 'react';
import { Memory, Language } from '../types';
import { X, Calendar, Tag } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface MemoryDetailModalProps {
  memory: Memory | null;
  language: Language; 
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({ memory, language, onClose, onEdit, onDelete }) => {
  if (!memory) return null;
  const t = (key: any) => getTranslation(language, key);

  // Helper to ensure dd/mm/yyyy format
  const formatDate = (isoDate: string) => {
     if (!isoDate) return '';
     const parts = isoDate.split('-');
     if (parts.length !== 3) return isoDate;
     return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md md:max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[90vh] z-[101]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {memory.imageUrl && (
          <div className="relative h-72 sm:h-96 bg-slate-100 dark:bg-slate-800 shrink-0">
            <img 
              src={memory.imageUrl} 
              alt={memory.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-6 text-white w-full">
              <h2 className="text-2xl font-bold leading-tight mb-2 drop-shadow-sm">{memory.title}</h2>
              <div className="flex items-center text-white/90 text-sm font-medium">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(memory.date)}
              </div>
            </div>
          </div>
        )}

        <div className="p-8 overflow-y-auto grow">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
              {memory.description}
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-50 dark:border-slate-800 flex flex-wrap gap-2">
            {memory.tags?.map(tag => (
              <span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-transparent dark:border-slate-700">
                <Tag className="w-3 h-3 mr-1.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <button onClick={() => { onEdit(); onClose(); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all">{t('edit')}</button>
            <button onClick={() => { onDelete(); onClose(); }} className="px-6 py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all">{t('delete')}</button>
        </div>
      </div>
    </div>
  );
};
