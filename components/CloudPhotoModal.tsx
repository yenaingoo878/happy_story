import React, { useEffect } from 'react';
import { X, Cloud, Download, Trash2, Loader2 } from 'lucide-react';
import { Language } from '../types';

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

      // Forcefully lock all scrolling containers
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; // Lock mobile gestures
      
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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-8 w-screen h-[100dvh] overflow-hidden">
      {/* Absolute Backdrop Isolation - Deep Blur & Dark Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/98 backdrop-blur-[80px] transition-opacity duration-700 animate-fade-in cursor-default" 
        onClick={onClose} 
      />
      
      {/* Centered Standalone Module Box - The Floating Island */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[92vw] md:max-w-xl h-[85dvh] rounded-[54px] overflow-hidden shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] animate-zoom-in flex flex-col z-[100001] border border-white/10 dark:border-slate-800">
        
        {/* Isolated Float Header */}
        <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-50 pointer-events-none">
           <div className="flex items-center gap-3.5 bg-black/40 backdrop-blur-3xl px-6 py-3 rounded-2xl border border-white/10 pointer-events-auto shadow-2xl">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                {language === 'mm' ? 'Cloud သိုလှောင်မှု' : 'Secure Vault'}
              </span>
           </div>
           
           <button 
             onClick={onClose} 
             className="pointer-events-auto w-14 h-14 bg-white/10 hover:bg-rose-500 text-white rounded-[22px] backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90 border border-white/20 shadow-2xl group"
           >
              <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>

        {/* Media Canvas - The Focus Point */}
        <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-10">
              <div className="relative">
                <div className="w-24 h-24 border-[8px] border-sky-500/10 border-t-sky-500 rounded-full animate-spin shadow-2xl" />
                <Cloud className="w-10 h-10 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.6em] animate-pulse">
                {language === 'mm' ? 'ပုံဖော်နေသည်...' : 'Developing...'}
              </p>
            </div>
          ) : (
            <img 
              src={data || url} 
              className="w-full h-full object-contain select-none transition-transform duration-1000 animate-zoom-in" 
              alt="Cloud Memory" 
            />
          )}
        </div>

        {/* Action & Detail Interaction Zone */}
        <div className="p-8 md:p-10 bg-white dark:bg-slate-900 shrink-0 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-8 shadow-[0_-30px_60px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between px-2">
             <div className="space-y-2">
                <h4 className="text-slate-800 dark:text-white font-black text-lg tracking-tight leading-none">
                  {language === 'mm' ? 'အမှတ်တရ ပုံရိပ်လွှာ' : 'Precious Moment'}
                </h4>
                <div className="flex items-center gap-2.5">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                     {new Date().toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                   </p>
                </div>
             </div>
             
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
                className="w-16 h-16 flex items-center justify-center bg-sky-500 text-white rounded-[24px] active:scale-95 transition-all shadow-2xl shadow-sky-500/40 border-b-4 border-sky-600"
             >
                <Download className="w-7 h-7" />
             </button>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-black rounded-[32px] text-[12px] uppercase tracking-[0.4em] active:scale-95 transition-all border border-slate-200 dark:border-slate-700/50"
            >
              {language === 'mm' ? 'ပြန်ထွက်မည်' : 'Dismiss'}
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="px-10 py-5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-[32px] flex items-center justify-center gap-2 active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};