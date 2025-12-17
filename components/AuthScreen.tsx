
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Baby, Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, UserCircle2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';

interface AuthScreenProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onGuestLogin: () => void; // New prop for guest mode
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ language, setLanguage, onGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (key: any) => getTranslation(language, key);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
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

          {/* Guest Mode Button */}
          <button 
            onClick={onGuestLogin}
            className="w-full py-3.5 mb-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <UserCircle2 className="w-5 h-5" />
            <span>{language === 'mm' ? 'အကောင့်မဝင်ဘဲ အသုံးပြုမည်' : 'Continue as Guest'}</span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-white dark:bg-slate-800 px-3 text-slate-400 dark:text-slate-500">{language === 'mm' ? 'သို့မဟုတ်' : 'OR'}</span>
            </div>
         </div>

         {/* Email/Password Form */}
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
                   type={showPassword ? "text" : "password"}
                   required
                   minLength={6}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                   placeholder={t('password')}
                 />
                 <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                 >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
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
