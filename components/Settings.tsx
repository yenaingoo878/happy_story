
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Camera, Loader2, Save, KeyRound, Unlock, ChevronRight, Moon, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, Bell, Calendar } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService } from '../lib/db';

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
    id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [showEditForm, setShowEditForm] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });

  // Reminder Form
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({ title: '', date: '', type: 'event' });
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // FIX: Define currentProfile based on the activeProfileId and profiles list
  const currentProfile = profiles.find(p => p.id === activeProfileId);

  useEffect(() => { if (initialView) setView(initialView); }, [initialView]);

  useEffect(() => {
     if (activeProfileId) {
         const p = profiles.find(pr => pr.id === activeProfileId);
         if (p) setEditingProfile(p);
     }
  }, [activeProfileId, profiles]);

  useEffect(() => {
    if (saveSuccess) {
        const timer = setTimeout(() => setSaveSuccess(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--; months += 12;
    }
    return years === 0 ? `${months} ${t('age_months')}` : `${years} ${t('age_years')}, ${months} ${t('age_months')}`;
  };

  const handleSaveProfile = async () => {
    if (!editingProfile.name.trim()) return;
    setIsSavingProfile(true);
    try {
        const profileToSave = { ...editingProfile, id: editingProfile.id || crypto.randomUUID() };
        await DataService.saveProfile(profileToSave);
        await onRefreshData();
        if (!editingProfile.id) onProfileChange(profileToSave.id || '');
        setSaveSuccess(true);
        if (passcode) { setTimeout(() => { onHideDetails(); setShowEditForm(false); }, 1000); }
        else { setTimeout(() => setShowEditForm(false), 1000); }
    } catch (error) {
        alert("Failed to save profile.");
    } finally { setIsSavingProfile(false); }
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

  if (view === 'GROWTH') {
      return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('manage_growth')}</h2>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-4">
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <input type="number" placeholder={t('month')} value={newGrowth.month || ''} onChange={e => setNewGrowth({...newGrowth, month: Number(e.target.value)})} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                    <input type="number" placeholder="cm" value={newGrowth.height || ''} onChange={e => setNewGrowth({...newGrowth, height: Number(e.target.value)})} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                    <input type="number" placeholder="kg" value={newGrowth.weight || ''} onChange={e => setNewGrowth({...newGrowth, weight: Number(e.target.value)})} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                </div>
                <button onClick={async () => {
                    if (newGrowth.month !== undefined && newGrowth.height && newGrowth.weight && activeProfileId) {
                        setIsSavingGrowth(true);
                        await DataService.saveGrowth({ id: crypto.randomUUID(), childId: activeProfileId, month: Number(newGrowth.month), height: Number(newGrowth.height), weight: Number(newGrowth.weight), synced: 0 });
                        await onRefreshData(); setNewGrowth({}); setIsSavingGrowth(false);
                    }
                }} disabled={isSavingGrowth} className="w-full py-2 bg-teal-500 text-white rounded-lg font-bold">{isSavingGrowth ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : t('add_record')}</button>
            </div>
            <div className="space-y-2">
                {growthData.map((d, i) => (
                    <div key={i} className="flex justify-between p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm items-center">
                        <span className="font-bold text-teal-600">Month {d.month}</span>
                        <span className="dark:text-slate-300">{d.height}cm | {d.weight}kg</span>
                        <button onClick={() => onDeleteGrowth(d.id!)} className="text-rose-500 p-2"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  if (view === 'MEMORIES') {
      return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('manage_memories')}</h2>
            <div className="space-y-2">
                {memories.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                        <span className="truncate w-32 font-bold text-slate-700 dark:text-slate-200">{m.title}</span>
                        <div className="flex gap-2">
                            <button onClick={() => onEditMemory(m)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4"/></button>
                            <button onClick={() => onDeleteMemory(m.id)} className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  if (view === 'REMINDERS') {
      return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('manage_reminders')}</h2>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6 border border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">{t('add_reminder')}</h3>
                <div className="space-y-3">
                    <input type="text" placeholder={t('reminder_title')} value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                    <input type="date" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white min-h-[48px] appearance-none text-start"/>
                    <button onClick={handleSaveNewReminder} disabled={isSavingReminder || !newReminder.title || !newReminder.date} className="w-full py-2 bg-primary text-white rounded-lg font-bold shadow-md active:scale-95 transition-transform">
                        {isSavingReminder ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : t('save_reminder')}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {remindersList.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Calendar className="w-4 h-4"/></div>
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{r.title}</h4>
                                <p className="text-xs text-slate-400">{r.date}</p>
                            </div>
                        </div>
                        <button onClick={() => onDeleteReminder && onDeleteReminder(r.id)} className="p-2 text-rose-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
        <div className="mb-2"><h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings_title')}</h1></div>
        
        {currentProfile && (
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                 {passcode && isDetailsUnlocked && (
                    <button onClick={onHideDetails} className="absolute top-4 right-4 text-xs text-slate-400 hover:text-primary flex items-center gap-1 z-10 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full transition-colors">
                        <Lock className="w-3 h-3"/> {t('hide_details')}
                    </button>
                )}
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-full border-[3px] border-white dark:border-slate-700 shadow-md overflow-hidden shrink-0 bg-white dark:bg-slate-700">
                         {currentProfile.profileImage ? <img src={currentProfile.profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-600"><Baby className="w-6 h-6 text-slate-300"/></div>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('currently_active')}</span></div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight mb-0.5">{currentProfile.name}</h2>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2"><span>{calculateAge(currentProfile.dob)}</span><span className="w-1 h-1 bg-slate-300 rounded-full"></span><span className={currentProfile.gender === 'boy' ? 'text-blue-400' : 'text-pink-400'}>{currentProfile.gender === 'boy' ? t('boy') : t('girl')}</span></p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 space-y-3">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-slate-400"/><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('language')}</span></div>
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded-lg">
                        <button onClick={() => setLanguage('mm')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>MM</button>
                        <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>EN</button>
                </div>
            </div>
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3"><Moon className="w-4 h-4 text-slate-400"/><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('theme')}</span></div>
                <button onClick={toggleTheme} className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-5 h-5 bg-white rounded-full shadow-md"></div></button>
            </div>
             {toggleReminders && (
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-3"><Bell className="w-4 h-4 text-slate-400"/><div><span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">{t('notifications')}</span><span className="text-[10px] text-slate-400">{t('birthday_reminders')}</span></div></div>
                    <button onClick={toggleReminders} className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${remindersEnabled ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-5 h-5 bg-white rounded-full shadow-md"></div></button>
                </div>
             )}
        </div>

        {passcode && !isDetailsUnlocked ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
            <Lock className="w-6 h-6 text-slate-400"/><h3 className="font-bold text-md dark:text-white">{t('private_info')}</h3>
            <button onClick={onUnlockRequest} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-md">{t('tap_to_unlock')}</button>
        </div>
        ) : (
        <div className="animate-fade-in space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                 <button onClick={() => setShowEditForm(!showEditForm)} className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/20 hover:bg-slate-100 transition-colors">
                     <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-slate-500"/><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('edit_profile')} / {t('add_new_profile')}</span></div>
                     {showEditForm ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                 </button>
                 {showEditForm && (
                     <div className="p-5 border-t border-slate-100 dark:border-slate-700 animate-slide-up space-y-4">
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            <button onClick={() => { setEditingProfile({ id: '', name: '', dob: '', gender: 'boy' }); }} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-primary text-primary text-xs font-bold"><UserPlus className="w-3 h-3"/> {t('add_new_profile')}</button>
                            {profiles.map(p => (
                                <button key={p.id} onClick={() => { onProfileChange(p.id!); setEditingProfile(p); }} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${editingProfile.id === p.id ? 'bg-primary/10 border-primary text-primary' : 'border-slate-200 text-slate-500'}`}><span className="text-xs font-bold">{p.name}</span></button>
                            ))}
                        </div>
                        <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-700 dark:text-white" placeholder={t('child_name_label')} />
                        <input type="date" value={editingProfile.dob} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-700 dark:text-white min-h-[48px] appearance-none text-start" />
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-3 bg-primary text-white font-bold rounded-xl">{isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : t('save_changes')}</button>
                     </div>
                 )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                <div className="p-3">
                     {!passcode ? (
                        <button onClick={onPasscodeSetup} className="w-full p-2 flex justify-between items-center text-sm font-bold dark:text-white"><div className="flex items-center gap-3"><KeyRound className="w-4 h-4"/><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('setup_passcode')}</span></div><ChevronRight className="w-4 h-4"/></button>
                    ) : (
                        <>
                        <button onClick={onPasscodeChange} className="w-full p-2 flex justify-between items-center mb-1 text-sm font-bold dark:text-white"><div className="flex items-center gap-3"><KeyRound className="w-4 h-4"/><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('change_passcode')}</span></div><ChevronRight className="w-4 h-4"/></button>
                        <button onClick={onPasscodeRemove} className="w-full p-2 flex justify-between items-center text-sm font-bold text-rose-500"><div className="flex items-center gap-3"><Unlock className="w-4 h-4"/><span>{t('remove_passcode')}</span></div><ChevronRight className="w-4 h-4"/></button>
                        </>
                    )}
                </div>
                <div className="p-3 space-y-1">
                    <button onClick={() => setView('GROWTH')} className="w-full p-2 flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_growth')}<ChevronRight className="w-4 h-4"/></button>
                    <button onClick={() => setView('MEMORIES')} className="w-full p-2 flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_memories')}<ChevronRight className="w-4 h-4"/></button>
                    <button onClick={() => setView('REMINDERS')} className="w-full p-2 flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_reminders')}<ChevronRight className="w-4 h-4"/></button>
                </div>
            </div>

            <button onClick={onLogout} className="w-full p-3 bg-white dark:bg-slate-800 text-rose-500 font-bold rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"><LogOut className="w-4 h-4"/>{t('logout')}</button>
        </div>
        )}
    </div>
  );
};
