
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, Loader2, Save, Moon, Sun, Trash2, Pencil, LogOut, ChevronDown, Bell, Activity, Image as ImageIcon, X, Cloud, HardDrive, Clock, User, ShieldCheck, ChevronLeft, Plus, Settings as SettingsIcon, CircleUser, CheckCircle2, BookOpen, BellRing, Languages, Mail } from 'lucide-react';
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
             <select id={id} value={value} onChange={onChange} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-6 text-left outline-none">
                {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
             <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
           </div>
        ) : (
           <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 h-6 text-left outline-none" />
        )}
     </div>
  </div>
);

const SettingToggle = ({ icon: Icon, label, sublabel, active, onToggle, colorClass = "text-primary", bgClass = "bg-primary/10" }: any) => (
  <div className="p-5 flex items-center justify-between group">
     <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl ${bgClass} flex items-center justify-center ${colorClass} shadow-sm transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
           <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{label}</h3>
           {sublabel && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sublabel}</p>}
        </div>
     </div>
     <button 
       onClick={onToggle} 
       className={`w-12 h-6.5 rounded-full transition-all relative flex items-center px-1 shadow-inner ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
     >
        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-5.5' : 'translate-x-0'}`} />
     </button>
  </div>
);

interface SettingsProps {
  language: Language; setLanguage: (lang: Language) => void; theme: Theme; toggleTheme: () => void;
  profiles: ChildProfile[]; activeProfileId: string; onProfileChange: (id: string) => void; onRefreshData: () => Promise<void>;
  passcode: string | null; isDetailsUnlocked: boolean; onUnlockRequest: () => void; onPasscodeSetup: () => void;
  onPasscodeChange: () => void; onPasscodeRemove: () => void; onHideDetails: () => void;
  growthData: GrowthData[]; memories: Memory[]; stories: Story[];
  onEditMemory: (mem: Memory) => void; onDeleteMemory: (id: string) => void; 
  onStoryClick: (story: Story) => void; onDeleteStory: (id: string) => void;
  onDeleteGrowth: (id: string) => void; onDeleteProfile: (id: string) => void;
  isGuestMode?: boolean; onLogout: () => void; initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES';
  remindersEnabled: boolean; toggleReminders: () => void; remindersList: Reminder[]; onDeleteReminder: (id: string) => void;
  onSaveReminder: (reminder: Reminder) => Promise<void>;
  onAddMemoryClick: () => void;
  session: any;
}

