
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
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: any) => getTranslation(language, key);

  const handleAuth = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-zoom-in relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100 dark:bg-rose-900/20 rounded-bl-[100px] -mr-8 -mt-8 z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-100 dark:bg-teal-900/20 rounded-tr-[80px] -ml-8 -mb-8 z-0 pointer-events-none" />

        <div className="relative z-10">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-300 to-rose-400 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/40 mb-4 animate-slide-up">
              <Baby className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('welcome_title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {t('welcome_subtitle')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl flex items-center text-rose-500 text-sm font-medium animate-fade-in">
              <ShieldCheck className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative group">
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-rose-400 transition-colors" />
              <input
                type="email"
                placeholder={t('email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-800 focus:border-rose-400 outline-none transition-all dark:text-white"
                required
              />
            </div>
            
            <div className="relative group">
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-rose-400 transition-colors" />
              <input
                type="password"
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-800 focus:border-rose-400 outline-none transition-all dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-rose-400 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center mt-2"
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

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {isLogin ? t('no_account') : t('have_account')}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 ml-1 transition-colors"
              >
                {isLogin ? t('sign_up') : t('sign_in')}
              </button>
            </p>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="px-4 text-xs font-bold text-slate-400 uppercase">Or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
          </div>

          {/* Guest Mode */}
          <button
            onClick={onGuestMode}
            className="w-full py-3.5 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex flex-col items-center justify-center"
          >
            <span>{t('guest_mode')}</span>
            <span className="text-[10px] font-normal text-slate-400 mt-0.5">{t('guest_desc')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

