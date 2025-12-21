
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Loader2, Save, ChevronRight, Moon, Sun, Trash2, Pencil, LogOut, ChevronDown, Globe, Bell, Activity, Image as ImageIcon, X, Cloud, HardDrive, Clock, User, ShieldCheck, ChevronLeft, MapPin, Plus, Settings as SettingsIcon, CircleUser, Check, Scale, RotateCcw, CheckCircle2, BookOpen } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder, Story } from '../types';
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
  stories: Story[];
  onEditMemory: (mem: Memory) => void;
  onDeleteMemory: (id: string) => void;
  onStoryClick: (story: Story) => void;
  onDeleteStory: (id: string) => void;
  onDeleteGrowth: (id: string) => void;
  onDeleteProfile: (id: string) => void;

  isGuestMode?: boolean;
  onLogout: () => void; 
  initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES';

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
  growthData, memories, stories, onEditMemory, onDeleteMemory, onStoryClick, onDeleteStory, onDeleteGrowth, onDeleteProfile,
  isGuestMode, onLogout, initialView, remindersEnabled, toggleReminders,
  remindersList = [], onDeleteReminder, onSaveReminder
}) => {
  const t = (key: any) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES'>(initialView || 'MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({
    id: '', name: '', dob: '', gender: 'boy'
  });
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({});
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
        setShowProfileDetails(false);
        triggerSuccess();
    } catch (error) { alert("Failed to save profile."); } 
    finally { setIsSavingProfile(false); }
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

  const handleViewRequest = (targetView: 'MEMORIES' | 'GROWTH' | 'REMINDERS' | 'STORIES') => {
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

          <section className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-all">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                   <Cloud className="w-4 h-4" />
                </div>
                <div className="text-left">
                   <h3 className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight">Cloud Backup</h3>
                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{isGuestMode ? 'Saved on Phone' : 'Synced'}</p>
                </div>
             </div>
             <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center gap-2 border border-slate-100 dark:border-slate-600/30 shadow-inner">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{memories.length + stories.length + growthData.length} Records</span>
             </div>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                   <CircleUser className="w-4 h-4 text-slate-400"/>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('about_child')}</h3>
                </div>
                <button 
                    onClick={() => DataService.saveProfile({ id: crypto.randomUUID(), name: t('add_new_profile'), dob: new Date().toISOString().split('T')[0], gender: 'boy' }).then(() => onRefreshData())}
                    className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-primary/5 rounded-xl"
                >
                    <Plus className="w-3.5 h-3.5"/> {t('add_new_profile')}
                </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar border-b border-slate-50 dark:border-slate-700/50 mb-5 items-center">
                {profiles.map(p => (
                    <button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${p.id === activeProfileId ? 'scale-105' : 'opacity-40 grayscale'}`}>
                        <div className={`w-12 h-12 rounded-[18px] border-2 overflow-hidden flex items-center justify-center transition-all ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>
                            {p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover" /> : <Baby className="w-5 h-5 text-slate-400" />}
                        </div>
                        <span className="text-[9px] font-black truncate max-w-[50px]">{p.name}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                  <div className="text-left">
                     <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{currentProfile?.name}</h2>
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">{calculateAge(currentProfile?.dob || '')}</p>
                  </div>
                  <button 
                    onClick={() => isLocked ? onUnlockRequest() : setShowProfileDetails(!showProfileDetails)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-primary text-white shadow-lg shadow-primary/20"
                  >
                     {isLocked ? <Lock className="w-3.5 h-3.5" /> : (showProfileDetails ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />)}
                     {isLocked ? t('tap_to_unlock') : (showProfileDetails ? t('close_edit') : t('edit_profile'))}
                  </button>
               </div>

               {showProfileDetails && !isLocked && (
                 <div className="animate-slide-up space-y-4 pt-1">
                    <div className="flex flex-col gap-3">
                        <IOSInput label={t('child_name_label')} icon={User} value={editingProfile.name} onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} />
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-4.5 bg-primary text-white font-black rounded-3xl shadow-xl uppercase tracking-[0.25em]">
                           {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {t('save_changes')}
                        </button>
                        <button onClick={() => onDeleteProfile(editingProfile.id!)} className="w-full py-3.5 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black rounded-3xl uppercase tracking-[0.2em]">
                           {t('delete_profile')}
                        </button>
                    </div>
                 </div>
               )}
            </div>
          </section>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-1">
             <button onClick={() => handleViewRequest('MEMORIES')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group transition-all">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 group-hover:scale-110">
                    {isLocked ? <Lock className="w-4.5 h-4.5" /> : <ImageIcon className="w-4.5 h-4.5" />}
                </div>
                <div><h3 className="font-black text-slate-800 dark:text-white text-base mb-1">{memories.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('memories')}</p></div>
             </button>
             <button onClick={() => handleViewRequest('GROWTH')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group transition-all">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 group-hover:scale-110">
                    {isLocked ? <Lock className="w-4.5 h-4.5" /> : <Activity className="w-4.5 h-4.5" />}
                </div>
                <div><h3 className="font-black text-slate-800 dark:text-white text-base mb-1">{growthData.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth</p></div>
             </button>
             <button onClick={() => handleViewRequest('STORIES')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group transition-all">
                <div className="w-9 h-9 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 group-hover:scale-110">
                    {isLocked ? <Lock className="w-4.5 h-4.5" /> : <BookOpen className="w-4.5 h-4.5" />}
                </div>
                <div><h3 className="font-black text-slate-800 dark:text-white text-base mb-1">{stories.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stories</p></div>
             </button>
          </div>
        </div>
      )}

      {view === 'STORIES' && (
         isLocked ? <LockedScreen /> : (
            <div className="space-y-4 animate-fade-in pb-32 px-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">My Ebooks</h3>
                  <BookOpen className="w-6 h-6 text-violet-500" />
                </div>
                {stories.map(s => (
                    <div key={s.id} onClick={() => onStoryClick(s)} className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500">
                                 <BookOpen className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                 <h4 className="font-black text-slate-800 dark:text-white text-sm truncate max-w-[180px]">{s.title}</h4>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.date}</p>
                              </div>
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); onDeleteStory(s.id); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                              <Trash2 className="w-4.5 h-4.5" />
                           </button>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic line-clamp-3">"{s.content}"</p>
                    </div>
                ))}
                {stories.length === 0 && <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3"><BookOpen className="w-12 h-12"/><p className="text-xs font-black uppercase tracking-widest">No Stories Found</p></div>}
            </div>
         )
      )}

      {view === 'GROWTH' && (
         isLocked ? <LockedScreen /> : (
           <div className="animate-fade-in pb-32 px-1">
              <section ref={growthFormRef} className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700 mb-6">
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6 tracking-tight"><Activity className="w-6 h-6 text-teal-500" /> {t('manage_growth')}</h2>
                <div className="flex flex-col gap-4 mb-8">
                   <IOSInput label={t('month')} icon={Clock} type="number" value={newGrowth.month ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, month: e.target.value})} placeholder="0" />
                   <IOSInput label={t('height_label')} icon={Activity} type="number" value={newGrowth.height ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, height: e.target.value})} placeholder="cm" />
                   <IOSInput label={t('weight_label')} icon={Scale} type="number" value={newGrowth.weight ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, weight: e.target.value})} placeholder="kg" />
                </div>
                <button onClick={handleSaveGrowth} disabled={isSavingGrowth} className="w-full py-4.5 bg-teal-500 text-white font-black rounded-3xl shadow-lg uppercase tracking-[0.2em]">
                  {isSavingGrowth ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} {t('add_record')}
                </button>
              </section>
              <div className="space-y-3">
                 {growthData.map(g => (
                    <div key={g.id} className="p-4 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-between border border-slate-50 dark:border-slate-700">
                       <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm">{g.month} {t('age_months')}</h4><p className="text-xs text-slate-400 font-bold">{g.height}cm • {g.weight}kg</p></div>
                       <button onClick={() => onDeleteGrowth(g.id!)} className="p-2.5 text-slate-300 hover:text-rose-500"><Trash2 className="w-4.5 h-4.5" /></button>
                    </div>
                 ))}
              </div>
           </div>
         )
      )}

      {view === 'REMINDERS' && (
         isLocked ? <LockedScreen /> : (
            <div className="space-y-6 animate-fade-in pb-32 px-1">
                <section className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 tracking-tight"><Bell className="w-6 h-6 text-amber-500" /> {t('add_reminder')}</h2>
                    <div className="flex flex-col gap-4 mb-8">
                        <IOSInput label={t('reminder_title')} icon={User} value={newReminder.title} onChange={(e: any) => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Vaccination" />
                        <IOSInput label={t('reminder_date')} icon={Clock} type="date" value={newReminder.date} onChange={(e: any) => setNewReminder({...newReminder, date: e.target.value})} />
                    </div>
                    <button onClick={handleAddReminder} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em]">{t('save_reminder')}</button>
                </section>
                <div className="space-y-2">
                   {remindersList.map(r => (
                       <div key={r.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700">
                           <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm">{r.title}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{r.date}</p></div>
                           <button onClick={() => onDeleteReminder?.(r.id)} className="p-2 text-rose-500"><Trash2 className="w-5 h-5" /></button>
                       </div>
                   ))}
                </div>
            </div>
         )
      )}
    </div>
  );
};
