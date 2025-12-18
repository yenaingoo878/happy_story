
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Baby, Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck, Heart } from 'lucide-react';
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
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await (supabase.auth as any).signUp({ email, password });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      } else {
        const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
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
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] opacity-60 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Language Switcher */}
      <div className="absolute top-8 right-8 z-20">
         <button 
           onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} 
           className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2"
         >
            <GlobeIcon className="w-3.5 h-3.5 text-slate-400" />
            {language === 'mm' ? 'English' : 'မြန်မာ'}
         </button>
      </div>

      <div className="w-full max-w-sm text-center relative z-10 animate-fade-in">
         {/* App Brand Section */}
         <div className="relative mb-10 inline-block">
            <div className="w-28 h-28 bg-gradient-to-br from-primary via-rose-300 to-rose-200 rounded-[38px] flex items-center justify-center shadow-2xl shadow-rose-200/50 dark:shadow-none animate-bounce-slow transform -rotate-6">
                <Baby className="w-14 h-14 text-white" strokeWidth={2} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center animate-pulse">
                <Heart className="w-4 h-4 text-primary fill-primary" />
            </div>
         </div>
         
         <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">Little Moments</h1>
         <p className="text-slate-500 dark:text-slate-400 mb-12 text-base leading-relaxed font-medium">
           {language === 'mm' ? 'သင့်ကလေးရဲ့ အဖိုးတန်တဲ့ အမှတ်တရလေးတွေကို လုံခြုံစွာ သိမ်းဆည်းထားလိုက်ပါ။' : 'Safely store and cherish every milestone of your child\'s growth.'}
         </p>

         <div className="space-y-4">
            {/* Primary Action Button */}
            <button 
              onClick={onGuestLogin}
              className="group w-full py-5 bg-slate-900 dark:bg-primary text-white font-extrabold rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-2xl shadow-slate-200 dark:shadow-primary/20 hover:shadow-primary/30"
            >
              <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
              <span className="text-lg">
                {language === 'mm' ? 'မှတ်တမ်းတင်ခြင်း စတင်မည်' : 'Start Your Journey'}
              </span>
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Trust/Privacy Indicator */}
            <div className="flex items-center justify-center gap-2.5 py-4 text-slate-400 dark:text-slate-500">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                 {language === 'mm' ? 'သင့်ဖုန်းထဲတွင်သာ လုံခြုံစွာသိမ်းဆည်းမည်' : 'Private • Saved Locally'}
               </span>
            </div>
         </div>

         {/* Advanced Login (Hidden if keys are missing, but available if user wants to check) */}
         {supabaseReady && (
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 animate-slide-up">
              <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 mb-8 uppercase tracking-[0.25em]">
                {language === 'mm' ? 'သို့မဟုတ် အကောင့်ဝင်၍ သိမ်းဆည်းမည်' : 'Cloud Synchronization'}
              </p>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center text-left text-rose-500 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 mr-3 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary"><Mail className="h-4 w-4 text-slate-400" /></div>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all" placeholder={t('email')} />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary"><Lock className="h-4 w-4 text-slate-400" /></div>
                      <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all" placeholder={t('password')} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"> {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-primary/40 text-slate-900 dark:text-primary font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center shadow-sm hover:bg-slate-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {isSignUp ? t('sign_up') : t('sign_in')} </>}
                  </button>
              </form>

              <div className="mt-8">
                  <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {isSignUp ? t('have_account') : t('no_account')} <span className="text-primary underline decoration-2 underline-offset-4 ml-1">{isSignUp ? t('sign_in') : t('sign_up')}</span>
                  </button>
              </div>
            </div>
          )}
      </div>
      
      {/* Visual Footer */}
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-40">
         <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.4em]">Handcrafted with Love</p>
      </div>
    </div>
  );
};

const GlobeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);
