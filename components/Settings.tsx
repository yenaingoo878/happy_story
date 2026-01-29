
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder, Story } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { DataService, syncData, getImageSrc } from '../lib/db';
// FIX: Corrected import paths for lib utilities
import { syncManager } from '../lib/syncManager';
import { refreshR2Client, isR2Configured } from '../lib/r2Client';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// FontAwesome Icons
const Lock = ({ className }: { className?: string }) => <i className={`fa-solid fa-lock ${className}`} />;
const Baby = ({ className }: { className?: string }) => <i className={`fa-solid fa-baby ${className}`} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin ${className}`} />;
const Save = ({ className }: { className?: string }) => <i className={`fa-solid fa-floppy-disk ${className}`} />;
const Moon = ({ className }: { className?: string }) => <i className={`fa-solid fa-moon ${className}`} />;
const Sun = ({ className }: { className?: string }) => <i className={`fa-solid fa-sun ${className}`} />;
const Trash2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-trash-can ${className}`} />;
const Pencil = ({ className }: { className?: string }) => <i className={`fa-solid fa-pencil ${className}`} />;
const LogOut = ({ className }: { className?: string }) => <i className={`fa-solid fa-right-from-bracket ${className}`} />;
const ChevronDown = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-down ${className}`} />;
const Activity = ({ className }: { className?: string }) => <i className={`fa-solid fa-chart-line ${className}`} />;
const ImageIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-image ${className}`} />;
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark ${className}`} />;
const Cloud = ({ className }: { className?: string }) => <i className={`fa-solid fa-cloud ${className}`} />;
const HardDrive = ({ className }: { className?: string }) => <i className={`fa-solid fa-hard-drive ${className}`} />;
const Clock = ({ className }: { className?: string }) => <i className={`fa-solid fa-clock ${className}`} />;
const User = ({ className }: { className?: string }) => <i className={`fa-solid fa-user ${className}`} />;
const ShieldCheck = ({ className }: { className?: string }) => <i className={`fa-solid fa-shield-halved ${className}`} />;
const ChevronLeft = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-left ${className}`} />;
const ChevronRight = ({ className }: { className?: string }) => <i className={`fa-solid fa-chevron-right ${className}`} />;
const Plus = ({ className }: { className?: string }) => <i className={`fa-solid fa-plus ${className}`} />;
const SettingsIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-gear ${className}`} />;
const CircleUser = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-user ${className}`} />;
const BookOpen = ({ className }: { className?: string }) => <i className={`fa-solid fa-book-open ${className}`} />;
const BellRing = ({ className }: { className?: string }) => <i className={`fa-solid fa-bell ${className}`} />;
const Languages = ({ className }: { className?: string }) => <i className={`fa-solid fa-language ${className}`} />;
const Mail = ({ className }: { className?: string }) => <i className={`fa-solid fa-envelope ${className}`} />;

// FIX: Added missing SettingsProps interface definition to fix line 62 error
interface SettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  profiles: ChildProfile[];
  activeProfileId: string;
  onProfileChange: (id: string) => void;
  onRefreshData: () => void;
  passcode: string | null;
  isDetailsUnlocked: boolean;
  onUnlockRequest: (callback: () => void) => void;
  onPasscodeSetup: () => void;
  onPasscodeChange: () => void;
  onPasscodeRemove: () => void;
  onHideDetails: () => void;
  growthData: GrowthData[];
  memories: Memory[];
  stories: Story[];
  onEditMemory: (m: Memory) => void;
  onDeleteMemory: (id: string) => void;
  onStoryClick: (s: Story) => void;
  onDeleteStory: (id: string) => void;
  onDeleteGrowth: (id: string) => void;
  onSaveGrowth: (d: GrowthData) => void;
  onDeleteProfile: (id: string) => void;
  isGuestMode: boolean;
  onLogout: () => void;
  initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES' | 'CLOUD' | 'R2_CONFIG';
  remindersEnabled: boolean;
  toggleReminders: () => void;
  remindersList: Reminder[];
  onDeleteReminder: (id: string) => void;
  onSaveReminder: (r: Reminder) => void;
  onSaveSuccess: () => void;
  session: any;
  onViewCloudPhoto: (url: string, name: string) => void;
}

const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "" }: any) => (
  <div className={`bg-white dark:bg-slate-800 px-3 py-1.5 flex items-start gap-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm ${className}`}>
     <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5"><Icon className="w-3.5 h-3.5" /></div>
     <div className="flex-1 flex flex-col min-w-0">
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 text-left">{label}</label>
        {type === 'select' ? (
           <select value={value} onChange={onChange} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 appearance-none outline-none">{options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
        ) : (
           <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 outline-none h-5" />
        )}
     </div>
  </div>
);

const SettingToggle = ({ icon: Icon, label, sublabel, active, onToggle, colorClass = "text-primary", bgClass = "bg-primary/10" }: any) => (
  <button type="button" onClick={onToggle} className="w-full p-3 flex items-center justify-between group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all rounded-xl">
     <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-xl ${bgClass} flex items-center justify-center ${colorClass} shadow-sm transition-transform group-hover:scale-105`}><Icon className="w-4 h-4" /></div><div className="text-left"><h3 className="font-black text-slate-800 dark:text-white text-xs tracking-tight leading-none mb-0.5">{label}</h3>{sublabel && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{sublabel}</p>}</div></div>
     <div className={`w-9 h-5 rounded-full transition-all relative flex items-center px-0.5 ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-4' : 'translate-x-0'}`} /></div>
  </button>
);

