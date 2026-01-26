
import React, { useState } from 'react';
import { Language, ChildProfile } from '../types';
import { getTranslation, translations } from '../utils/translations';

// FontAwesome Icon Bridge
const Baby = ({ className }: { className?: string }) => <i className={`fa-solid fa-baby flex items-center justify-center ${className}`} />;
const ArrowRight = ({ className }: { className?: string }) => <i className={`fa-solid fa-arrow-right flex items-center justify-center ${className}`} />;
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark flex items-center justify-center ${className}`} />;
const User = ({ className }: { className?: string }) => <i className={`fa-solid fa-user flex items-center justify-center ${className}`} />;
const Calendar = ({ className }: { className?: string }) => <i className={`fa-solid fa-calendar-days flex items-center justify-center ${className}`} />;
const Save = ({ className }: { className?: string }) => <i className={`fa-solid fa-floppy-disk flex items-center justify-center ${className}`} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin flex items-center justify-center ${className}`} />;
const ChevronDown = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-down flex items-center justify-center ${className}`} />;
const Clock = ({ className }: { className?: string }) => <i className={`fa-solid fa-clock flex items-center justify-center ${className}`} />;
const LogOut = ({ className }: { className?: string }) => <i className={`fa-solid fa-right-from-bracket flex items-center justify-center ${className}`} />;
const Building2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-hospital flex items-center justify-center ${className}`} />;
const MapPin = ({ className }: { className?: string }) => <i className={`fa-solid fa-map-pin flex items-center justify-center ${className}`} />;
const Globe = ({ className }: { className?: string }) => <i className={`fa-solid fa-globe flex items-center justify-center ${className}`} />;
const Droplets = ({ className }: { className?: string }) => <i className={`fa-solid fa-droplet flex items-center justify-center ${className}`} />;

interface OnboardingProps {
  language: Language;
  onCreateProfile: (data: Partial<ChildProfile>) => void;
  onLogout: () => void;
}

const ModalInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "" }: any) => (
  <div className={`bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary/20 transition-all ${className}`}>
    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      <div className="w-3 h-3 flex items-center justify-center">
        <Icon className="w-full h-full" />
      </div>
      {label}
    </label>
    {type === 'select' ? (
      <div className="relative flex items-center">
        <select value={value} onChange={onChange} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 appearance-none outline-none">
          {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown className="absolute right-0 w-4 h-4 text-slate-300 pointer-events-none" />
      </div>
    ) : (
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 outline-none placeholder:text-slate-300" 
      />
    )}
  </div>
);

export const Onboarding: React.FC<OnboardingProps> = ({ language, onCreateProfile, onLogout }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ChildProfile>>({
    name: '',
    dob: new Date().toISOString().split('T')[0],
    birthTime: '',
    gender: 'boy',
    bloodType: '',
    hospitalName: '',
    birthLocation: '',
    country: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSaving(true);
    // Smooth transition effect
    setTimeout(() => {
      onCreateProfile(formData);
      setIsSaving(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-secondary rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="w-28 h-28 bg-primary/10 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/10 rotate-3">
          <Baby className="w-14 h-14 text-primary" />
        </div>
        <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-4 tracking-tight leading-tight">
          {t('welcome_onboarding_title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mb-12 font-medium">
          {t('welcome_onboarding_msg')}
        </p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 bg-primary text-white text-xs font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {t('create_first_profile')}
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={onLogout}
            className="w-full py-4 text-slate-400 dark:text-slate-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:text-rose-500 transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {t('cancel_setup')}
          </button>
        </div>
      </div>

      {/* Setup Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => !isSaving && setShowModal(false)} />
          
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-[40px] p-6 sm:p-8 shadow-2xl animate-zoom-in border border-white/20 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowModal(false)}
              disabled={isSaving}
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors z-10 w-10 h-10 flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6 shrink-0">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary shadow-inner">
                <Baby className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1 tracking-tight leading-none">
                {t('onboarding_setup_title')}
              </h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {t('onboarding_setup_desc')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 no-scrollbar">
              <ModalInput 
                label={t('child_name_label')} 
                icon={User} 
                value={formData.name} 
                onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
                placeholder={t('child_name_placeholder')}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <ModalInput 
                  label={t('child_dob')} 
                  icon={Calendar} 
                  type="date"
                  value={formData.dob} 
                  onChange={(e: any) => setFormData({...formData, dob: e.target.value})} 
                />
                <ModalInput 
                  label={t('birth_time')} 
                  icon={Clock} 
                  type="time"
                  value={formData.birthTime} 
                  onChange={(e: any) => setFormData({...formData, birthTime: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <ModalInput 
                  label={t('gender_label')} 
                  icon={Baby} 
                  type="select"
                  options={[
                    { value: 'boy', label: t('boy') },
                    { value: 'girl', label: t('girl') }
                  ]}
                  value={formData.gender} 
                  onChange={(e: any) => setFormData({...formData, gender: e.target.value as 'boy' | 'girl'})} 
                />
                <ModalInput 
                  label={t('blood_type')} 
                  icon={Droplets} 
                  type="select"
                  options={[
                    { value: '', label: 'Select Type' },
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'B-', label: 'B-' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'AB-', label: 'AB-' },
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' }
                  ]}
                  value={formData.bloodType} 
                  onChange={(e: any) => setFormData({...formData, bloodType: e.target.value})} 
                />
              </div>

              <ModalInput 
                label={t('hospital_name')} 
                icon={Building2} 
                value={formData.hospitalName} 
                onChange={(e: any) => setFormData({...formData, hospitalName: e.target.value})} 
                placeholder={t('hospital_placeholder')}
              />

              <div className="grid grid-cols-2 gap-3">
                <ModalInput 
                  label={t('city_label')} 
                  icon={MapPin} 
                  value={formData.birthLocation} 
                  onChange={(e: any) => setFormData({...formData, birthLocation: e.target.value})} 
                  placeholder={t('location_placeholder')}
                />
                <ModalInput 
                  label={t('country_label')} 
                  icon={Globe} 
                  value={formData.country} 
                  onChange={(e: any) => setFormData({...formData, country: e.target.value})} 
                  placeholder={t('country_placeholder')}
                />
              </div>

              <div className="pt-4 sticky bottom-0 bg-white dark:bg-slate-800 py-2">
                <button
                  type="submit"
                  disabled={!formData.name || isSaving}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                    !formData.name || isSaving 
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' 
                    : 'bg-primary text-white shadow-md shadow-primary/20 active:scale-[0.95]'
                  }`}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isSaving ? t('saving') : t('save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
