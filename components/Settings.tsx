
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Loader2, Save, KeyRound, Unlock, ChevronRight, Moon, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, Bell, Activity, Image as ImageIcon, X, Cloud, RefreshCw, AlertCircle, Database, Wifi, Scale, Clock, User, ShieldCheck, ChevronLeft, MapPin, Plus } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService, syncData, db } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabaseClient';

// Stable component to prevent focus loss with improved font clarity and padding
const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "", id }: any) => (
  <div className={`bg-white dark:bg-slate-800 px-4 py-2.5 flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm group ${className}`}>
     <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors shrink-0">
        <Icon className="w-5 h-5" />
     </div>
     <div className="flex-1 flex flex-col min-w-0">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 text-left">{label}</label>
        {type === 'select' ? (
           <div className="relative flex items-center">
             <select 
                id={id}
                value={value} 
                onChange={onChange} 
                className="w-full bg-transparent border-none p-0 text-[16px] font-extrabold text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-6 text-left outline-none"
             >
                {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
             <ChevronDown className="absolute right-0 w-4 h-4 text-slate-300 pointer-events-none" />
           </div>
        ) : (
           <input 
             id={id}
             type={type} 
             value={value} 
             onChange={onChange}
             placeholder={placeholder}
             className="w-full bg-transparent border-none p-0 text-[16px] font-extrabold text-slate-800 dark:text-slate-100 focus:ring-0 h-6 text-left outline-none"
           />
        )}
     </div>
  </div>
);

interface SettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  profiles: ChildProfile[];
  activeProfileId: string;
  onProfileChange: (id: string) => void;
  onRefreshData: () => Promise<void>;
  
  passcode: string | null;
  isDetailsUnlocked: boolean;
  onUnlockRequest: () => void;
  onPasscodeSetup: () => void;
  onPasscodeChange: () => void;
  onPasscodeRemove: () => void;
  onHideDetails: () => void;

  growthData: GrowthData[];
  memories: Memory[];
  onEditMemory: (mem: Memory) => void;
  onDeleteMemory: (id: string) => void;
  onDeleteGrowth: (id: string) => void;
  onDeleteProfile: (id: string) => void;

  isGuestMode?: boolean;
  onLogout: () => void; 
  initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS';

  remindersEnabled?: boolean;
  toggleReminders?: () => void;
  remindersList?: Reminder[];
  onDeleteReminder?: (id: string) => void;
  onSaveReminder?: (reminder: Reminder) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme,
  profiles, activeProfileId, onProfileChange, onRefreshData,
  passcode, isDetailsUnlocked, onUnlockRequest,
  onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails,
  growthData, memories, onEditMemory, onDeleteMemory, onDeleteGrowth, onDeleteProfile,
  isGuestMode, onLogout, initialView, remindersEnabled, toggleReminders,
  remindersList = [], onDeleteReminder, onSaveReminder
}) => {
  const t = (key: any) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS'>(initialView || 'MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({
    id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: '', profileImage: '', birthWeight: undefined, birthHeight: undefined
  });
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [newReminder, setNewReminder] = useState({ title: '', date: '' });
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isLocked = passcode && !isDetailsUnlocked;

  useEffect(() => {
     if (activeProfileId) {
         const p = profiles.find(pr => pr.id === activeProfileId);
         if (p) setEditingProfile(p);
     }
  }, [activeProfileId, profiles]);

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--; months += 12;
    }
    if (years > 0) return `${years} ${t('age_years')} ${months} ${t('age_months')}`;
    return `${months} ${t('age_months')}`;
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingProfileImage(true);
      try {
          const folderId = editingProfile.id || 'new_profile_temp';
          const url = await DataService.uploadImage(file, folderId, 'profiles');
          setEditingProfile(prev => ({ ...prev, profileImage: url }));
      } catch (error) {
          console.error("Profile image upload failed", error);
      } finally { setIsUploadingProfileImage(false); }
    }
  };

  const handleSaveProfile = async () => {
    if (!editingProfile.name.trim()) return;
    setIsSavingProfile(true);
    try {
        const profileToSave = { ...editingProfile, id: editingProfile.id || crypto.randomUUID() };
        await DataService.saveProfile(profileToSave);
        await onRefreshData();
        onProfileChange(profileToSave.id || '');
        setShowEditForm(false);
    } catch (error) { alert("Failed to save profile."); } 
    finally { setIsSavingProfile(false); }
  };

  const handleAddNewProfile = async () => {
      const newId = crypto.randomUUID();
      const newP: ChildProfile = {
          id: newId, name: t('add_new_profile'), dob: new Date().toISOString().split('T')[0], gender: 'boy'
      };
      await DataService.saveProfile(newP);
      await onRefreshData();
      onProfileChange(newId);
      setShowEditForm(true);
  };

  const handleSaveGrowth = async () => {
      if (newGrowth.month !== undefined && newGrowth.height !== undefined && newGrowth.weight !== undefined && activeProfileId) {
          setIsSavingGrowth(true);
          try {
              await DataService.saveGrowth({ 
                id: editingGrowthId || crypto.randomUUID(), childId: activeProfileId, month: Number(newGrowth.month), 
                height: Number(newGrowth.height), weight: Number(newGrowth.weight), synced: 0 
              });
              await onRefreshData(); 
              setNewGrowth({}); setEditingGrowthId(null);
          } catch (e) { alert("Failed to save growth record."); } 
          finally { setIsSavingGrowth(false); }
      }
  };

  const handleAddReminder = async () => {
      if (newReminder.title && newReminder.date && onSaveReminder) {
          await onSaveReminder({ id: crypto.randomUUID(), title: newReminder.title, date: newReminder.date, type: 'event' });
          setNewReminder({ title: '', date: '' });
      }
  };

  return (
    <div className="max-w-4xl mx-auto px-1">
      {view !== 'MAIN' && (
        <button onClick={() => setView('MAIN')} className="mb-6 flex items-center gap-2 text-slate-500 font-extrabold hover:text-primary transition-colors px-2 text-base">
          <ChevronLeft className="w-6 h-6" />
          {t('back')}
        </button>
      )}
      
      {view === 'MAIN' && (
        <div className="animate-fade-in space-y-5 pb-24">
          <div className="mb-6 text-left px-2">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{t('settings_title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">{t('settings_subtitle')}</p>
          </div>

          {/* Profile Switcher */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{t('switch_profile')}</h3>
                <button onClick={handleAddNewProfile} className="flex items-center gap-1.5 text-primary text-[12px] font-black uppercase tracking-wider"><Plus className="w-4 h-4"/> {t('add_new_profile')}</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 px-1 no-scrollbar">
                {profiles.map(p => (
                    <button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-2.5 group transition-all ${p.id === activeProfileId ? 'scale-105' : 'opacity-60'}`}>
                        <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center transition-all ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>
                            {p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover" /> : <Baby className="w-6 h-6 text-slate-400" />}
                        </div>
                        <span className={`text-[11px] font-black truncate max-w-[60px] ${p.id === activeProfileId ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{p.name}</span>
                    </button>
                ))}
            </div>
          </section>

          {/* Active Profile Info & Edit */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-5 text-left">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  {currentProfile?.profileImage ? <img src={currentProfile.profileImage} className="w-full h-full object-cover rounded-2xl" /> : <Baby className="w-8 h-8" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{currentProfile?.name}</h2>
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.15em] mt-1">{calculateAge(currentProfile?.dob || '')}</p>
                </div>
              </div>
              <button onClick={() => setShowEditForm(!showEditForm)} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-primary transition-all active:scale-90 shadow-sm">
                {showEditForm ? <X className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
              </button>
            </div>

            {showEditForm && (
              <div className="px-5 pb-8 space-y-4 animate-slide-up">
                <div className="flex justify-center mb-2">
                   <button onClick={() => fileInputRef.current?.click()} className="relative group w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-600 shadow-inner">
                     {isUploadingProfileImage ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : (
                       editingProfile.profileImage ? <img src={editingProfile.profileImage} className="w-full h-full object-cover" /> : <UserPlus className="w-8 h-8 text-slate-300" />
                     )}
                     <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                   </button>
                </div>

                <div className="flex flex-col gap-3">
                    <IOSInput label={t('child_dob')} icon={Clock} type="date" value={editingProfile.dob} onChange={(e: any) => setEditingProfile({...editingProfile, dob: e.target.value})} />
                    <IOSInput label={t('child_name_label')} icon={User} value={editingProfile.name} onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} placeholder="e.g. Liam" />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setEditingProfile({...editingProfile, gender: 'boy'})} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${editingProfile.gender === 'boy' ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${editingProfile.gender === 'boy' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400'}`}><Baby className="w-4 h-4" /></div>
                            <div className="text-left"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 block">{t('gender_label')}</label><span className={`text-[14px] font-extrabold ${editingProfile.gender === 'boy' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{t('boy')}</span></div>
                        </button>
                        <button onClick={() => setEditingProfile({...editingProfile, gender: 'girl'})} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${editingProfile.gender === 'girl' ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${editingProfile.gender === 'girl' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400'}`}><Baby className="w-4 h-4" /></div>
                            <div className="text-left"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 block">{t('gender_label')}</label><span className={`text-[14px] font-extrabold ${editingProfile.gender === 'girl' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{t('girl')}</span></div>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <IOSInput label={t('birth_time')} icon={Clock} type="time" value={editingProfile.birthTime || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthTime: e.target.value})} />
                        <IOSInput label={t('blood_type')} icon={Activity} type="select" value={editingProfile.bloodType || ''} onChange={(e: any) => setEditingProfile({...editingProfile, bloodType: e.target.value})} options={[{label: 'Type', value: ''}, {label: 'A', value: 'A'}, {label: 'B', value: 'B'}, {label: 'AB', value: 'AB'}, {label: 'O', value: 'O'}]} />
                    </div>

                    <IOSInput label={t('hospital_name')} icon={Globe} value={editingProfile.hospitalName || ''} onChange={(e: any) => setEditingProfile({...editingProfile, hospitalName: e.target.value})} placeholder={t('hospital_placeholder')} />
                    <IOSInput label={t('city_label')} icon={MapPin} value={editingProfile.birthLocation || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthLocation: e.target.value})} placeholder={t('location_placeholder')} />
                    <IOSInput label={t('country_label')} icon={Globe} value={editingProfile.country || ''} onChange={(e: any) => setEditingProfile({...editingProfile, country: e.target.value})} placeholder={t('country_placeholder')} />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2.5 disabled:opacity-50 tracking-widest uppercase text-sm active:scale-[0.98] transition-all">{isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{t('save_changes')}</button>
                    <button onClick={() => onDeleteProfile(editingProfile.id!)} className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-extrabold rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all"><Trash2 className="w-4 h-4" />{t('delete_profile')}</button>
                </div>
              </div>
            )}
          </section>

          {/* Quick Menu */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <button onClick={() => setView('GROWTH')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 shadow-sm"><Activity className="w-5 h-5" /></div>
                <div className="text-left"><h3 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{t('manage_growth')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{growthData.length} Records</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
            </button>
            <button onClick={() => setView('MEMORIES')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 shadow-sm"><ImageIcon className="w-5 h-5" /></div>
                <div className="text-left"><h3 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{t('manage_memories')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{memories.length} Items</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
            </button>
            <button onClick={() => setView('REMINDERS')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 shadow-sm"><Bell className="w-5 h-5" /></div>
                <div className="text-left"><h3 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{t('manage_reminders')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{remindersList.length} Reminders</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
            </button>
          </section>

          {/* Security & System */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm"><ShieldCheck className="w-5 h-5" /></div>
                  <div className="text-left"><h3 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{t('security_title')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{passcode ? 'PIN ON' : 'PIN OFF'}</p></div>
               </div>
               <div className="flex gap-2">
                  {passcode ? (
                    <>
                      <button onClick={onPasscodeChange} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 transition-colors hover:text-indigo-500 shadow-sm"><Pencil className="w-4 h-4" /></button>
                      <button onClick={onPasscodeRemove} className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 transition-colors hover:bg-rose-100 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </>
                  ) : <button onClick={onPasscodeSetup} className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-[0.15em] shadow-md shadow-indigo-200 active:scale-95 transition-all">{t('setup_passcode')}</button>}
               </div>
            </div>
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-sm"><Globe className="w-5 h-5" /></div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{t('language')}</h3>
               </div>
               <button onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black rounded-xl uppercase tracking-wider shadow-sm transition-all active:scale-95">{language === 'mm' ? 'English' : 'မြန်မာ'}</button>
            </div>
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-sm"><Moon className="w-5 h-5" /></div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight">{t('theme')}</h3>
               </div>
               <button onClick={toggleTheme} className={`w-12 h-6.5 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary shadow-inner shadow-primary/20' : 'bg-slate-200'}`}><div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform ${theme === 'dark' ? 'translate-x-5.5' : 'translate-x-0'}`} /></button>
            </div>
          </section>

          <button onClick={onLogout} className="w-full py-5 bg-white dark:bg-slate-800 text-rose-500 font-black rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-4 text-base uppercase tracking-[0.2em] active:scale-[0.98] transition-all">
            <LogOut className="w-5 h-5" /> {t('logout')}
          </button>
        </div>
      )}

      {view === 'GROWTH' && (
         isLocked ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in text-center h-[60vh]">
              <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-primary/5"><Lock className="w-10 h-10 text-primary" /></div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('private_info')}</h2>
              <p className="text-slate-400 font-bold text-sm mb-10 max-w-[240px] leading-relaxed">{t('locked_msg')}</p>
              <button onClick={onUnlockRequest} className="px-12 py-4 bg-slate-900 dark:bg-primary text-white text-sm font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all tracking-widest uppercase">{t('tap_to_unlock')}</button>
            </div>
         ) : (
           <div className="space-y-6 animate-fade-in pb-24 px-2">
              <section className="bg-white dark:bg-slate-800 rounded-[32px] p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-left tracking-tight"><Activity className="w-6 h-6 text-teal-500" /> {t('manage_growth')}</h2>
                
                {/* Inputs with Margins */}
                <div className="flex flex-col gap-4 mb-6">
                   <IOSInput label={t('month')} icon={Clock} type="number" value={newGrowth.month ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, month: e.target.value})} placeholder="0" />
                   <IOSInput label={t('height_label')} icon={Activity} type="number" value={newGrowth.height ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, height: e.target.value})} placeholder="cm" />
                   <IOSInput label={t('weight_label')} icon={Scale} type="number" value={newGrowth.weight ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, weight: e.target.value})} placeholder="kg" />
                </div>

                <button onClick={handleSaveGrowth} disabled={isSavingGrowth || !newGrowth.month} className="w-full py-4.5 bg-teal-500 text-white font-black rounded-2xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 text-sm uppercase tracking-[0.15em] active:scale-[0.98] transition-all">
                   {isSavingGrowth ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                   {editingGrowthId ? t('update_record') : t('add_record')}
                </button>
              </section>

              <div className="space-y-3">
                 {growthData.map(g => (
                    <div key={g.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm transition-all hover:translate-x-1">
                       <div className="text-left">
                          <h4 className="font-black text-slate-800 dark:text-white text-base tracking-tight">{g.month} {t('age_months')}</h4>
                          <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">{g.height}cm • {g.weight}kg</p>
                       </div>
                       <button onClick={() => onDeleteGrowth(g.id!)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors shadow-sm"><Trash2 className="w-5 h-5" /></button>
                    </div>
                 ))}
              </div>
           </div>
         )
      )}

      {view === 'MEMORIES' && (
         <div className="space-y-4 animate-fade-in pb-24 px-2">
            {memories.map(m => (
               <div key={m.id} className="bg-white dark:bg-slate-800 p-3 rounded-[2rem] flex items-center gap-5 border border-slate-50 dark:border-slate-700 shadow-sm group hover:border-primary/20 transition-all">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-md ring-2 ring-slate-100 dark:ring-slate-700"><img src={m.imageUrl} className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0 text-left">
                     <h4 className="font-extrabold text-slate-800 dark:text-white truncate text-sm tracking-tight">{m.title}</h4>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{m.date}</p>
                  </div>
                  <div className="flex gap-1 pr-1">
                     <button onClick={() => onEditMemory(m)} className="p-2.5 text-slate-400 hover:text-primary transition-colors"><Pencil className="w-5 h-5" /></button>
                     <button onClick={() => onDeleteMemory(m.id)} className="p-2.5 text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
               </div>
            ))}
         </div>
      )}

      {view === 'REMINDERS' && (
         <div className="space-y-6 animate-fade-in pb-24 px-2">
            <section className="bg-white dark:bg-slate-800 rounded-[32px] p-5 shadow-sm border border-slate-100 dark:border-slate-700">
               <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-left tracking-tight"><Bell className="w-6 h-6 text-amber-500" /> {t('add_reminder')}</h2>
               
               <div className="flex flex-col gap-4 mb-6">
                  <IOSInput label={t('reminder_title')} icon={User} value={newReminder.title} onChange={(e: any) => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Vaccination" />
                  <IOSInput label={t('reminder_date')} icon={Clock} type="date" value={newReminder.date} onChange={(e: any) => setNewReminder({...newReminder, date: e.target.value})} />
               </div>

               <button onClick={handleAddReminder} className="w-full py-4.5 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 text-sm uppercase tracking-[0.2em] active:scale-[0.98] transition-all">{t('save_reminder')}</button>
            </section>

            <div className="space-y-3">
               {remindersList.map(r => (
                  <div key={r.id} className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm transition-all hover:translate-x-1">
                     <div className="text-left">
                        <h4 className="font-extrabold text-slate-800 dark:text-white text-base tracking-tight">{r.title}</h4>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">{r.date}</p>
                     </div>
                     <button onClick={() => onDeleteReminder?.(r.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors shadow-sm"><Trash2 className="w-5 h-5" /></button>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
};
