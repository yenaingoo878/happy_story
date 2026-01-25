
import React, { useEffect } from 'react';
import { Language } from '../types';

// FontAwesome Icon Bridge with Centering
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark flex items-center justify-center ${className}`} />;
const Cloud = ({ className }: { className?: string }) => <i className={`fa-solid fa-cloud flex items-center justify-center ${className}`} />;
const Download = ({ className }: { className?: string }) => <i className={`fa-solid fa-download flex items-center justify-center ${className}`} />;
const Trash2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-trash-can flex items-center justify-center ${className}`} />;

interface CloudPhotoModalProps {
  url: string | null;
  data: string | null;
  isLoading: boolean;
  language: Language;
  onClose: () => void;
  onDelete: () => void;
}

export const CloudPhotoModal: React.FC<CloudPhotoModalProps> = ({ 
  url, data, isLoading, language, onClose, onDelete 
}) => {
  // Ultra-Strict Scroll Lock Logic
  useEffect(() => {
    if (url) {
      const root = document.getElementById('root');
      const originalBodyOverflow = document.body.style.overflow;
      const originalRootOverflow = root ? root.style.overflow : '';

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; 
      
      if (root) {
        root.style.overflow = 'hidden';
        root.style.touchAction = 'none';
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.touchAction = '';
        if (root) {
          root.style.overflow = originalRootOverflow;
          root.style.touchAction = '';
        }
      };
    }
  }, [url]);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 md:p-8 w-screen h-[100dvh] overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-950/98 backdrop-blur-[60px] transition-opacity duration-700 animate-fade-in cursor-default" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[92vw] md:max-w-xl h-[88dvh] rounded-[54px] overflow-hidden shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] animate-zoom-in flex flex-col z-[100001] border border-white/10 dark:border-slate-800">
        
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
           <div className="flex items-center gap-3 bg-black/40 backdrop-blur-2xl px-5 py-2.5 rounded-2xl border border-white/10 pointer-events-auto shadow-xl">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">
                {language === 'mm' ? 'Cloud သိုလှောင်မှု' : 'Secure Vault'}
              </span>
           </div>
           
           <button 
             onClick={onClose} 
             className="pointer-events-auto w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-[18px] backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90 border border-white/20 shadow-xl group"
           >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>

        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute w-16 h-16 border-[6px] border-sky-500/10 border-t-sky-500 rounded-full animate-spin" />
                <div className="relative w-8 h-8 flex items-center justify-center text-white">
                  <Cloud className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] animate-pulse">
                {language === 'mm' ? 'ပုံဖော်နေသည်...' : 'Developing...'}
              </p>
            </div>
          ) : (
            <img 
              src={data || url} 
              className="w-full h-full object-cover object-center select-none transition-transform duration-1000 animate-zoom-in" 
              alt="Cloud Memory" 
            />
          )}
        </div>

        <div className="p-6 md:p-8 bg-white dark:bg-slate-900 shrink-0 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-6 shadow-[0_-15px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between px-1">
             <div className="space-y-1.5 min-w-0">
                <h4 className="text-slate-800 dark:text-white font-black text-base tracking-tight leading-none truncate pr-2">
                  {language === 'mm' ? 'အမှတ်တရ ပုံရိပ်လွှာ' : 'Precious Moment'}
                </h4>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                     {new Date().toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                   </p>
                </div>
             </div>
             
             <div className="flex gap-3">
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = document.createElement('a');
                    link.href = data || url;
                    link.download = `Memorable_Moments_${Date.now()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-14 h-14 flex items-center justify-center bg-sky-500 text-white rounded-[20px] active:scale-95 transition-all shadow-xl shadow-sky-500/20 border-b-2 border-sky-600 shrink-0"
               >
                  <Download className="w-6 h-6" />
               </button>

               <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="w-14 h-14 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-[24px] flex items-center justify-center shrink-0 active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30"
              >
                <Trash2 className="w-6 h-6" />
              </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
