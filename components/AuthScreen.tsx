
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Baby, Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck, Heart, LogIn, UserCircle } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';

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

  const t = (key: any) => getTranslation(language, key);
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
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-[100px] opacity-60"></div>

      {/* Language Switcher */}
      <div className="absolute top-8 right-8 z-20">
         <button 
           onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} 
           className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2"
         >
            {language === 'mm' ? 'English' : 'မြန်မာ'}
         </button>
      </div>

      <div className="w-full max-w-sm text-center relative z-10 animate-fade-in">
         {/* Brand */}
         <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl mb-6 transform -rotate-3 overflow-hidden p-2">
                <img src="/logo.png" className="w-full h-full object-contain" alt="Logo"/>
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Little Moments</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-2 opacity-60">Precious Memories</p>
         </div>

         {/* Email Login Form (Primary) */}
         <div className="bg-white dark:bg-slate-800/50 backdrop-blur-md p-8 rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-700/50 mb-8">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-6">
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
                    <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" placeholder={t('email')} />
                </div>
                <div className="relative group">
                    <Lock className="absolute left-4 top-4 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" placeholder={t('password')} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300 hover:text-slate-500">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 dark:bg-primary text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5"/> {isSignUp ? t('sign_up') : t('sign_in')}</>}
                </button>
            </form>

            <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-xs font-bold text-slate-400 hover:text-primary transition-colors">
                {isSignUp ? t('have_account') : t('no_account')} <span className="text-primary underline underline-offset-4 ml-1">{isSignUp ? t('sign_in') : t('sign_up')}</span>
            </button>
         </div>

         {/* Guest Mode (Secondary) */}
         <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-4">
                {language === 'mm' ? 'သို့မဟုတ်' : 'OR'}
            </p>
            <button 
              onClick={onGuestLogin}
              className="w-full py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <UserCircle className="w-5 h-5" />
              {language === 'mm' ? 'ဧည့်သည်အဖြစ် အသုံးပြုမည်' : 'Continue as Guest'}
            </button>
            
            <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <span className="text-[10px] font-bold uppercase tracking-widest">
                 {language === 'mm' ? 'သင့်ဖုန်းထဲတွင်သာ သိမ်းဆည်းမည်' : 'Private • Saved Locally'}
               </span>
            </div>
         </div>
      </div>
    </div>
  );
};