const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme, profiles, activeProfileId, onProfileChange, onRefreshData, passcode, isDetailsUnlocked, onUnlockRequest, onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails, growthData, memories, stories, onEditMemory, onDeleteMemory, onStoryClick, onDeleteStory, onDeleteGrowth, onSaveGrowth, onDeleteProfile, isGuestMode, onLogout, initialView, remindersEnabled, toggleReminders, remindersList = [], onDeleteReminder, onSaveReminder, onSaveSuccess, session, onViewCloudPhoto
}) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES' | 'CLOUD' | 'R2_CONFIG'>(initialView || 'MAIN');
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isLocked = passcode && !isDetailsUnlocked;

  // FIX: Implemented handleNavWithLock to manage view transitions with security check (fixes errors on lines 96 and 98)
  const handleNavWithLock = (targetView: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES' | 'CLOUD' | 'R2_CONFIG') => {
    if (isLocked) {
      onUnlockRequest(() => setView(targetView));
    } else {
      setView(targetView);
    }
  };

  return (
    <div className="max-w-4xl mx-auto relative px-1">
      {view !== 'MAIN' && (<button onClick={() => setView('MAIN')} className="mb-4 flex items-center gap-2 text-slate-500 font-black hover:text-primary transition-colors text-base active:scale-95"><ChevronLeft className="w-6 h-6" />{t('back')}</button>)}
      
      {view === 'MAIN' && (
        <div className="animate-fade-in space-y-3 pb-24">
          <div className="flex items-center justify-between mb-2">
            <div className="text-left"><h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{t('settings_title')}</h1><p className="text-slate-500 text-[10px] font-bold mt-0.5">{t('settings_subtitle')}</p></div>
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner"><SettingsIcon className="w-4 h-4"/></div>
          </div>

          <section className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-700 p-3.5">
            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><CircleUser className="w-3 h-3 text-slate-400"/><h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('about_child')}</h3></div><button onClick={() => onRefreshData()} className="text-primary text-[8px] font-black uppercase tracking-wider px-3 py-2 bg-primary/5 rounded-xl flex items-center gap-1 active:scale-95 transition-all"><Plus className="w-3 h-3"/> {t('add_new_profile')}</button></div>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-50 dark:border-slate-700/50 mb-3 items-center">{profiles.map(p => (<button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-1 transition-all duration-300 ${p.id === activeProfileId ? 'scale-105' : 'opacity-40 grayscale'}`}><div className={`m-1 w-10 h-10 rounded-[14px] border-2 overflow-hidden flex items-center justify-center ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/5 shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>{p.profileImage ? <img src={getImageSrc(p.profileImage)} className="w-full h-full object-cover" /> : <Baby className="w-4 h-4 text-slate-400" />}</div><span className="text-[7px] font-black truncate max-w-[40px]">{p.name}</span></button>))}</div>
            <div className="flex items-center justify-between"><div className="text-left"><h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none mb-0.5">{currentProfile?.name}</h2><p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{currentProfile?.dob}</p></div><button onClick={() => isLocked ? onUnlockRequest(() => setShowProfileDetails(true)) : setShowProfileDetails(!showProfileDetails)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all bg-primary text-white active:scale-95 shadow-lg shadow-primary/20">{isLocked ? <Lock className="w-3 h-3" /> : (showProfileDetails ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />)}{isLocked ? t('tap_to_unlock') : (showProfileDetails ? t('close_edit') : t('edit_profile'))}</button></div>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-2 px-4 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('app_settings')}</h3></div>
            <SettingToggle icon={theme === 'dark' ? Moon : Sun} label={t('theme')} active={theme === 'dark'} onToggle={toggleTheme} colorClass="text-indigo-500" bgClass="bg-indigo-50 dark:bg-indigo-900/20"/>
            <SettingToggle icon={BellRing} label={t('notifications')} active={remindersEnabled} onToggle={toggleReminders} colorClass="text-amber-500" bgClass="bg-amber-50 dark:bg-amber-900/20"/>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-2 px-4 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('data_management')}</h3></div>
             <button onClick={() => handleNavWithLock('GROWTH')} className="w-full text-left p-3.5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 group-hover:scale-110 mr-3"><Activity className="w-4 h-4" /></div><p className="font-black text-slate-800 dark:text-white text-xs">{t('manage_growth')}</p><div className="ml-auto text-slate-400"><ChevronRight className="w-3.5 h-3.5"/></div></button>
             <button onClick={() => setView('REMINDERS')} className="w-full text-left p-3.5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 group-hover:scale-110 mr-3"><BellRing className="w-4 h-4" /></div><p className="font-black text-slate-800 dark:text-white text-xs">{t('manage_reminders')}</p><div className="ml-auto text-slate-400"><ChevronRight className="w-3.5 h-3.5"/></div></button>
             <button onClick={() => handleNavWithLock('MEMORIES')} className="w-full text-left p-3.5 flex items-center group active:bg-slate-50 dark:active:bg-slate-700/20 transition-all"><div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 mr-3"><ImageIcon className="w-4 h-4" /></div><p className="font-black text-slate-800 dark:text-white text-xs">{t('manage_memories')}</p><div className="ml-auto text-slate-400"><ChevronRight className="w-3.5 h-3.5"/></div></button>
          </section>

          <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/20 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20"><LogOut className="w-4 h-4" /></div><div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-xs">{t('logout')}</h4><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{isGuestMode ? 'Guest Mode' : (session?.user?.email || 'Logged In')}</p></div></div>
            <button onClick={onLogout} className="px-4 py-2 bg-rose-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest active:scale-95 transition-all">Exit</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