export const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme,
  profiles, activeProfileId, onProfileChange, onRefreshData,
  passcode, isDetailsUnlocked, onUnlockRequest,
  onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails,
  growthData, memories, stories, onEditMemory, onDeleteMemory, onStoryClick, onDeleteStory, onDeleteGrowth, onDeleteProfile,
  isGuestMode, onLogout, initialView, remindersEnabled, toggleReminders,
  remindersList = [], onDeleteReminder, onSaveReminder,
  onAddMemoryClick,
  session
}) => {
  const t = (key: any) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES'>(initialView || 'MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({ id: '', name: '', dob: '', gender: 'boy' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({});
  const [newReminder, setNewReminder] = useState({ title: '', date: '' });
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isLocked = passcode && !isDetailsUnlocked;

  useEffect(() => { if (activeProfileId) { const p = profiles.find(pr => pr.id === activeProfileId); if (p) setEditingProfile(p); } }, [activeProfileId, profiles]);

  const triggerSuccess = () => { setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000); };

  const handleSaveGrowth = async () => {
      if (newGrowth.month !== undefined && newGrowth.height !== undefined && newGrowth.weight !== undefined && activeProfileId) {
          setIsSavingGrowth(true);
          try {
              await DataService.saveGrowth({ id: editingGrowthId || crypto.randomUUID(), childId: activeProfileId, month: Number(newGrowth.month), height: Number(newGrowth.height), weight: Number(newGrowth.weight), synced: 0 });
              await onRefreshData(); setNewGrowth({}); setEditingGrowthId(null); triggerSuccess();
          } catch (e) { alert("Failed to save growth record."); } 
          finally { setIsSavingGrowth(false); }
      }
  };

  const handleSaveProfile = async () => {
      if (editingProfile.name && editingProfile.id) {
          setIsSavingProfile(true);
          try {
              await DataService.saveProfile({ ...editingProfile, synced: 0 });
              await onRefreshData(); setShowProfileDetails(false); triggerSuccess();
          } catch (e) { alert("Failed to save profile."); } 
          finally { setIsSavingProfile(false); }
      }
  };

  const handleAddReminder = async () => {
      if (newReminder.title && newReminder.date && onSaveReminder) {
          await onSaveReminder({ id: crypto.randomUUID(), title: newReminder.title, date: newReminder.date, type: 'event' });
          setNewReminder({ title: '', date: '' }); triggerSuccess();
      }
  };

  const LockedScreen = () => (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-primary/10"><Lock className="w-10 h-10 text-primary" /></div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('private_info')}</h2><p className="text-slate-400 font-bold text-sm mb-12 max-w-[240px] leading-relaxed">{t('locked_msg')}</p>
      <button onClick={onUnlockRequest} className="px-14 py-4.5 bg-slate-900 dark:bg-primary text-white text-sm font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] transition-all">{t('tap_to_unlock')}</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-2 relative">
      {showSuccess && (<div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] animate-fade-in pointer-events-none"><div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/20"><CheckCircle2 className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">{t('profile_saved')}</span></div></div>)}
      
      {view !== 'MAIN' && (<button onClick={() => setView('MAIN')} className="mb-6 flex items-center gap-3 text-slate-500 font-black hover:text-primary transition-colors px-2 text-lg"><ChevronLeft className="w-7 h-7" />{t('back')}</button>)}
      
      {view === 'MAIN' && (
        <div className="animate-fade-in space-y-5 pb-32">
          <div className="flex items-center justify-between px-2">
            <div className="text-left">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{t('settings_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-0.5">{t('settings_subtitle')}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><SettingsIcon className="w-5 h-5"/></div>
          </div>

          {/* User Profile Card */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                   <CircleUser className="w-4 h-4 text-slate-400"/>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('about_child')}</h3>
                </div>
                <button onClick={() => DataService.saveProfile({ id: crypto.randomUUID(), name: t('add_new_profile'), dob: new Date().toISOString().split('T')[0], gender: 'boy' }).then(() => onRefreshData())} className="text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-primary/5 rounded-xl flex items-center gap-1.5"><Plus className="w-3.5 h-3.5"/> {t('add_new_profile')}</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar border-b border-slate-50 dark:border-slate-700/50 mb-5 items-center">
                {profiles.map(p => (<button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${p.id === activeProfileId ? 'scale-105' : 'opacity-40 grayscale'}`}><div className={`w-12 h-12 rounded-[18px] border-2 overflow-hidden flex items-center justify-center ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>{p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover" /> : <Baby className="w-5 h-5 text-slate-400" />}</div><span className="text-[9px] font-black truncate max-w-[50px]">{p.name}</span></button>))}
            </div>
            <div className="flex items-center justify-between px-1">
                <div className="text-left">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{currentProfile?.name}</h2>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">{currentProfile?.dob}</p>
                </div>
                <button onClick={() => isLocked ? onUnlockRequest() : setShowProfileDetails(!showProfileDetails)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-primary text-white">{isLocked ? <Lock className="w-3.5 h-3.5" /> : (showProfileDetails ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />)}{isLocked ? t('tap_to_unlock') : (showProfileDetails ? t('close_edit') : t('edit_profile'))}</button>
            </div>
            {showProfileDetails && !isLocked && (<div className="animate-slide-up space-y-4 pt-5"><IOSInput label={t('child_name_label')} icon={User} value={editingProfile.name} onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} /><button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-4.5 bg-primary text-white font-black rounded-3xl shadow-xl uppercase tracking-[0.25em]">{t('save_changes')}</button></div>)}
          </section>

          {/* Personalization Section */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-4 px-6 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('app_settings')}</h3></div>
            
            <SettingToggle 
              icon={theme === 'dark' ? Moon : Sun} 
              label={t('theme')} 
              sublabel={theme === 'dark' ? 'Dark Mode On' : 'Light Mode On'}
              active={theme === 'dark'} 
              onToggle={toggleTheme} 
              colorClass="text-indigo-500" 
              bgClass="bg-indigo-50 dark:bg-indigo-900/20"
            />

            {/* Language Selection: MM / EN Buttons */}
            <div className="p-5 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 shadow-sm transition-transform group-hover:scale-110 duration-300">
                      <Languages className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                     <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('language')}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'mm' ? 'မြန်မာဘာသာ' : 'English (US)'}</p>
                  </div>
               </div>
               <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl border border-slate-200 dark:border-slate-600/50">
                  <button 
                    onClick={() => setLanguage('mm')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-400'}`}
                  >
                    MM
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-400'}`}
                  >
                    EN
                  </button>
               </div>
            </div>

            <SettingToggle 
              icon={BellRing} 
              label={t('notifications')} 
              sublabel={remindersEnabled ? 'Enabled' : 'Disabled'}
              active={remindersEnabled} 
              onToggle={toggleReminders} 
              colorClass="text-amber-500" 
              bgClass="bg-amber-50 dark:bg-amber-900/20"
            />
          </section>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-1">
             <button onClick={() => setView('REMINDERS')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group transition-all"><div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 group-hover:scale-110"><Bell className="w-4.5 h-4.5" /></div><div><h3 className="font-black text-slate-800 dark:text-white text-base mb-1">{remindersList.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('manage_reminders')}</p></div></button>
             <button onClick={() => setView('STORIES')} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group transition-all"><div className="w-9 h-9 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 group-hover:scale-110"><BookOpen className="w-4.5 h-4.5" /></div><div><h3 className="font-black text-slate-800 dark:text-white text-base mb-1">{stories.length}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ebooks</p></div></button>
             {/* New Add Memory Shortcut */}
             <button onClick={onAddMemoryClick} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between h-32 group transition-all"><div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110"><Plus className="w-4.5 h-4.5" /></div><div><h3 className="font-black text-slate-800 dark:text-white text-xs mb-1 uppercase tracking-tight">{language === 'mm' ? 'အမှတ်တရအသစ်' : 'Add Memory'}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capture</p></div></button>
          </div>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm"><ShieldCheck className="w-4.5 h-4.5" /></div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('security_title')}</h3>
               </div>
               <div className="flex gap-2">
                  {passcode ? (
                    <button onClick={onPasscodeChange} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                  ) : <button onClick={onPasscodeSetup} className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest">{t('setup_passcode')}</button>}
               </div>
            </div>
          </section>

          {/* Account & Logout Section at the Bottom */}
          <section className="bg-rose-50/30 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/20 p-5 mt-10">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
                      <CircleUser className="w-6 h-6" />
                   </div>
                   <div className="text-left">
                      <h4 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{isGuestMode ? 'Guest Session' : 'Active Account'}</h4>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mt-0.5">
                         <Mail className="w-3 h-3" />
                         <span className="truncate max-w-[150px]">{isGuestMode ? 'Saved Locally' : (session?.user?.email || 'Authenticated')}</span>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={onLogout} 
                  className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black rounded-2xl shadow-lg shadow-rose-500/30 uppercase tracking-[0.15em] transition-all active:scale-95 flex items-center gap-2"
                >
                   <LogOut className="w-4 h-4" />
                   {t('logout')}
                </button>
             </div>
          </section>
        </div>
      )}

      {/* Sub-views logic */}
      {view === 'REMINDERS' && (isLocked ? <LockedScreen /> : (
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
                   <div key={r.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm">
                       <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm">{r.title}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{r.date}</p></div>
                       <button onClick={() => onDeleteReminder?.(r.id)} className="p-2 text-rose-500"><Trash2 className="w-5 h-5" /></button>
                   </div>
               ))}
            </div>
        </div>
      ))}

      {view === 'STORIES' && (isLocked ? <LockedScreen /> : (
        <div className="space-y-4 animate-fade-in pb-32 px-1">
          {stories.map(s => (
            <div key={s.id} onClick={() => onStoryClick(s)} className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm text-left relative overflow-hidden cursor-pointer group active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500"><BookOpen className="w-5 h-5" /></div><div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm truncate max-w-[200px]">{s.title}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.date}</p></div></div><button onClick={(e) => { e.stopPropagation(); onDeleteStory(s.id); }} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4.5 h-4.5" /></button></div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic line-clamp-3">"{s.content}"</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
