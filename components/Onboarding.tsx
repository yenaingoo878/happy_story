import React from 'react';
import { Baby, ArrowRight, ChevronLeft } from 'lucide-react';
import { Language } from '../types';
import { getTranslation, translations } from '../utils/translations';

interface OnboardingProps {
  language: Language;
  onCreateProfile: () => void;
  onGoBackToLogin: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ language, onCreateProfile, onGoBackToLogin }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center animate-fade-in">
      <div className="w-full max-w-md">
        <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary/10">
          <Baby className="w-14 h-14 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
          {t('welcome_onboarding_title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mb-12">
          {t('welcome_onboarding_msg')}
        </p>
        <button
          onClick={onCreateProfile}
          className="w-full max-w-xs mx-auto py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          {t('create_first_profile')}
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={onGoBackToLogin}
          className="mt-8 text-xs font-bold text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('back_to_login')}
        </button>
      </div>
    </div>
  );
};
