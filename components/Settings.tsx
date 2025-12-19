
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Loader2, Save, KeyRound, Unlock, ChevronRight, Moon, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, Bell, Activity, Image as ImageIcon, X, Cloud, RefreshCw, AlertCircle, Database, Wifi, Scale, Clock, User, ShieldCheck, ChevronLeft, MapPin } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService, syncData } from '../lib/db';
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
  const [isSyncing, setIsSyncing] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
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
        setShowEditForm(false);
    } catch (error) {
        alert("Failed to save profile.");
    } finally { setIsSavingProfile(false); }
  };

  const handleSaveGrowth = async () => {
      if (newGrowth.month !== undefined && newGrowth.height !== undefined && newGrowth.weight !== undefined && activeProfileId) {
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

  const renderLockedState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-in text-center max-w-sm mx-auto h-[50vh]">
      <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t('private_info')}</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">{t('locked_msg')}</p>
      <button 
        onClick={onUnlockRequest}
        className="px-10 py-3.5 bg-slate-900 dark:bg-primary text-white text-xs font-extrabold rounded-2xl shadow-xl active:scale-95 transition-all"
      >
        {t('tap_to_unlock')}
      </button>
    </div>
  );

  const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-800 px-4 py-4 flex items-center gap-4 border-slate-50 dark:border-slate-700/50 group ${className}`}>
       <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors shrink-0">
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex-1 flex flex-col min-w-0">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 text-left">{label}</label>
          {type === 'select' ? (
             <div className="relative flex items-center">
               <select 
                  value={value} 
                  onChange={onChange} 
                  className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-7 text-left"
               >
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
               className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-0 h-7 text-left outline-none"
             />
          )}
       </div>
    </div>
  );

  const renderMainSettings = () => (
    <div className="space-y-6 animate-fade-in pb-24">
      <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              {currentProfile?.profileImage ? (
                <img src={currentProfile.profileImage} className="w-full h-full object-cover rounded-2xl" alt="" />
              ) : (
                <Baby className="w-8 h-8" />
              )}
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">{currentProfile?.name}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{calculateAge(currentProfile?.dob || '')}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowEditForm(!showEditForm)}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-primary transition-colors"
          >
            {showEditForm ? <X className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
          </button>
        </div>

        {showEditForm && (
          <div className="px-6 pb-6 space-y-4 animate-slide-up">
            <div className="flex justify-center mb-6">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="relative group w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-600"
               >
                 {isUploadingProfileImage ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : (
                   editingProfile.profileImage ? <img src={editingProfile.profileImage} className="w-full h-full object-cover" alt="" /> : <UserPlus className="w-8 h-8 text-slate-300" />
                 )}
                 <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
               </button>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-700/30 border border-slate-50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Row 1: Name */}
                <IOSInput label={t('child_name_label')} icon={User} value={editingProfile.name} onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} />
                
                {/* Row 2: Gender Con 1 Boy Con 2 Girl */}
                <div className="grid grid-cols-2 divide-x divide-slate-50 dark:divide-slate-700/30">
                    <IOSInput label={t('gender_label')} icon={Baby} type="select" value={editingProfile.gender} onChange={(e: any) => setEditingProfile({...editingProfile, gender: e.target.value})} options={[{label: t('boy'), value: 'boy'}, {label: t('girl'), value: 'girl'}]} />
                    <div className="flex items-center px-4 bg-white dark:bg-slate-800">
                        <span className={`text-xs font-black uppercase tracking-widest ${editingProfile.gender === 'boy' ? 'text-indigo-400' : 'text-rose-400'}`}>
                            {editingProfile.gender === 'boy' ? t('boy') : t('girl')}
                        </span>
                    </div>
                </div>

                {/* Row 3: DOB */}
                <IOSInput label={t('child_dob')} icon={Clock} type="date" value={editingProfile.dob} onChange={(e: any) => setEditingProfile({...editingProfile, dob: e.target.value})} />

                {/* Row 4: Con 1 Time of Birth Con 2 Blood Type */}
                <div className="grid grid-cols-2 divide-x divide-slate-50 dark:divide-slate-700/30">
                    <IOSInput label={t('birth_time')} icon={Clock} type="time" value={editingProfile.birthTime || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthTime: e.target.value})} />
                    <IOSInput label={t('blood_type')} icon={Activity} value={editingProfile.bloodType || ''} onChange={(e: any) => setEditingProfile({...editingProfile, bloodType: e.target.value})} placeholder="e.g. O+" />
                </div>

                {/* Row 5: Hospital */}
                <IOSInput label={t('hospital_name')} icon={Globe} value={editingProfile.hospitalName || ''} onChange={(e: any) => setEditingProfile({...editingProfile, hospitalName: e.target.value})} placeholder={t('hospital_placeholder')} />

                {/* Row 6: Birth Location */}
                <IOSInput label={t('city_label')} icon={MapPin} value={editingProfile.birthLocation || ''} onChange={(e: any) => setEditingProfile({...editingProfile, birthLocation: e.target.value})} placeholder={t('location_placeholder')} />

                {/* Row 7: Country */}
                <IOSInput label={t('country_label')} icon={Globe} value={editingProfile.country || ''} onChange={(e: any) => setEditingProfile({...editingProfile, country: e.target.value})} placeholder={t('country_placeholder')} />
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('save_changes')}
            </button>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
        <button onClick={() => setView('GROWTH')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500"><Activity className="w-6 h-6" /></div>
            <div className="text-left"><h3 className="font-bold text-slate-800 dark:text-white">{t('manage_growth')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{growthData.length} {t('growth_tracker')}</p></div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
        </button>
        <button onClick={() => setView('MEMORIES')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500"><ImageIcon className="w-6 h-6" /></div>
            <div className="text-left"><h3 className="font-bold text-slate-800 dark:text-white">{t('manage_memories')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{memories.length} {t('memories')}</p></div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
        </button>
        <button onClick={() => setView('REMINDERS')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500"><Bell className="w-6 h-6" /></div>
            <div className="text-left"><h3 className="font-bold text-slate-800 dark:text-white">{t('manage_reminders')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{remindersList.length} {t('nav_home')}</p></div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
        </button>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
        <div className="p-6 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500"><ShieldCheck className="w-6 h-6" /></div>
              <div className="text-left"><h3 className="font-bold text-slate-800 dark:text-white">{t('security_title')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{passcode ? 'PIN Enabled' : 'No PIN'}</p></div>
           </div>
           <div className="flex gap-2">
              {passcode ? (
                <>
                  <button onClick={onPasscodeChange} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={onPasscodeRemove} className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </>
              ) : (
                <button onClick={onPasscodeSetup} className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest">{t('setup_passcode')}</button>
              )}
           </div>
        </div>
        <div className="p-6 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Globe className="w-6 h-6" /></div>
              <h3 className="font-bold text-slate-800 dark:text-white">{t('language')}</h3>
           </div>
           <button onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors">{language === 'mm' ? 'English' : 'မြန်မာ'}</button>
        </div>
        <div className="p-6 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Moon className="w-6 h-6" /></div>
              <h3 className="font-bold text-slate-800 dark:text-white">{t('theme')}</h3>
           </div>
           <button onClick={toggleTheme} className={`w-14 h-8 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} /></button>
        </div>
      </section>

      <button onClick={onLogout} className="w-full py-5 bg-white dark:bg-slate-800 text-rose-500 font-black rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-3 active:scale-95 transition-all">
        <LogOut className="w-6 h-6" />
        {t('logout')}
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-1">
      {view !== 'MAIN' && (
        <button onClick={() => setView('MAIN')} className="mb-6 flex items-center gap-2 text-slate-400 font-bold hover:text-primary transition-colors">
          <ChevronLeft className="w-5 h-5" />
          {t('back')}
        </button>
      )}
      
      {view === 'MAIN' && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('settings_title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('settings_subtitle')}</p>
          </div>
          {renderMainSettings()}
        </>
      )}

      {view === 'GROWTH' && (
         isLocked ? renderLockedState() : (
           <div className="space-y-6 animate-fade-in">
              <section className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2 text-left"><Activity className="w-6 h-6 text-teal-500" /> {t('manage_growth')}</h2>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/30 border border-slate-50 dark:border-slate-700/50 rounded-2xl overflow-hidden mb-6">
                   <IOSInput 
                      label={t('month')} 
                      icon={Clock} 
                      type="number" 
                      value={newGrowth.month ?? ''} 
                      onChange={(e: any) => setNewGrowth({...newGrowth, month: e.target.value === '' ? undefined : Number(e.target.value)})} 
                      placeholder="0" 
                   />
                   <IOSInput 
                      label={t('height_label')} 
                      icon={Activity} 
                      type="number" 
                      value={newGrowth.height ?? ''} 
                      onChange={(e: any) => setNewGrowth({...newGrowth, height: e.target.value === '' ? undefined : Number(e.target.value)})} 
                      placeholder="cm" 
                   />
                   <IOSInput 
                      label={t('weight_label')} 
                      icon={Scale} 
                      type="number" 
                      value={newGrowth.weight ?? ''} 
                      onChange={(e: any) => setNewGrowth({...newGrowth, weight: e.target.value === '' ? undefined : Number(e.target.value)})} 
                      placeholder="kg" 
                   />
                </div>
                <button onClick={handleSaveGrowth} disabled={isSavingGrowth || newGrowth.month === undefined || newGrowth.height === undefined} className="w-full py-4 bg-teal-500 text-white font-black rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2">
                   {isSavingGrowth ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                   {editingGrowthId ? t('update_record') : t('add_record')}
                </button>
              </section>
              <div className="space-y-3">
                 {growthData.map(g => (
                    <div key={g.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm">
                       <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white">{g.month} {t('age_months')}</h4><p className="text-xs text-slate-400 font-bold uppercase">{g.height}cm • {g.weight}kg</p></div>
                       <button onClick={() => onDeleteGrowth(g.id!)} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                 ))}
              </div>
           </div>
         )
      )}

      {view === 'MEMORIES' && (
         <div className="space-y-4 animate-fade-in pb-24">
            {memories.map(m => (
               <div key={m.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] flex items-center gap-4 border border-slate-50 dark:border-slate-700 shadow-sm group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0"><img src={m.imageUrl} className="w-full h-full object-cover" alt="" /></div>
                  <div className="flex-1 min-w-0 text-left">
                     <h4 className="font-bold text-slate-800 dark:text-white truncate">{m.title}</h4>
                     <p className="text-xs text-slate-400 font-bold">{m.date}</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => onEditMemory(m)} className="p-3 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"><Pencil className="w-5 h-5" /></button>
                     <button onClick={() => onDeleteMemory(m.id)} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
               </div>
            ))}
         </div>
      )}

      {view === 'REMINDERS' && (
         <div className="space-y-6 animate-fade-in pb-24">
            <section className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
               <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2 text-left"><Bell className="w-6 h-6 text-amber-500" /> {t('add_reminder')}</h2>
               <div className="divide-y divide-slate-50 dark:divide-slate-700/30 border border-slate-50 dark:border-slate-700/50 rounded-2xl overflow-hidden mb-6">
                  <IOSInput label={t('reminder_title')} icon={User} id="rem_title" placeholder="e.g. Vaccination" />
                  <IOSInput label={t('reminder_date')} icon={Clock} type="date" id="rem_date" />
               </div>
               <button onClick={async () => {
                  const titleEl = document.getElementById('rem_title') as HTMLInputElement;
                  const dateEl = document.getElementById('rem_date') as HTMLInputElement;
                  if (titleEl && dateEl && titleEl.value && dateEl.value && onSaveReminder) {
                     await onSaveReminder({ id: crypto.randomUUID(), title: titleEl.value, date: dateEl.value, type: 'event' });
                     titleEl.value = ''; dateEl.value = '';
                  }
               }} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">{t('save_reminder')}</button>
            </section>
            <div className="space-y-3">
               {remindersList.map(r => (
                  <div key={r.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm">
                     <div className="text-left"><h4 className="font-bold text-slate-800 dark:text-white">{r.title}</h4><p className="text-xs text-slate-400 font-bold">{r.date}</p></div>
                     <button onClick={() => onDeleteReminder?.(r.id)} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
};
