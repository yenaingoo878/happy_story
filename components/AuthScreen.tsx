
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Baby, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface AuthScreenProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ language, setLanguage }) => {
  const [loading, setLoading] = useState(false);
  const t = (key: any) => getTranslation(language, key);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/30 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-secondary/30 rounded-full blur-3xl opacity-50"></div>

      {/* Language Toggle (Floating) */}
      <div className="absolute top-6 right-6 z-10">
         <button 
            onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} 
            className="bg-white/40 backdrop-blur-md border border-white/50 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-white/50 transition-all"
         >
            {language === 'mm' ? 'English' : 'မြန်မာ'}
         </button>
      </div>

      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm text-center border border-white/60 dark:border-slate-700 relative z-0 animate-zoom-in">
         <div className="w-24 h-24 bg-gradient-to-br from-primary to-rose-400 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none animate-slide-up">
            <Baby className="w-12 h-12 text-white" strokeWidth={2.5} />
         </div>
         
         <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">{t('welcome_title')}</h1>
         <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm leading-relaxed px-4">{t('welcome_subtitle')}</p>

         <button 
           onClick={handleGoogleLogin}
           disabled={loading}
           className="w-full py-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-sm group"
         >
           {loading ? (
             <Loader2 className="w-5 h-5 animate-spin text-primary" />
           ) : (
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
           )}
           <span className="text-sm font-bold">{loading ? t('logging_in') : t('signin_google')}</span>
         </button>
      </div>
    </div>
  );
};
