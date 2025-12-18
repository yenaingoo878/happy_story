
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Baby, Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
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
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-10">
         <button 
           onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} 
           className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
         >
            {language === 'mm' ? 'English' : 'မြန်မာ'}
         </button>
      </div>

      <div className="w-full max-w-sm text-center relative z-0 animate-zoom-in">
         {/* App Logo/Icon */}
         <div className="w-24 h-24 bg-gradient-to-br from-primary to-rose-300 rounded-[32px] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-rose-200 dark:shadow-none animate-bounce-slow">
            <Baby className="w-12 h-12 text-white" strokeWidth={2.5} />
         </div>
         
         <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">Little Moments</h1>
         <p className="text-slate-500 dark:text-slate-400 mb-10 text-base leading-relaxed font-medium">
           {language === 'mm' ? 'သင့်ကလေးရဲ့ အဖိုးတန်တဲ့ အမှတ်တရလေးတွေကို သိမ်းဆည်းထားလိုက်ပါ။' : 'Capture and cherish every step of your child\'s journey.'}
         </p>

         <div className="space-y-4">
            {/* Primary Action: Start Journey */}
            <button 
              onClick={onGuestLogin}
              className="w-full py-5 bg-slate-900 dark:bg-primary text-white font-extrabold rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-xl shadow-slate-200 dark:shadow-primary/20"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span className="text-lg">
                {language === 'mm' ? 'မှတ်တမ်းတင်ခြင်း စတင်မည်' : 'Start Your Journey'}
              </span>
            </button>

            {/* Reassuring Privacy Badge */}
            <div className="flex items-center justify-center gap-2 py-2 text-slate-400 dark:text-slate-500">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[11px] font-bold uppercase tracking-widest">
                 {language === 'mm' ? 'သင့်ဖုန်းထဲတွင်သာ လုံခြုံစွာသိမ်းဆည်းမည်' : 'Private & Saved Locally'}
               </span>
            </div>
         </div>

         {/* Advanced Options (Only shows if configured) */}
         {supabaseReady && (
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-6 uppercase tracking-widest">
                {language === 'mm' ? 'သို့မဟုတ် အကောင့်ဝင်၍ သိမ်းဆည်းမည်' : 'Or Sync to Cloud'}
              </p>

              {error && (
                <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl flex items-center text-left text-rose-500 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder={t('email')} />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400" /></div>
                      <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder={t('password')} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"> {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-primary text-slate-900 dark:text-primary font-extrabold rounded-2xl transition-all active:scale-95 flex items-center justify-center shadow-sm">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {isSignUp ? t('sign_up') : t('sign_in')} <ArrowRight className="w-5 h-5 ml-2" /> </>}
                  </button>
              </form>

              <div className="mt-6">
                  <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {isSignUp ? t('have_account') : t('no_account')} <span className="text-primary underline decoration-2 underline-offset-4 ml-1">{isSignUp ? t('sign_in') : t('sign_up')}</span>
                  </button>
              </div>
            </div>
          )}
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
         <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">Crafted for Parents</p>
      </div>
    </div>
  );
};
