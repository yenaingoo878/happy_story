
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Language } from '../types';
import { getTranslation, translations } from '../utils/translations';

// FontAwesome Icon Bridge
const Baby = ({ className, style }: { className?: string; style?: React.CSSProperties }) => <i className={`fa-solid fa-baby flex items-center justify-center ${className}`} style={style} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin flex items-center justify-center ${className}`} />;
const Mail = ({ className }: { className?: string }) => <i className={`fa-solid fa-envelope flex items-center justify-center ${className}`} />;
const Lock = ({ className }: { className?: string }) => <i className={`fa-solid fa-lock flex items-center justify-center ${className}`} />;
const AlertCircle = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-exclamation flex items-center justify-center ${className}`} />;
const Eye = ({ className }: { className?: string }) => <i className={`fa-solid fa-eye flex items-center justify-center ${className}`} />;
const EyeOff = ({ className }: { className?: string }) => <i className={`fa-solid fa-eye-slash flex items-center justify-center ${className}`} />;
const LogIn = ({ className }: { className?: string }) => <i className={`fa-solid fa-right-to-bracket flex items-center justify-center ${className}`} />;
const UserCircle = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-user flex items-center justify-center ${className}`} />;

interface AuthScreenProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onGuestLogin: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ language, setLanguage, onGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const supabaseReady = isSupabaseConfigured();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseReady) return;
    
    if (!email || !password) {
      setError(language === 'mm' ? "အချက်အလက်များ ပြည့်စုံစွာ ဖြည့်ပါ။" : "Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert(language === 'mm' ? "အီးမေးလ်ကို စစ်ဆေးပြီး အတည်ပြုပေးပါ။" : "Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
       setError(err.message || t('auth_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-[100px] opacity-60"></div>

      <div className="absolute top-8 right-8 z-20">
         <button 
           onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} 
           className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2"
         >
            {language === 'mm' ? 'English' : 'မြန်မာ'}
         </button>
      </div>

      <div className="w-full max-w-sm text-center relative z-10 animate-fade-in">
         <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl mb-6 transform -rotate-3 overflow-hidden p-2 border border-slate-100 dark:border-slate-800">
                <Baby className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">Little Moments</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-60">Precious Memories</p>
         </div>

         <div className="bg-white dark:bg-slate-800 backdrop-blur-md p-8 rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-700/50">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-widest">
                {isSignUp ? t('sign_up') : t('sign_in')}
            </h2>

            {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center text-left text-rose-500 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 mr-3 shrink-0" />
                  {error}
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" placeholder={t('email')} />
                </div>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" placeholder={t('password')} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="relative w-full h-14 bg-slate-900 dark:bg-primary text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center overflow-hidden uppercase tracking-widest text-xs"
                >
                    {loading ? (
                        <div className="flex items-center justify-center w-full h-full">
                           <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <LogIn className="w-4 h-4"/> 
                            {isSignUp ? t('sign_up') : t('sign_in')}
                        </div>
                    )}
                </button>
            </form>

            <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
                {isSignUp ? t('have_account') : t('no_account')} <span className="text-primary underline underline-offset-4 ml-1">{isSignUp ? t('sign_in') : t('sign_up')}</span>
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-slate-800 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {language === 'mm' ? 'သို့မဟုတ်' : 'OR'}
                </span>
              </div>
            </div>

            <button 
              onClick={onGuestLogin}
              className="w-full py-4 bg-white dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 font-black rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
            >
              <UserCircle className="w-5 h-5" />
              {language === 'mm' ? 'ဧည့်သည်အဖြစ် အသုံးပြုမည်' : 'Continue as Guest'}
            </button>
         </div>
      </div>
    </div>
  );
};
