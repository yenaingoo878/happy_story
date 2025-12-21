
import React, { useState, useRef, useEffect } from 'react';
/* Added Scale and Sun to fix missing import errors */
import { Lock, Baby, UserPlus, Loader2, Save, ChevronRight, Moon, Sun, Trash2, Pencil, LogOut, ChevronDown, Globe, Bell, Activity, Image as ImageIcon, X, Cloud, HardDrive, Clock, User, ShieldCheck, ChevronLeft, MapPin, Plus, Settings as SettingsIcon, CircleUser, Check, Scale, RotateCcw, CheckCircle2 } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService } from '../lib/db';

const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "", id }: any) => (
  <div className={`bg-white dark:bg-slate-800 px-4 py-2.5 flex items-center gap-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm group transition-all focus-within:ring-4 focus-within:ring-primary/5 ${className}`}>
     <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors shrink-0 shadow-inner">
        <Icon className="w-4 h-4" />
     </div>
     <div className="flex-1 flex flex-col min-w-0">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1 text-left">{label}</label>
        {type === 'select' ? (
           <div className="relative flex items-center">
             <select 
                id={id}
                value={value} 
                onChange={onChange} 
                className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-6 text-left outline-none"
             >
                {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
             <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
           </div>
        ) : (
           <input 
             id={id}
             type={type} 
             value={value} 
             onChange={onChange}
             placeholder={placeholder}
             className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 h-6 text-left outline-none"
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
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [newReminder, setNewReminder] = useState({ title: '', date: '' });
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const growthFormRef = useRef<HTMLDivElement>(null);
  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isLocked = passcode && !isDetailsUnlocked;

  useEffect(() => {
     if (activeProfileId) {
         const p = profiles.find(pr => pr.id === activeProfileId);
         if (p) setEditingProfile(p);
     }
  }, [activeProfileId, profiles]);

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

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
      } catch (error) { console.error("Profile image upload failed", error); } 
      finally { setIsUploadingProfileImage(false); }
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
        setShowProfileDetails(false);
        triggerSuccess();
    } catch (error) { alert("Failed to save profile."); } 
    finally { setIsSavingProfile(false); }
  };

  const handleAddNewProfile = async () => {
      const newId = crypto.randomUUID();
      const newP: ChildProfile = { id: newId, name: t('add_new_profile'), dob: new Date().toISOString().split('T')[0], gender: 'boy' };
      await DataService.saveProfile(newP);
      await onRefreshData();
      onProfileChange(newId);
      setShowProfileDetails(true);
  };

  const handleStartEditGrowth = (record: GrowthData) => {
    setNewGrowth({ month: record.month, height: record.height, weight: record.weight });
    setEditingGrowthId(record.id || null);
    growthFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEditGrowth = () => {
    setNewGrowth({ month: undefined, height: undefined, weight: undefined });
    setEditingGrowthId(null);
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
              triggerSuccess();
          } catch (e) { alert("Failed to save growth record."); } 
          finally { setIsSavingGrowth(false); }
      }
  };

  const handleAddReminder = async () => {
      if (newReminder.title && newReminder.date && onSaveReminder) {
          await onSaveReminder({ id: crypto.randomUUID(), title: newReminder.title, date: newReminder.date, type: 'event' });
          setNewReminder({ title: '', date: '' });
          triggerSuccess();
      }
  };

  const handleToggleEditProfile = () => {
      if (isLocked) {
          onUnlockRequest();
      } else {
          setShowProfileDetails(!showProfileDetails);
      }
  };

  const handleViewRequest = (targetView: 'MEMORIES' | 'GROWTH' | 'REMINDERS') => {
      setView(targetView);
  };

  const LockedScreen = () => (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-primary/10">
        <Lock className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('private_info')}</h2>
      <p className="text-slate-400 font-bold text-sm mb-12 max-w-[240px] leading-relaxed">{t('locked_msg')}</p>
      <button 
        onClick={onUnlockRequest} 
        className="px-14 py-4.5 bg-slate-900 dark:bg-primary text-white text-sm font-black rounded-[2rem] shadow-xl tracking-[0.2em] uppercase active:scale-95 transition-all"
      >
        {t('tap_to_unlock')}
      </button>
    </div>
  );

  // Stats Logic - Count synced vs unsynced
  const syncedMemories = memories.filter(m => m.synced === 1).length;
  const syncedGrowth = growthData.filter(g => g.synced === 1).length;
  const totalSynced = syncedMemories + syncedGrowth;
  const totalItems = memories.length + growthData.length;

  return (
    <div className="max-w-4xl mx-auto px-2 relative">
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] animate-fade-in pointer-events-none">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3 border border-white/20">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">{t('profile_saved')}</span>
          </div>
        </div>
      )}

      {view !== 'MAIN' && (
        <button onClick={() => setView('MAIN')} className="mb-6 flex items-center gap-3 text-slate-500 font-black hover:text-primary transition-colors px-2 text-lg">
          <ChevronLeft className="w-7 h-7" />
          {t('back')}
        </button>
      )}
      
      {view === 'MAIN' && (
        <div className="animate-fade-in space-y-5 pb-32">
          <div className="flex items-center justify-between px-2">
            <div className="text-left">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{t('settings_title')}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-0.5">{t('settings_subtitle')}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><SettingsIcon className="w-5 h-5"/></div>
          </div>

          {/* Cloud Stats & Storage Info (Save Stats) */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-all">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                  <div className="relative">
                    <Cloud className="w-4 h-4" />
                    <Check className="w-2.5 h-2.5 absolute -bottom-1 -right-1" />
                  </div>
                </div>
                <div className="text-left">
                   <h3 className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight">Cloud Backup</h3>
                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{isGuestMode ? 'Saved on Phone' : `${totalSynced}/${totalItems} Synced`}</p>
                </div>
             </div>
             <div className="flex gap-1.5 shrink-0">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center gap-2 border border-slate-100 dark:border-slate-600/30 shadow-inner">
                   <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                   <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{totalItems} Records</span>
                </div>
             </div>
          </section>

          {/* Unified Compact Profile Management */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                   <CircleUser className="w-4 h-4 text-slate-400"/>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('about_child')}</h3>
                </div>
                <button 
                    onClick={handleAddNewProfile} 
                    className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-wider btn-active-scale px-3 py-1.5 bg-primary/5 rounded-xl"
                >
                    <Plus className="w-3.5 h-3.5"/> {t('add_new_profile')}
                </button>
            </div>

            {/* Profiles Swiper (Compact circles) */}
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar border-b border-slate-50 dark:border-slate-700/50 mb-5 items-center">
                {profiles.map(p => (
                    <button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-300 ${p.id === activeProfileId ? 'scale-105' : 'opacity-40 grayscale'}`}>
                        <div className={`w-12 h-12 rounded-[18px] border-2 overflow-hidden flex items-center justify-center transition-all ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>
                            {p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover" /> : <Baby className="w-5 h-5 text-slate-400" />}
                        </div>
                        <span className={`text-[9px] font-black truncate max-w-[50px] ${p.id === activeProfileId ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{p.name}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                  <div className="text-left">
                     <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{currentProfile?.name}</h2>
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">{calculateAge(currentProfile?.dob || '')}</p>
                  </div>
                  <button 
                    onClick={handleToggleEditProfile} 
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showProfileDetails && !isLocked ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' : 'bg-primary text-white shadow-lg shadow-primary/20 ring-4 ring-primary/5'}`}
                  >
                     {isLocked ? <Lock className="w-3.5 h-3.5" /> : (showProfileDetails ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />)}
                     {isLocked ? t('tap_to_unlock') : (showProfileDetails ? t('close_edit') : t('edit_profile'))}
                  </button>
               </div>

               {showProfileDetails && !isLocked && (
                 <div className="animate-slide-up space-y-4 pt-1">
                    <div className="flex justify-center mb-1">
                       <button onClick={() => fileInputRef.current?.click()} className="relative group w-20 h-20 rounded-[28px] bg-slate-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-600 shadow-inner">
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
                            <button onClick={() => setEditingProfile({...editingProfile, gender: 'boy'})} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${editingProfile.gender === 'boy' ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${editingProfile.gender === 'boy' ? 'bg-indigo-500 text-white shadow-indigo-200' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400'}`}><Baby className="w-3.5 h-3.5" /></div>
                                <div className="text-left"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 block">{t('gender_label')}</label><span className={`text-[13px] font-black ${editingProfile.gender === 'boy' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{t('boy')}</span></div>
                            </button>
                            <button onClick={() => setEditingProfile({...editingProfile, gender: 'girl'})} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${editingProfile.gender === 'girl' ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${editingProfile.gender === 'girl' ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400'}`}><Baby className="w-3.5 h-3.5" /></div>
                                <div className="text-left"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 block">{t('gender_label')}</label><span className={`text-[13px] font-black ${editingProfile.gender === 'girl' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{t('girl')}</span></div>
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

                    <div className="flex flex-col gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-4.5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-4 disabled:opacity-50 tracking-[0.25em] uppercase text-base active:scale-[0.96] transition-all">
                           {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                           {t('save_changes')}
                        </button>
                        <button onClick={() => onDeleteProfile(editingProfile.id!)} className="w-full py-3.5 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black rounded-3xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all">
                           <Trash2 className="w-4.5 h-4.5" />
                           {t('delete_profile')}
                        </button>
                    </div>
                 </div>
               )}
            </div>
          </section>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 px-1">
             <button onClick={() => handleViewRequest('MEMORIES')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group active:scale-95 transition-all">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                    {isLocked ? <Lock className="w-4.5 h-4.5" /> : <ImageIcon className="w-4.5 h-4.5" />}
                </div>
                <div><h3 className="font-black text-slate-800 dark:text-white text-base tracking-tight leading-none mb-1">{memories.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('memories')}</p></div>
             </button>
             <button onClick={() => handleViewRequest('GROWTH')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group active:scale-95 transition-all">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
                    {isLocked ? <Lock className="w-4.5 h-4.5" /> : <Activity className="w-4.5 h-4.5" />}
                </div>
                <div><h3 className="font-black text-slate-800 dark:text-white text-base tracking-tight leading-none mb-1">{growthData.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Records</p></div>
             </button>
          </div>

          {/* System Settings List */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <button onClick={() => handleViewRequest('REMINDERS')} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all group">
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 shadow-sm">
                      {isLocked ? <Lock className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('manage_reminders')}</h3>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-300 uppercase">{remindersList.length}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
               </div>
            </button>
            <div className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm"><ShieldCheck className="w-4.5 h-4.5" /></div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('security_title')}</h3>
               </div>
               <div className="flex gap-2">
                  {passcode ? (
                    <button onClick={onPasscodeChange} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 active:scale-90 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                  ) : <button onClick={onPasscodeSetup} className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest ring-4 ring-indigo-500/5 active:scale-95 transition-all">{t('setup_passcode')}</button>}
               </div>
            </div>
            
            {/* Theme Toggle Switch */}
            <div className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-sm transition-colors">
                     {theme === 'dark' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('theme')}</h3>
               </div>
               <button 
                 onClick={toggleTheme} 
                 className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 shadow-inner ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
            </div>

            <div className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-sm"><Globe className="w-4.5 h-4.5" /></div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('language')}</h3>
               </div>
               <button onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-xl uppercase tracking-wider active:scale-95 transition-all">{language === 'mm' ? 'English' : 'မြန်မာ'}</button>
            </div>
          </section>

          <button onClick={onLogout} className="w-full py-5 bg-white dark:bg-slate-800 text-rose-500 font-black rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-4 text-base uppercase tracking-[0.2em] active:scale-[0.98] transition-all">
            <LogOut className="w-4.5 h-4.5" /> {t('logout')}
          </button>
        </div>
      )}

      {view === 'GROWTH' && (
         isLocked ? <LockedScreen /> : (
           <div className="animate-fade-in pb-32 px-1">
              <section ref={growthFormRef} className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 text-left tracking-tight">
                    <Activity className="w-6 h-6 text-teal-500" /> 
                    {editingGrowthId ? t('update_record') : t('manage_growth')}
                  </h2>
                  {editingGrowthId && (
                    <button onClick={handleCancelEditGrowth} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col gap-4 mb-8">
                   <IOSInput label={t('month')} icon={Clock} type="number" value={newGrowth.month ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, month: e.target.value})} placeholder="0" />
                   <IOSInput label={t('height_label')} icon={Activity} type="number" value={newGrowth.height ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, height: e.target.value})} placeholder="cm" />
                   <IOSInput label={t('weight_label')} icon={Scale} type="number" value={newGrowth.weight ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, weight: e.target.value})} placeholder="kg" />
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={handleSaveGrowth} disabled={isSavingGrowth || newGrowth.month === undefined} className={`w-full py-4.5 text-white font-black rounded-3xl shadow-lg flex items-center justify-center gap-3 text-base uppercase tracking-[0.2em] active:scale-[0.96] transition-all ${editingGrowthId ? 'bg-indigo-500 shadow-indigo-500/30' : 'bg-teal-500 shadow-teal-500/30'}`}>
                    {isSavingGrowth ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingGrowthId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                    {editingGrowthId ? t('update_record') : t('add_record')}
                  </button>
                  {editingGrowthId && (
                    <button onClick={handleCancelEditGrowth} className="w-full py-3 text-slate-500 font-black text-xs uppercase tracking-widest">{t('cancel_edit')}</button>
                  )}
                </div>
              </section>

              <div className="space-y-3">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">History</h3>
                 {growthData.map(g => (
                    <div key={g.id} className={`p-3 rounded-[2rem] flex items-center justify-between border shadow-sm transition-all group ${editingGrowthId === g.id ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700/50'}`}>
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${editingGrowthId === g.id ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400'}`}>
                             <span className="text-xs font-black">{g.month}</span>
                          </div>
                          <div className="text-left">
                            <h4 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{g.month} {t('age_months')}</h4>
                            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">{g.height}cm • {g.weight}kg</p>
                          </div>
                       </div>
                       <div className="flex gap-1 pr-1">
                          <button onClick={() => handleStartEditGrowth(g)} className={`p-2.5 rounded-xl transition-all active:scale-90 ${editingGrowthId === g.id ? 'text-indigo-600 bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-300 hover:text-indigo-500'}`}><Pencil className="w-4.5 h-4.5" /></button>
                          <button onClick={() => onDeleteGrowth(g.id!)} className="p-2.5 text-slate-300 hover:text-rose-500 active:scale-90 transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                       </div>
                    </div>
                 ))}
                 {growthData.length === 0 && (
                   <div className="py-12 text-center text-slate-300 flex flex-col items-center gap-2">
                     <RotateCcw className="w-8 h-8 opacity-20" />
                     <p className="text-xs font-bold uppercase tracking-widest">No growth records found</p>
                   </div>
                 )}
              </div>
           </div>
         )
      )}

      {view === 'MEMORIES' && (
         isLocked ? <LockedScreen /> : (
            <div className="space-y-2 animate-fade-in pb-32 px-1">
                {memories.map(m => (
                    <div key={m.id} className="bg-white dark:bg-slate-800 p-2 rounded-[2rem] flex items-center gap-3 border border-slate-50 dark:border-slate-700 shadow-sm group active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow ring-2 ring-slate-50 dark:ring-slate-700"><img src={m.imageUrl} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0 text-left px-1">
                            <h4 className="font-black text-slate-800 dark:text-white truncate text-sm tracking-tight">{m.title}</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{m.date}</p>
                        </div>
                        <div className="flex gap-0.5 px-1 shrink-0">
                            <button onClick={() => onEditMemory(m)} className="p-2.5 text-slate-400 hover:text-primary active:scale-90 transition-all"><Pencil className="w-5 h-5" /></button>
                            <button onClick={() => onDeleteMemory(m.id)} className="p-2.5 text-rose-500 active:scale-90 transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
         )
      )}

      {view === 'REMINDERS' && (
         isLocked ? <LockedScreen /> : (
            <div className="space-y-6 animate-fade-in pb-32 px-1">
                <section className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-left tracking-tight"><Bell className="w-6 h-6 text-amber-500" /> {t('add_reminder')}</h2>
                    <div className="flex flex-col gap-4 mb-8">
                        <IOSInput label={t('reminder_title')} icon={User} value={newReminder.title} onChange={(e: any) => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Vaccination" />
                        <IOSInput label={t('reminder_date')} icon={Clock} type="date" value={newReminder.date} onChange={(e: any) => setNewReminder({...newReminder, date: e.target.value})} />
                    </div>
                    <button onClick={handleAddReminder} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg shadow-amber-500/30 text-base uppercase tracking-[0.2em] active:scale-[0.96] transition-all">{t('save_reminder')}</button>
                </section>
                <div className="space-y-2">
                {remindersList.map(r => (
                    <div key={r.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm active:bg-slate-50 dark:active:bg-slate-700/50">
                        <div className="text-left px-1">
                            <h4 className="font-black text-slate-800 dark:text-white text-base tracking-tight">{r.title}</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{r.date}</p>
                        </div>
                        <button onClick={() => onDeleteReminder?.(r.id)} className="p-2.5 text-rose-500 active:scale-90 transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                ))}
                </div>
            </div>
         )
      )}
    </div>
  );
};
