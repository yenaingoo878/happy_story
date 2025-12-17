
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Baby, Loader2, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface AuthScreenProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ language, setLanguage }) => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (key: any) => getTranslation(language, key);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || "Login failed");
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
       setError(err.message || t('auth_error'));
    } finally {
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

      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-8 rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm text-center border border-white/60 dark:border-slate-700 relative z-0 animate-zoom-in my-8">
         <div className="w-20 h-20 bg-gradient-to-br from-primary to-rose-400 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none animate-slide-up">
            <Baby className="w-10 h-10 text-white" strokeWidth={2.5} />
         </div>
         
         <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">{t('welcome_title')}</h1>
         <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed px-4">{t('welcome_subtitle')}</p>

         {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl flex items-center text-left text-rose-500 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

         <button 
           onClick={handleGoogleLogin}
           disabled={loading || googleLoading}
           className="w-full py-3.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-sm group mb-6"
         >
           {googleLoading ? (
             <Loader2 className="w-5 h-5 animate-spin text-primary" />
           ) : (
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
           )}
           <span className="text-sm font-bold">{googleLoading ? t('logging_in') : t('signin_google')}</span>
         </button>

         <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-white dark:bg-slate-800 px-3 text-slate-400 dark:text-slate-500">{t('or_email')}</span>
            </div>
         </div>

         <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div className="space-y-3">
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Mail className="h-4 w-4 text-slate-400" />
                 </div>
                 <input
                   type="email"
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                   placeholder={t('email')}
                 />
               </div>
               
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Lock className="h-4 w-4 text-slate-400" />
                 </div>
                 <input
                   type="password"
                   required
                   minLength={6}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                   placeholder={t('password')}
                 />
               </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 bg-primary hover:bg-rose-400 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? t('sign_up') : t('sign_in')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
         </form>

         <div className="mt-6">
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {isSignUp ? t('have_account') : t('no_account')} <span className="text-primary underline decoration-2 underline-offset-2">{isSignUp ? t('sign_in') : t('sign_up')}</span>
            </button>
         </div>

      </div>
    </div>
  );
};
