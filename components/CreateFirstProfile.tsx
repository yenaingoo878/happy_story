import React, { useState } from 'react';
import { ChildProfile, Language } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { User, Calendar, Baby, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';

interface CreateFirstProfileProps {
  language: Language;
  onProfileCreated: (profileData: Omit<ChildProfile, 'id'>) => void;
  onGoBackToLogin: () => void;
}

// Simple input component to maintain style consistency
const FormInput = ({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
        <Icon className="w-5 h-5 text-slate-400" />
        <div className="flex-1 text-left">
            <label className="block text-xs font-bold text-slate-400 mb-1">{label}</label>
            {children}
        </div>
    </div>
);


export const CreateFirstProfile: React.FC<CreateFirstProfileProps> = ({ language, onProfileCreated, onGoBackToLogin }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  const [name, setName] = useState('');
  const [dob, setDob] = useState(new Date().toISOString().split('T')[0]);
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) {
        setError(language === 'mm' ? 'အမည်နှင့် မွေးသက္ကရာဇ် လိုအပ်ပါသည်။' : 'Name and date of birth are required.');
        return;
    }
    setIsLoading(true);
    setError('');

    const profileData: Omit<ChildProfile, 'id'> = {
        name: name.trim(),
        dob,
        gender
    };

    try {
        await onProfileCreated(profileData);
    } catch (err) {
        setError(language === 'mm' ? 'ပရိုဖိုင်ဖန်တီး၍မရပါ။' : 'Could not create profile.');
        setIsLoading(false);
    }
    // No need to setIsLoading(false) on success, as the component will unmount.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center animate-fade-in">
        <div className="w-full max-w-md">
            <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary/10">
                <Baby className="w-14 h-14 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
                {t('create_first_profile')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mb-12">
                {t('welcome_onboarding_msg')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label={t('child_name_label')} icon={User}>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent outline-none font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                        placeholder={t('child_name_placeholder')}
                        required
                    />
                </FormInput>

                <FormInput label={t('child_dob')} icon={Calendar}>
                    <input 
                        type="date" 
                        value={dob} 
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-transparent outline-none font-bold text-slate-800 dark:text-slate-100"
                        required
                    />
                </FormInput>

                <FormInput label={t('gender_label')} icon={Baby}>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                        <button type="button" onClick={() => setGender('boy')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${gender === 'boy' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500'}`}>{t('boy')}</button>
                        <button type="button" onClick={() => setGender('girl')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${gender === 'girl' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500'}`}>{t('girl')}</button>
                    </div>
                </FormInput>

                {error && <p className="text-xs text-rose-500 text-center pt-2">{error}</p>}
                
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                           <>
                            {t('create_first_profile')}
                            <ArrowRight className="w-5 h-5" />
                           </>
                        )}
                    </button>
                </div>
            </form>

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