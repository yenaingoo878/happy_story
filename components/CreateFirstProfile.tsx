import React, { useState } from 'react';
import { Baby, ArrowRight, Loader2, User, Calendar } from 'lucide-react';
import { Language, ChildProfile } from '../types';
import { getTranslation, translations } from '../utils/translations';

interface CreateFirstProfileProps {
  language: Language;
  onProfileCreated: (profile: Omit<ChildProfile, 'id' | 'synced' | 'is_deleted'>) => void;
}

const FormField = ({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children?: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm w-full text-left">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </label>
    {children}
  </div>
);

const CreateFirstProfile: React.FC<CreateFirstProfileProps> = ({ language, onProfileCreated }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [name, setName] = useState('');
  const [dob, setDob] = useState(new Date().toISOString().split('T')[0]);
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setIsSaving(true);
    
    onProfileCreated({
      name: name.trim(),
      dob,
      gender,
    });
    // Parent component will handle saving and unmount this component.
  };

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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('child_name_label')} icon={User}>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder={language === 'mm' ? 'ဥပမာ - သားသား' : 'e.g., Sonny'}
              required
              className="w-full bg-transparent outline-none text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"/>
          </FormField>

          <FormField label={t('child_dob')} icon={Calendar}>
            <input 
              type="date" 
              value={dob} 
              onChange={e => setDob(e.target.value)} 
              required
              className="w-full bg-transparent outline-none text-base font-bold text-slate-800 dark:text-slate-100"/>
          </FormField>
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[24px] shadow-inner border border-slate-200 dark:border-slate-700/50">
             <button type="button" onClick={() => setGender('boy')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-sm font-black transition-all ${gender === 'boy' ? 'bg-white dark:bg-slate-700 text-primary shadow-md' : 'text-slate-400'}`}>{t('boy')}</button>
             <button type="button" onClick={() => setGender('girl')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-sm font-black transition-all ${gender === 'girl' ? 'bg-white dark:bg-slate-700 text-primary shadow-md' : 'text-slate-400'}`}>{t('girl')}</button>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving || !name.trim() || !dob}
              className="w-full max-w-xs mx-auto py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:shadow-none"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {t('create_first_profile')} <ArrowRight className="w-5 h-5" /> </>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFirstProfile;