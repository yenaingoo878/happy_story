
import React, { useState, useEffect } from 'react';
import { Memory, Language } from '../types';
import { X, Calendar, Tag, Loader2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { getTranslation, translations } from '../utils/translations';
import { getImageSrc } from '../lib/db';

interface MemoryDetailModalProps {
  memory: Memory | null;
  language: Language;
  onClose: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({ memory, language, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  // Background Scroll Lock
  useEffect(() => {
    if (memory) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.touchAction = '';
      };
    }
  }, [memory]);

  useEffect(() => {
    if (memory) {
      setCurrentIndex(0);
      setIsImageLoading(true);
    }
  }, [memory]);

  useEffect(() => {
    setIsImageLoading(true);
  }, [currentIndex]);
  
  if (!memory) return null;

  const hasImages = Array.isArray(memory.imageUrls) && memory.imageUrls.length > 0;
  const imageCount = hasImages ? memory.imageUrls.length : 0;

  const goToPrevious = () => {
    if (!hasImages) return;
    setCurrentIndex(prev => (prev === 0 ? imageCount - 1 : prev - 1));
  };
  const goToNext = () => {
    if (!hasImages) return;
    setCurrentIndex(prev => (prev === imageCount - 1 ? 0 : prev + 1));
  };

  const formatDate = (isoDate: string) => {
     if (!isoDate) return '';
     const parts = isoDate.split('-');
     if (parts.length !== 3) return isoDate;
     return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="fixed inset-0 z-[500000] flex items-center justify-center p-4 w-screen h-[100dvh] overflow-hidden">
      {/* Immersive Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-[60px] transition-opacity duration-500 animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Premium Module Box */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[92vw] md:max-w-lg h-[88dvh] rounded-[48px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] animate-zoom-in flex flex-col z-[500001] border border-white/20 dark:border-slate-800">
        
        {/* Media Canvas Area - Dominant 72% Height */}
        <div className="relative h-[72%] shrink-0 bg-slate-950 flex items-center justify-center overflow-hidden">
          {isImageLoading && hasImages && (
            <div className="absolute inset-0 flex items-center justify-center text-primary z-10">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {hasImages && (
             <img 
              src={getImageSrc(memory.imageUrls[currentIndex])} 
              alt={`${memory.title} - ${currentIndex + 1}`}
              className={`w-full h-full object-cover transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setIsImageLoading(false)}
            />
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-20 w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-2xl backdrop-blur-2xl flex items-center justify-center transition-all active:scale-90 border border-white/20"
          >
            <X className="w-6 h-6" />
          </button>

          {hasImages && imageCount > 1 && (
            <>
              <button onClick={goToPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/30 hover:bg-black/50 text-white rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all">
                <ChevronLeft className="w-6 h-6"/>
              </button>
              <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/30 hover:bg-black/50 text-white rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all">
                <ChevronRight className="w-6 h-6"/>
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/10 text-white text-[10px] font-black rounded-full backdrop-blur-3xl border border-white/10 tracking-widest">
                {currentIndex + 1} / {imageCount}
              </div>
            </>
          )}
        </div>

        {/* Content Details Area - Compact 28% Height */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
          <div className="p-5 overflow-y-auto grow no-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                 <div className="w-1 h-4 bg-primary rounded-full" />
                 <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">{memory.title}</h2>
              </div>
              <div className="flex items-center text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest shrink-0">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {formatDate(memory.date)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[24px] mb-4">
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                {memory.description}
              </p>
            </div>

            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {memory.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-xl text-[8px] font-black bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 uppercase tracking-widest">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions - Highly Compact */}
          <div className="px-5 pb-5 pt-2 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800/50 flex gap-3 shrink-0">
             <button 
                onClick={onClose} 
                className="flex-1 py-4 bg-slate-900 dark:bg-primary text-white font-black rounded-[22px] text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg"
             >
                {language === 'mm' ? 'ပြန်ထွက်မည်' : 'Close'}
             </button>
             <button className="w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-[18px] border border-rose-100 dark:border-rose-900/30 active:scale-95 transition-all">
                <Heart className="w-5 h-5 fill-rose-500" />
             </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};
