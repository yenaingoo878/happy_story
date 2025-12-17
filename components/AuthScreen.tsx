
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Language } from '../types';
import { getTranslation } from '../translations';
import { Baby, Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onGuestMode: () => void;
  language: Language;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onGuestMode, language }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: any) => getTranslation(language, key);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || t('auth_error'));
    } finally {
      setLoading(false);
    }
  };

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
      console.error(error);
      setError(t('auth_error'));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-zoom-in relative overflow-hidden border border-white/50 dark:border-slate-700">
        
        {/* Background Decorations */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-200/50 dark:bg-rose-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-200/50 dark:bg-teal-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-rose-400 rounded-3xl rotate-3 mx-auto flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/40 mb-4 animate-slide-up">
              <Baby className="w-10 h-10 text-white -rotate-3" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('welcome_title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {t('welcome_subtitle')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-bold animate-fade-in">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button 
             type="button"
             onClick={handleGoogleLogin}
             disabled={loading || googleLoading}
             className="w-full py-4 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm group mb-6"
          >
             {googleLoading ? (
               <Loader2 className="w-5 h-5 animate-spin text-primary"/> 
             ) : (
               <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
             )}
             <span>{t('signin_google')}</span>
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-800 px-3 text-slate-400 font-bold tracking-wider">Or email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-4">
               <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white font-medium"
                    required
                  />
               </div>
               <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder={t('password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white font-medium"
                    required
                  />
               </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-4 bg-primary hover:bg-rose-400 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? t('sign_in') : t('sign_up')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Footer Actions */}
          <div className="mt-6 text-center space-y-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors"
            >
              {isLogin ? t('no_account') : t('have_account')} <span className="font-bold text-primary">{isLogin ? t('sign_up') : t('sign_in')}</span>
            </button>
            
            <button
              onClick={onGuestMode}
              className="block w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-wide"
            >
              {t('guest_mode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
