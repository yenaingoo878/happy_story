import React, { useState, useEffect } from 'react';
import { Memory, Language } from '../types';
import { X, Calendar, Tag, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface MemoryDetailModalProps {
  memory: Memory | null;
  language: Language;
  onClose: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({ memory, language, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const t = (key: any) => getTranslation(language, key);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md md:max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[90vh] z-[101]">
        
        <div className="relative h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
          {isImageLoading && hasImages && (
            <div className="absolute inset-0 flex items-center justify-center text-primary z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {hasImages && (
             <img 
              src={memory.imageUrls[currentIndex]} 
              alt={`${memory.title} - ${currentIndex + 1}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {hasImages && imageCount > 1 && (
            <>
              <button onClick={goToPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
                <ChevronLeft className="w-6 h-6"/>
              </button>
              <button onClick={goToNext} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
                <ChevronRight className="w-6 h-6"/>
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/30 text-white text-xs font-bold rounded-full backdrop-blur-md">
                {currentIndex + 1} / {imageCount}
              </div>
            </>
          )}
        </div>

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
        
      </div>
    </div>
  );
};