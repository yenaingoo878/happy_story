import React from 'react';
import { Memory, Language } from '../types';
import { X, Calendar, Tag, Pencil, Trash2 } from 'lucide-react';
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
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md md:max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[90vh] z-[101]">
        
        {/* Image Section */}
        <div className="relative h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 shrink-0">
          <img 
            src={memory.imageUrl} 
            alt={memory.title} 
            className="w-full h-full object-cover"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Section (Scrollable) */}
        <div className="p-6 overflow-y-auto grow">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight mb-2">{memory.title}</h2>
          
          <div className="flex items-center text-slate-400 dark:text-slate-500 text-sm font-bold mb-6">
            <Calendar className="w-4 h-4 mr-2" />
            {formatDate(memory.date)}
          </div>

          <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6 whitespace-pre-wrap">
            {memory.description}
          </p>

          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {memory.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with actions */}
        <div className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
            <button 
                onClick={onEdit}
                className="flex-1 py-4 bg-primary/10 text-primary font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" />
                {t('edit')}
            </button>
            <button 
                onClick={() => { onDelete(); onClose(); }} 
                className="px-6 py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>

      </div>
    </div>
  );
};
