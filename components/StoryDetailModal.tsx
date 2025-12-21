
import React from 'react';
import { Story, Language } from '../types';
import { X, Calendar, BookOpen, Trash2 } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface StoryDetailModalProps {
  story: Story | null;
  language: Language; 
  onClose: () => void;
  onDelete: () => void;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({ story, language, onClose, onDelete }) => {
  if (!story) return null;
  const t = (key: any) => getTranslation(language, key);

  const formatDate = (isoDate: string) => {
     if (!isoDate) return '';
     const parts = isoDate.split('-');
     if (parts.length !== 3) return isoDate;
     return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="relative bg-[#FCFBF4] dark:bg-slate-900 w-full max-w-md md:max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[90vh] z-[101]">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-200 backdrop-blur-md">
          <X className="w-5 h-5" />
        </button>

        <div className="pt-16 pb-8 px-8 shrink-0 text-center border-b border-slate-100 dark:border-slate-800">
             <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-500 mx-auto mb-4">
                <BookOpen className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight mb-2 font-serif">{story.title}</h2>
             <div className="flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-widest">
                <Calendar className="w-3 h-3 mr-1.5" />
                {formatDate(story.date)}
             </div>
        </div>

        <div className="p-8 overflow-y-auto grow font-serif">
          <div className="prose prose-slate dark:prose-invert max-w-none prose-lg">
            <p className="text-slate-700 dark:text-slate-300 text-xl leading-relaxed italic border-l-4 border-violet-100 dark:border-violet-900/50 pl-6 whitespace-pre-wrap">
              {story.content}
            </p>
          </div>
        </div>

        <div className="p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-3">
           <button onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all">Close Ebook</button>
           <button onClick={() => { onDelete(); onClose(); }} className="px-6 py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              {t('delete')}
           </button>
        </div>
      </div>
    </div>
  );
};
