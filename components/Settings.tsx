
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Camera, Loader2, Save, KeyRound, Unlock, ChevronRight, Moon, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, Bell, Calendar, MapPin, Clock, Droplets, Home, Activity, Image as ImageIcon, X, Cloud, RefreshCw, AlertCircle } from 'lucide-react';
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
    id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({ title: '', date: '', type: 'event' });
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isCloudEnabled = isSupabaseConfigured();

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

  const handleManualSync = async () => {
    if (!isCloudEnabled || isGuestMode) return;
    setIsSyncing(true);
    try {
      await syncData();
      await onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    // Adjust for negative months
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }

    if (years > 0) {
      return `${years} ${t('age_years')} ${months} ${t('age_months')}`;
    }
    return `${months} ${t('age_months')}`;
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
        setTimeout(() => setShowEditForm(false), 1000);
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

  const handleEditGrowth = (record: GrowthData) => {
      setNewGrowth({ month: record.month, height: record.height, weight: record.weight });
      setEditingGrowthId(record.id || null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in text-center max-w-sm mx-auto h-[60vh]">
      <div className="w-16 h-16 bg-primary/10 rounded-[28px] flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t('private_info')}</h2>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">{t('locked_msg')}</p>
      <button 
        onClick={onUnlockRequest}
        className="px-10 py-3 bg-slate-900 dark:bg-primary text-white text-xs font-extrabold rounded-[20px] shadow-xl active:scale-95 transition-all"
      >
        {t('tap_to_unlock')}
      </button>
    </div>
  );

  const isLocked = passcode && !isDetailsUnlocked;

  if (view === 'GROWTH') {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            {isLocked ? renderLockedState() : (
            <div className="animate-fade-in space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_growth')}</h2>
                    {editingGrowthId && (
                        <button onClick={() => { setEditingGrowthId(null); setNewGrowth({}); }} className="text-xs font-bold text-rose-500 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full transition-all">
                            <X className="w-3 h-3"/> {t('cancel_edit')}
                        </button>
                    )}
                </div>
                
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border transition-all duration-300 ${editingGrowthId ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-100 dark:border-slate-700'}`}>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                        {editingGrowthId ? t('edit') : t('add_record')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('month')}</label>
                          <input type="number" placeholder="Month #" value={newGrowth.month ?? ''} onChange={e => setNewGrowth({...newGrowth, month: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-teal-500/20 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('height_label')} (cm)</label>
                          <input type="number" placeholder="cm" value={newGrowth.height ?? ''} onChange={e => setNewGrowth({...newGrowth, height: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-teal-500/20 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('weight_label')} (kg)</label>
                          <input type="number" placeholder="kg" value={newGrowth.weight ?? ''} onChange={e => setNewGrowth({...newGrowth, weight: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-teal-500/20 dark:text-white" />
                        </div>
                    </div>
                    <button 
                      onClick={handleSaveGrowth} 
                      disabled={isSavingGrowth || newGrowth.month === undefined || !newGrowth.height} 
                      className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${editingGrowthId ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/20'} text-white`}
                    >
                      {isSavingGrowth ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                        <>
                            {editingGrowthId ? <Save className="w-5 h-5"/> : <Check className="w-5 h-5"/>} 
                            {editingGrowthId ? t('update_record') : t('add_record')}
                        </>
                      )}
                    </button>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-4">{t('growth_subtitle')}</h3>
                    {growthData.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">{t('no_photos')}</div>
                    ) : (
                      growthData.map((d, i) => (
                          <div key={d.id || i} className={`flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border transition-all shadow-sm animate-fade-in ${editingGrowthId === d.id ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-900/10' : 'border-slate-50 dark:border-slate-700'}`}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 font-bold text-sm">{d.month}</div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{d.height} cm • {d.weight} kg</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{t('months_label')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button onClick={() => handleEditGrowth(d)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"><Pencil className="w-4 h-4"/></button>
                                 <button onClick={() => onDeleteGrowth(d.id!)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                              </div>
                          </div>
                      ))
                    )}
                </div>
            </div>
            )}
        </div>
      );
  }

  if (view === 'MEMORIES') {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_memories')}</h2>
            {isLocked ? renderLockedState() : (
            <div className="grid gap-3 animate-fade-in">
                {memories.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-50 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                          <img src={m.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm">{m.title}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{m.date}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEditMemory(m)} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4"/></button>
                            <button onClick={() => onDeleteMemory(m.id)} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
            )}
        </div>
      );
  }

  if (view === 'REMINDERS') {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('manage_reminders')}</h2>
            {isLocked ? renderLockedState() : (
            <div className="animate-fade-in space-y-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('add_reminder')}</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder={t('reminder_title')} value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary/20 dark:text-white" />
                        <input type="date" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary/20 dark:text-white min-h-[48px] appearance-none text-start" />
                        <button onClick={handleSaveNewReminder} disabled={isSavingReminder || !newReminder.title || !newReminder.date} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
                            {isSavingReminder ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : t('save_reminder')}
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {remindersList.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bell className="w-5 h-5"/></div>
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{r.title}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.date}</p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteReminder && onDeleteReminder(r.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{t('settings_title')}</h1>
        
        {currentProfile && (
            <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    <div className="w-24 h-24 rounded-[32px] border-[4px] border-white dark:border-slate-700 shadow-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700 group transition-transform hover:scale-105">
                         {currentProfile.profileImage ? <img src={currentProfile.profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Baby className="w-10 h-10 text-slate-300"/></div>}
                    </div>
                    <div className="text-center sm:text-left flex-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                           <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">{t('currently_active')}</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-1">{currentProfile.name}</h2>
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                           <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{calculateAge(currentProfile.dob)}</p>
                           <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full"></span>
                           <p className={`text-sm font-bold ${currentProfile.gender === 'boy' ? 'text-indigo-400' : 'text-rose-400'}`}>{currentProfile.gender === 'boy' ? t('boy') : t('girl')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Cloud Sync & Backup Status Section */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shadow-sm">
                        <Cloud className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{t('cloud_sync')}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            {isCloudEnabled ? (
                                isGuestMode ? (
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Local Only</span>
                                ) : (
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('sync_active')}</span>
                                )
                            ) : (
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('missing_config')}</span>
                            )}
                        </div>
                    </div>
                </div>
                {isCloudEnabled && !isGuestMode && (
                    <button 
                        onClick={handleManualSync} 
                        disabled={isSyncing} 
                        className={`p-3 rounded-2xl transition-all shadow-sm ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 active:scale-95'}`}
                    >
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            {isGuestMode && isCloudEnabled && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col gap-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                            {t('sync_guest_msg')}
                        </p>
                    </div>
                    <button 
                        onClick={onLogout} 
                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        {t('enable_cloud')}
                    </button>
                </div>
            )}

            {!isCloudEnabled && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-rose-500 leading-relaxed">
                        Cloud Sync environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are missing. Please configure them in your environment settings to enable cloud backup.
                    </p>
                </div>
            )}
        </div>

        {/* Global Settings (UNLOCKED as requested) */}
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 p-3 space-y-1">
                <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500"><Globe className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('language')}</span></div>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                            <button onClick={() => setLanguage('mm')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>မြန်မာ</button>
                            <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>ENG</button>
                    </div>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Moon className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('theme')}</span></div>
                    <button onClick={toggleTheme} className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-5 h-5 bg-white rounded-full shadow-md"></div></button>
                </div>
                {toggleReminders && (
                    <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bell className="w-5 h-5"/></div><div><span className="text-sm font-bold text-slate-700 dark:text-slate-200 block leading-tight">{t('notifications')}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('birthday_reminders')}</span></div></div>
                        <button onClick={toggleReminders} className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 flex items-center ${remindersEnabled ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-5 h-5 bg-white rounded-full shadow-md"></div></button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all">
                 <button onClick={() => setShowEditForm(!showEditForm)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500"><Pencil className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('edit_profile')}</span></div>
                     {showEditForm ? <ChevronUp className="w-5 h-5 text-slate-300"/> : <ChevronDown className="w-5 h-5 text-slate-300"/>}
                 </button>
                 {showEditForm && (
                     <div className="p-6 border-t border-slate-50 dark:border-slate-700 animate-slide-up space-y-5">
                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                            <button onClick={() => { setEditingProfile({ id: '', name: '', dob: '', gender: 'boy' }); }} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-dashed border-primary text-primary text-xs font-bold hover:bg-primary/5 transition-colors"><UserPlus className="w-4 h-4"/> {t('add_new_profile')}</button>
                            {profiles.map(p => (
                                <button key={p.id} onClick={() => { onProfileChange(p.id!); setEditingProfile(p); }} className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 transition-all ${editingProfile.id === p.id ? 'bg-primary/10 border-primary text-primary' : 'border-slate-100 dark:border-slate-700 text-slate-500'}`}><span className="text-xs font-bold">{p.name}</span></button>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('child_name_label')}</label>
                              <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-none bg-slate-50 dark:bg-slate-700 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('child_dob')}</label>
                              <input type="date" value={editingProfile.dob} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-none bg-slate-50 dark:bg-slate-700 dark:text-white min-h-[48px] appearance-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('gender_label')}</label>
                              <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-2xl">
                                <button onClick={() => setEditingProfile({...editingProfile, gender: 'boy'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${editingProfile.gender === 'boy' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-500' : 'text-slate-400'}`}>{t('boy')}</button>
                                <button onClick={() => setEditingProfile({...editingProfile, gender: 'girl'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${editingProfile.gender === 'girl' ? 'bg-white dark:bg-slate-600 shadow-sm text-rose-500' : 'text-slate-400'}`}>{t('girl')}</button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('birth_time')}</label>
                              <input type="time" value={editingProfile.birthTime || ''} onChange={e => setEditingProfile({...editingProfile, birthTime: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-none bg-slate-50 dark:bg-slate-700 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('hospital_name')}</label>
                              <input type="text" value={editingProfile.hospitalName || ''} onChange={e => setEditingProfile({...editingProfile, hospitalName: e.target.value})} placeholder={t('hospital_placeholder')} className="w-full px-4 py-3 rounded-2xl border-none bg-slate-50 dark:bg-slate-700 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">{t('blood_type')}</label>
                              <select value={editingProfile.bloodType || ''} onChange={e => setEditingProfile({...editingProfile, bloodType: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-none bg-slate-50 dark:bg-slate-700 dark:text-white appearance-none">
                                <option value="">Select Type</option>
                                <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                                <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                                <option value="O+">O+</option><option value="O-">O-</option>
                              </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-6">
                            <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-4 bg-slate-900 dark:bg-primary text-white font-extrabold rounded-[24px] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                               {isSavingProfile ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Save className="w-5 h-5"/> {t('save_changes')}</>}
                            </button>
                            {editingProfile.id && (
                                <button 
                                  onClick={() => onDeleteProfile(editingProfile.id!)} 
                                  className="w-full py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-bold rounded-[20px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-colors"
                                >
                                   <Trash2 className="w-4 h-4"/> {t('delete_profile')}
                                </button>
                            )}
                        </div>
                     </div>
                 )}
            </div>
        </div>

        {/* Locked Data Management Section */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-2 space-y-1">
                 {!passcode ? (
                    <button onClick={onPasscodeSetup} className="w-full p-4 flex justify-between items-center hover:bg-slate-50 rounded-2xl transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><KeyRound className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('setup_passcode')}</span></div><ChevronRight className="w-5 h-5 text-slate-200"/></button>
                ) : (
                    <>
                    <button onClick={onPasscodeChange} className="w-full p-4 flex justify-between items-center hover:bg-slate-50 rounded-2xl transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><KeyRound className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('change_passcode')}</span></div><ChevronRight className="w-5 h-5 text-slate-200"/></button>
                    <button onClick={onPasscodeRemove} className="w-full p-4 flex justify-between items-center hover:bg-rose-50 rounded-2xl transition-colors group"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500"><Unlock className="w-5 h-5"/></div><span className="text-sm font-bold text-rose-500">{t('remove_passcode')}</span></div><ChevronRight className="w-5 h-5 text-rose-200"/></button>
                    </>
                )}
            </div>
            <div className="p-2 space-y-1">
                <button onClick={() => setView('GROWTH')} className="w-full p-4 flex justify-between items-center hover:bg-slate-50 rounded-2xl transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600"><Activity className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_growth')}</span></div><ChevronRight className="w-4 h-4 text-slate-200"/></button>
                <button onClick={() => setView('MEMORIES')} className="w-full p-4 flex justify-between items-center hover:bg-slate-50 rounded-2xl transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500"><ImageIcon className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_memories')}</span></div><ChevronRight className="w-4 h-4 text-slate-200"/></button>
                <button onClick={() => setView('REMINDERS')} className="w-full p-4 flex justify-between items-center hover:bg-slate-50 rounded-2xl transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bell className="w-5 h-5"/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('manage_reminders')}</span></div><ChevronRight className="w-4 h-4 text-slate-200"/></button>
            </div>
        </div>

        <button onClick={onLogout} className="w-full p-5 bg-white dark:bg-slate-800 text-rose-500 font-extrabold rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-3 hover:bg-rose-50 active:scale-[0.98] transition-all"><LogOut className="w-5 h-5"/>{t('logout')}</button>
    </div>
  );
};
