import React, { useEffect } from 'react';
import { X, Cloud, Download, Trash2, Loader2, Maximize2 } from 'lucide-react';
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
  // Strict Scroll Lock Logic - Ensures background gallery cannot scroll
  useEffect(() => {
    if (url) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; // Prevent pull-to-refresh and elastic scroll
      
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.touchAction = '';
      };
    }
  }, [url]);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 w-screen h-[100dvh] overflow-hidden">
      {/* Immersive Deep Backdrop - Total isolation from the background gallery */}
      <div 
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-[50px] transition-opacity duration-500 animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Standalone Floating Module Box - Centered and Elevated */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[92vw] md:max-w-lg h-[88dvh] rounded-[48px] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] animate-zoom-in flex flex-col z-[10000] border border-white/20 dark:border-slate-800">
        
        {/* Module Header - Detached from Grid */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-30 pointer-events-none">
           <div className="flex items-center gap-3 bg-black/50 backdrop-blur-3xl px-5 py-2.5 rounded-2xl border border-white/10 pointer-events-auto shadow-lg">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">
                {language === 'mm' ? 'Cloud သိုလှောင်မှု' : 'Secure Vault'}
              </span>
           </div>
           
           <button 
             onClick={onClose} 
             className="pointer-events-auto w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-2xl backdrop-blur-2xl flex items-center justify-center transition-all active:scale-90 border border-white/20 group shadow-xl"
           >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>

        {/* Media Canvas - Optimized for Focus */}
        <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <div className="w-20 h-20 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin" />
                <Cloud className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.5em] animate-pulse">
                {language === 'mm' ? 'ပုံဖော်နေသည်...' : 'Developing...'}
              </p>
            </div>
          ) : (
            <img 
              src={data || url} 
              className="w-full h-full object-contain select-none transition-all duration-700" 
              alt="Cloud Preview" 
            />
          )}
        </div>

        {/* Action Interaction Zone */}
        <div className="p-8 bg-white dark:bg-slate-900 shrink-0 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
             <div className="space-y-1">
                <h4 className="text-slate-800 dark:text-white font-black text-base tracking-tight">
                  {language === 'mm' ? 'အမှတ်တရ ပုံရိပ်လွှာ' : 'Precious Capture'}
                </h4>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {new Date().toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                   </p>
                </div>
             </div>
             
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = data || url;
                  link.download = `Memorable_${Date.now()}.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2.5 px-6 py-4 bg-sky-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-sky-500/30"
             >
                <Download className="w-4 h-4" />
                {language === 'mm' ? 'သိမ်းဆည်းမည်' : 'Save'}
             </button>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-[28px] text-[12px] uppercase tracking-[0.35em] active:scale-95 transition-all border border-slate-200 dark:border-slate-700/50"
            >
              {language === 'mm' ? 'ပြန်ထွက်မည်' : 'Dismiss'}
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="px-8 py-5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-[28px] flex items-center justify-center gap-2 active:scale-95 transition-all border border-rose-100 dark:border-rose-900/40"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};