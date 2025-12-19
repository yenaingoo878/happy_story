
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Loader2, Save, KeyRound, Unlock, ChevronRight, Moon, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, Bell, Activity, Image as ImageIcon, X, Cloud, RefreshCw, AlertCircle, Database, Wifi, Scale, Clock, User } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService, syncData, db } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface SettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  profiles: ChildProfile[];
  activeProfileId: string;
  onProfileChange: (id: string) => void;
  onRefreshData: () => Promise<void>;
  
  // Security Props
  passcode: string | null;
  isDetailsUnlocked: boolean;
  onUnlockRequest: () => void;
  onPasscodeSetup: () => void;
  onPasscodeChange: () => void;
  onPasscodeRemove: () => void;
  onHideDetails: () => void;

  // Data props for sub-views
  growthData: GrowthData[];
  memories: Memory[];
  onEditMemory: (mem: Memory) => void;
  onDeleteMemory: (id: string) => void;
  onDeleteGrowth: (id: string) => void;
  onDeleteProfile: (id: string) => void;

  // Auth
  isGuestMode?: boolean;
  onLogout: () => void; 
  
  // Navigation
  initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS';

  // Reminders
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    if (isGuestMode || !isSupabaseConfigured() || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncData();
      await onRefreshData();
    } catch (error) {
      console.error("Manual sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const [dbStatus, setDbStatus] = useState<'OK' | 'ERROR' | 'LOADING'>('LOADING');
  const [showEditForm, setShowEditForm] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({ title: '', date: '', type: 'event' });
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isCloudEnabled = isSupabaseConfigured();

  const isLocked = passcode && !isDetailsUnlocked;

  useEffect(() => {
     const checkDB = async () => {
         try {
             if (db.isOpen()) {
                 setDbStatus('OK');
             } else {
                 await db.open();
                 setDbStatus('OK');
             }
         } catch (e: any) {
             setDbStatus('ERROR');
         }
     };
     checkDB();
  }, []);

  useEffect(() => { if (initialView) setView(initialView); }, [initialView]);

  useEffect(() => {
     if (activeProfileId && (!editingProfile.id || editingProfile.id !== activeProfileId)) {
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
        years--;
        months += 12;
    }

    if (years > 0) {
      return `${years} ${t('age_years')} ${months} ${t('age_months')}`;
    }
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
      } finally {
          setIsUploadingProfileImage(false);
      }
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
        setSaveSuccess(true);
        setTimeout(() => setShowEditForm(false), 800);
    } catch (error) {
        alert("Failed to save profile.");
    } finally { setIsSavingProfile(false); }
  };

  const handleSaveGrowth = async () => {
      if (newGrowth.month !== undefined && newGrowth.height && newGrowth.weight && activeProfileId) {
          setIsSavingGrowth(true);
          try {
              await DataService.saveGrowth({ 
                id: editingGrowthId || crypto.randomUUID(), 
                childId: activeProfileId, 
                month: Number(newGrowth.month), 
                height: Number(newGrowth.height), 
                weight: Number(newGrowth.weight), 
                synced: 0 
              });
              await onRefreshData(); 
              setNewGrowth({}); 
              setEditingGrowthId(null);
          } catch (e) {
              alert("Failed to save growth record.");
          } finally {
              setIsSavingGrowth(false);
          }
      }
  };

  const handleSaveNewReminder = async () => {
      if (!newReminder.title || !newReminder.date) return;
      setIsSavingReminder(true);
      try {
          const reminder: Reminder = {
              id: crypto.randomUUID(),
              title: newReminder.title,
              date: newReminder.date,
              type: newReminder.type || 'event',
              synced: 0
          };
          if (onSaveReminder) await onSaveReminder(reminder);
          setNewReminder({ title: '', date: '', type: 'event' });
      } catch (e) {
          alert("Failed to save reminder");
      } finally { setIsSavingReminder(false); }
  };

  const renderLockedState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-in text-center max-w-sm mx-auto h-[50vh]">
      <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t('private_info')}</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">{t('locked_msg')}</p>
      <button 
        onClick={onUnlockRequest}
        className="px-10 py-3.5 bg-slate-900 dark:bg-primary text-white text-xs font-extrabold rounded-2xl shadow-xl btn-primary-active active:scale-95 transition-all"
      >
        {t('tap_to_unlock')}
      </button>
    </div>
  );

  const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options }: any) => (
    <div className="bg-white dark:bg-slate-800 px-4 py-4 flex items-center gap-4 border-b border-slate-50 dark:border-slate-700/50 last:border-none">
       <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 shrink-0">
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex-1 flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-left">{label}</label>
          {type === 'select' ? (
             <select 
                value={value} 
                onChange={onChange} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-7 text-left"
             >
                {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
          ) : (
             <input 
               type={type} 
               value={value} 
               onChange={onChange} 
               placeholder={placeholder} 
               className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 h-7 min-h-[28px] text-left" 
             />
          )}
       </div>
    </div>
  );

  if (view === 'GROWTH') {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 btn-active-scale px-3 py-1.5 rounded-lg"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            {isLocked ? renderLockedState() : (
            <div className="animate-fade-in space-y-4 px-1">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t('manage_growth')}</h2>
                    {editingGrowthId && (
                        <button onClick={() => { setEditingGrowthId(null); setNewGrowth({}); }} className="text-xs font-bold text-rose-500 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full btn-active-scale">
                            <X className="w-3.5 h-3.5"/> {t('cancel_edit')}
                        </button>
                    )}
                </div>
                
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border transition-all ${editingGrowthId ? 'border-teal-500' : 'border-slate-100 dark:border-slate-700'}`}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{editingGrowthId ? t('edit') : t('add_record')}</h3>
                    <div className="grid grid-cols-1 gap-4 mb-5">
                        <IOSInput label={t('month')} icon={Clock} type="number" value={newGrowth.month ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, month: e.target.value === '' ? undefined : Number(e.target.value)})} placeholder="0" />
                        <IOSInput label={t('height_label')} icon={Activity} type="number" value={newGrowth.height ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, height: e.target.value === '' ? undefined : Number(e.target.value)})} placeholder="cm" />
                        <IOSInput label={t('weight_label')} icon={Scale} type="number" value={newGrowth.weight ?? ''} onChange={(e: any) => setNewGrowth({...newGrowth, weight: e.target.value === '' ? undefined : Number(e.target.value)})} placeholder="kg" />
                    </div>
                    <button onClick={handleSaveGrowth} disabled={isSavingGrowth || newGrowth.month === undefined || !newGrowth.height} className={`w-full py-4 rounded-2xl text-sm font-black shadow-lg btn-primary-active flex items-center justify-center gap-2 ${editingGrowthId ? 'bg-indigo-500' : 'bg-teal-500'} text-white`}>
                      {isSavingGrowth ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> {editingGrowthId ? t('update_record') : t('add_record')}</>}
                    </button>
                </div>
            </div>
            )}
        </div>
      );
  }

  if (view === 'MEMORIES' || view === 'REMINDERS') {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
             <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-xs font-bold text-slate-500 btn-active-scale px-3 py-1.5 rounded-lg"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
             {isLocked ? renderLockedState() : (
               <div className="px-1 animate-fade-in space-y-4">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{view === 'MEMORIES' ? t('manage_memories') : t('manage_reminders')}</h2>
               </div>
             )}
        </div>
      );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-32 px-1">
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight ml-1">{t('settings_title')}</h1>
        
        {currentProfile && (
            <div className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden btn-active-scale">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-[28px] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700">
                         {currentProfile.profileImage ? <img src={currentProfile.profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Baby className="w-10 h-10 text-slate-300"/></div>}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest mb-1.5 inline-block">{t('currently_active')}</span>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight truncate">{currentProfile.name}</h2>
                        <div className="flex items-center gap-2 opacity-70 mt-1">
                           <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{calculateAge(currentProfile.dob)}</p>
                           <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full"></span>
                           <p className={`text-xs font-bold uppercase tracking-tighter ${currentProfile.gender === 'boy' ? 'text-indigo-400' : 'text-rose-400'}`}>{currentProfile.gender === 'boy' ? t('boy') : t('girl')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Preferences Rows */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 p-2 divide-y divide-slate-50 dark:divide-slate-700/30">
            <div className="flex justify-between items-center p-4 btn-active-scale rounded-2xl">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500"><Globe className="w-6 h-6"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('language')}</span></div>
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                    <button onClick={() => setLanguage('mm')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>မြန်မာ</button>
                    <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>ENG</button>
                </div>
            </div>
            <div className="flex justify-between items-center p-4 btn-active-scale rounded-2xl">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Moon className="w-6 h-6"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('theme')}</span></div>
                <button onClick={toggleTheme} className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-5 h-5 bg-white rounded-full shadow-md"></div></button>
            </div>
        </div>

        {/* Edit Profile Section (IOS Style Single Column) */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             <button onClick={() => isLocked ? onUnlockRequest() : setShowEditForm(!showEditForm)} className="w-full flex items-center justify-between p-5 btn-active-scale">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 relative">
                        <Pencil className="w-6 h-6"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-100"><Lock className="w-3 h-3 text-slate-400" /></div>}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('edit_profile')}</span>
                 </div>
                 {isLocked ? <ChevronRight className="w-5 h-5 text-slate-200"/> : (showEditForm ? <ChevronUp className="w-5 h-5 text-slate-300"/> : <ChevronDown className="w-5 h-5 text-slate-300"/>)}
             </button>
             
             {!isLocked && showEditForm && (
                 <div className="border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 animate-slide-up">
                    <div className="p-5 flex gap-2 overflow-x-auto scrollbar-hide">
                        <button onClick={() => { setEditingProfile({ id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: '', profileImage: '', birthWeight: undefined, birthHeight: undefined }); }} className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-dashed border-primary text-primary text-xs font-black btn-active-scale"><UserPlus className="w-4 h-4"/> {t('add_new_profile')}</button>
                        {profiles.map(p => (
                            <button key={p.id} onClick={() => { onProfileChange(p.id!); setEditingProfile(p); }} className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 transition-all btn-active-scale ${editingProfile.id === p.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}><span className="text-xs font-black">{p.name}</span></button>
                        ))}
                    </div>

                    <div className="mx-5 mb-6 p-5 bg-white dark:bg-slate-800 rounded-[24px] border border-slate-100 dark:border-slate-700 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl border-2 border-slate-50 dark:border-slate-700 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-700 relative shrink-0">
                            {isUploadingProfileImage ? <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="w-5 h-5 animate-spin text-white" /></div> : editingProfile.profileImage ? <img src={editingProfile.profileImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Baby className="w-8 h-8" /></div>}
                        </div>
                        <div className="flex-1 text-left">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Profile Photo</h4>
                           <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-slate-900 dark:bg-primary text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-2 btn-primary-active active:scale-95"><ImageIcon className="w-4 h-4" /> {t('upload_photo')}</button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                    </div>

                    {/* All inputs in a clean single column list */}
                    <div className="mx-5 mb-6 bg-white dark:bg-slate-800 rounded-[24px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                        <IOSInput label={t('child_name_label')} icon={User} value={editingProfile.name} onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} placeholder="e.g. Liam" />
                        <IOSInput label={t('child_dob')} icon={Clock} type="date" value={editingProfile.dob} onChange={(e: any) => setEditingProfile({...editingProfile, dob: e.target.value})} />
                        <IOSInput label={t('gender_label')} icon={Baby} type="select" value={editingProfile.gender} onChange={(e: any) => setEditingProfile({...editingProfile, gender: e.target.value})} options={[{label: t('boy'), value: 'boy'}, {label: t('girl'), value: 'girl'}]} />
                        <IOSInput label={t('blood_type')} icon={Activity} type="select" value={editingProfile.bloodType || ''} onChange={(e: any) => setEditingProfile({...editingProfile, bloodType: e.target.value})} options={[{label: 'Select Type', value: ''}, {label: 'A', value: 'A'}, {label: 'B', value: 'B'}, {label: 'AB', value: 'AB'}, {label: 'O', value: 'O'}]} />
                        <IOSInput label={t('birth_time')} icon={Clock} type="time" value={editingProfile.birthTime || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthTime: e.target.value})} />
                        <IOSInput label={t('hospital_name')} icon={Globe} value={editingProfile.hospitalName || ''} onChange={(e: any) => setEditingProfile({...editingProfile, hospitalName: e.target.value})} placeholder="e.g. Central Hospital" />
                        <IOSInput label={t('birth_weight_label')} icon={Scale} type="number" value={editingProfile.birthWeight || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthWeight: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="0.00 kg" />
                        <IOSInput label={t('birth_height_label')} icon={Activity} type="number" value={editingProfile.birthHeight || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthHeight: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="0.0 cm" />
                    </div>
                    
                    <div className="px-5 pb-8 flex gap-3">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingProfileImage} className="flex-1 py-4 bg-slate-900 dark:bg-primary text-white text-xs font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-2 btn-primary-active active:scale-95">{isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-5 h-5"/> {t('save_changes')}</>}</button>
                        {editingProfile.id && <button onClick={() => onDeleteProfile(editingProfile.id!)} className="p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl border border-rose-100 dark:border-rose-900/20 btn-active-scale"><Trash2 className="w-6 h-6"/></button>}
                    </div>
                 </div>
             )}
        </div>

        {/* Quick Access Rows */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 p-2 divide-y divide-slate-50 dark:divide-slate-700/30">
            <button onClick={() => isLocked ? onUnlockRequest() : setView('GROWTH')} className="w-full p-4 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 relative">
                        <Activity className="w-6 h-6"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-50"><Lock className="w-3 h-3 text-slate-400" /></div>}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_growth')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200"/>
            </button>
            <button onClick={() => isLocked ? onUnlockRequest() : setView('MEMORIES')} className="w-full p-4 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 relative">
                        <ImageIcon className="w-6 h-6"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-50"><Lock className="w-3 h-3 text-slate-400" /></div>}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_memories')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200"/>
            </button>
            <button onClick={() => isLocked ? onUnlockRequest() : setView('REMINDERS')} className="w-full p-4 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative">
                        <Bell className="w-6 h-6"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-50"><Lock className="w-3 h-3 text-slate-400" /></div>}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_reminders')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200"/>
            </button>
        </div>

        <button onClick={onLogout} className="w-full p-5 bg-white dark:bg-slate-800 text-rose-500 text-xs font-black uppercase rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2 btn-active-scale active:scale-[0.98] transition-all"><LogOut className="w-5 h-5"/>{t('logout')}</button>
    </div>
  );
};
