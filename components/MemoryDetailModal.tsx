
import React, { useState, useEffect, useRef } from 'react';
import { Memory, Language } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { getImageSrc } from '../lib/db';

// FontAwesome Icon Bridge
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark flex items-center justify-center ${className}`} />;
const Calendar = ({ className }: { className?: string }) => <i className={`fa-solid fa-calendar-days flex items-center justify-center ${className}`} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin flex items-center justify-center ${className}`} />;
const ChevronLeft = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-left flex items-center justify-center ${className}`} />;
const ChevronRight = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-right flex items-center justify-center ${className}`} />;
const Heart = ({ className }: { className?: string }) => <i className={`fa-solid fa-heart flex items-center justify-center ${className}`} />;
const ImageIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-image flex items-center justify-center ${className}`} />;
const Tag = ({ className }: { className?: string }) => <i className={`fa-solid fa-tag flex items-center justify-center ${className}`} />;

interface MemoryDetailModalProps {
  memory: Memory | null;
  language: Language;
  onClose: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({ memory, language, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
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
    setIsImageLoading(true);
    setCurrentIndex(prev => (prev === 0 ? imageCount - 1 : prev - 1));
  };

  const goToNext = () => {
    if (!hasImages) return;
    setIsImageLoading(true);
    setCurrentIndex(prev => (prev === imageCount - 1 ? 0 : prev + 1));
  };

  // Swipe logic
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrevious();

    touchStartX.current = null;
    touchEndX.current = null;
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
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-[40px] transition-opacity duration-500 animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Premium Module Box */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[92vw] md:max-w-lg h-[90dvh] rounded-[48px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] animate-zoom-in flex flex-col z-[500001] border border-white/10 dark:border-slate-800">
        
        {/* Media Canvas Area - Dominant Height with Bottom Rounding */}
        <div 
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden touch-none rounded-b-[48px] shadow-2xl z-20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isImageLoading && hasImages && (
            <div className="absolute inset-0 flex items-center justify-center text-primary z-10">
              <Loader2 className="w-10 h-10 animate-spin opacity-50" />
            </div>
          )}
          
          {hasImages ? (
             <img 
              key={currentIndex}
              src={getImageSrc(memory.imageUrls[currentIndex])} 
              alt={`${memory.title} - ${currentIndex + 1}`}
              className={`w-full h-full object-cover object-center transition-all duration-500 transform ${isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              onLoad={() => setIsImageLoading(false)}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-700">
               <ImageIcon className="w-16 h-16 opacity-20" />
               <p className="text-xs font-black uppercase tracking-widest opacity-40">No Image</p>
            </div>
          )}
          
          {/* Close Button Overlay */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-20 w-12 h-12 bg-black/40 hover:bg-rose-500 text-white rounded-[20px] backdrop-blur-xl flex items-center justify-center transition-all active:scale-90 border border-white/10 shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Controls Overlay */}
          {hasImages && imageCount > 1 && (
            <>
              <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center">
                 <button onClick={goToPrevious} className="w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl flex items-center justify-center transition-all active:scale-75 border border-white/5">
                    <ChevronLeft className="w-6 h-6"/>
                 </button>
              </div>
              <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center">
                 <button onClick={goToNext} className="w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl flex items-center justify-center transition-all active:scale-75 border border-white/5">
                    <ChevronRight className="w-6 h-6"/>
                 </button>
              </div>

              {/* Dot Indicators */}
              <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2 pointer-events-none">
                 {memory.imageUrls.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-6 bg-primary shadow-[0_0_10px_rgba(255,154,162,0.8)]' : 'w-1.5 bg-white/30'}`} 
                    />
                 ))}
              </div>
              
              {/* Pagination text */}
              <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 text-white text-[10px] font-black rounded-xl backdrop-blur-xl border border-white/10 tracking-widest shadow-lg">
                {currentIndex + 1} / {imageCount}
              </div>
            </>
          )}
        </div>

        {/* Content Details Area - Changed to Flex with Scrolling Body */}
        <div className="bg-white dark:bg-slate-900 flex flex-col min-h-0 max-h-[45%] md:max-h-[40%]">
          {/* Sticky Header inside Content Area */}
          <div className="px-6 py-4 md:px-8 md:py-5 border-b border-slate-50 dark:border-slate-800/50 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                 <div className="w-1 h-5 bg-primary rounded-full shrink-0" />
                 <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 leading-tight tracking-tight truncate">
                   {memory.title}
                 </h2>
              </div>
              <div className="flex items-center text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest shrink-0 ml-4">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(memory.date)}
              </div>
            </div>
          </div>

          {/* Scrollable Body Container */}
          <div className="p-6 md:p-8 overflow-y-auto no-scrollbar flex-1">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[28px] mb-6 border border-slate-100 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {memory.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex items-center justify-between pb-4">
              <div className="flex flex-wrap gap-2">
                {memory.tags && memory.tags.length > 0 ? (
                  memory.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                      <Tag className="w-2.5 h-2.5 mr-1.5 text-slate-400" />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No tags</span>
                )}
              </div>
              
              <button className="w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-[20px] border border-rose-100 dark:border-rose-900/30 active:scale-95 transition-all shadow-sm shrink-0">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
