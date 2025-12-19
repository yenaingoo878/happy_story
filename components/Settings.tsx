
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Camera, Loader2, Save, KeyRound, Unlock, ChevronRight, Moon, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, Bell, Calendar, MapPin, Clock, Droplets, Home, Activity, Image as ImageIcon, X, Cloud, RefreshCw, AlertCircle, Database, ServerCrash, Bug, Wifi, Scale, Ruler } from 'lucide-react';
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
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'OK' | 'ERROR' | 'LOADING'>('LOADING');
  const [dbError, setDbError] = useState<string | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; error?: string} | null>(null);
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({ title: '', date: '', type: 'event' });
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
             setDbError(e.message);
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

  useEffect(() => {
    if (saveSuccess) {
        const timer = setTimeout(() => setSaveSuccess(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleManualSync = async () => {
    if (!isCloudEnabled || isGuestMode) return;
    setIsSyncing(true);
    setLastSyncError(null);
    try {
      const result = await syncData();
      if (!result.success) {
          setLastSyncError(result.reason || result.error || 'Unknown Error');
      } else {
          await onRefreshData();
      }
    } catch (e: any) {
      setLastSyncError(e.message || 'Network failure');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
      setIsTestingConn(true);
      setTestResult(null);
      try {
          const res = await DataService.testSupabaseConnection();
          setTestResult(res);
      } catch (e: any) {
          setTestResult({success: false, error: e.message});
      } finally {
          setIsTestingConn(false);
      }
  };

  const handleResetDB = async () => {
      if (confirm(language === 'mm' ? "အချက်အလက်အားလုံး ဖျက်ပြီး App ကို ပြန်ဖွင့်ပါမည်။ သေချာပါသလား?" : "This will delete all local data and reload the app. Are you sure?")) {
          await DataService.resetLocalDatabase();
      }
  };

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
          alert("Image upload failed.");
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
    <div className="flex flex-col items-center justify-center py-10 px-6 animate-fade-in text-center max-w-sm mx-auto h-[50vh]">
      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1 tracking-tight">{t('private_info')}</h2>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">{t('locked_msg')}</p>
      <button 
        onClick={onUnlockRequest}
        className="px-8 py-2.5 bg-slate-900 dark:bg-primary text-white text-[10px] font-extrabold rounded-xl shadow-lg btn-primary-active active:scale-95 transition-all"
      >
        {t('tap_to_unlock')}
      </button>
    </div>
  );

  if (view === 'GROWTH') {
      return (
        <div className="max-w-2xl mx-auto space-y-3">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors btn-active-scale px-2 py-1 rounded-lg"><ArrowLeft className="w-3.5 h-3.5"/> {t('back')}</button>
            {isLocked ? renderLockedState() : (
            <div className="animate-fade-in space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('manage_growth')}</h2>
                    {editingGrowthId && (
                        <button onClick={() => { setEditingGrowthId(null); setNewGrowth({}); }} className="text-[10px] font-bold text-rose-500 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 rounded-full transition-all btn-active-scale">
                            <X className="w-3 h-3"/> {t('cancel_edit')}
                        </button>
                    )}
                </div>
                
                <div className={`bg-white dark:bg-slate-800 p-4 rounded-[28px] shadow-sm border transition-all duration-300 ${editingGrowthId ? 'border-teal-500' : 'border-slate-100 dark:border-slate-700'}`}>
                    <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        {editingGrowthId ? t('edit') : t('add_record')}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('month')}</label>
                          <input type="number" placeholder="#" value={newGrowth.month ?? ''} onChange={e => setNewGrowth({...newGrowth, month: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('height_label')}</label>
                          <input type="number" placeholder="cm" value={newGrowth.height ?? ''} onChange={e => setNewGrowth({...newGrowth, height: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('weight_label')}</label>
                          <input type="number" placeholder="kg" value={newGrowth.weight ?? ''} onChange={e => setNewGrowth({...newGrowth, weight: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white" />
                        </div>
                    </div>
                    <button 
                      onClick={handleSaveGrowth} 
                      disabled={isSavingGrowth || newGrowth.month === undefined || !newGrowth.height} 
                      className={`w-full py-3 rounded-xl text-xs font-bold shadow-md transition-all btn-primary-active flex items-center justify-center gap-2 ${editingGrowthId ? 'bg-indigo-500 shadow-indigo-500/10' : 'bg-teal-500 shadow-teal-500/10'} text-white`}
                    >
                      {isSavingGrowth ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                        <>
                            {editingGrowthId ? <Save className="w-4 h-4"/> : <Check className="w-4 h-4"/>} 
                            {editingGrowthId ? t('update_record') : t('add_record')}
                        </>
                      )}
                    </button>
                </div>

                <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 mb-1">{t('growth_subtitle')}</h3>
                    {growthData.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">{t('no_photos')}</div>
                    ) : (
                      growthData.map((d, i) => (
                          <div key={d.id || i} className={`flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-2xl border transition-all shadow-sm btn-active-scale ${editingGrowthId === d.id ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-900/10' : 'border-slate-50 dark:border-slate-700'}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 font-bold text-xs">{d.month}</div>
                                <div>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.height} cm • {d.weight} kg</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                 <button onClick={(e) => { e.stopPropagation(); handleEditGrowth(d); }} className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors btn-active-scale rounded-lg"><Pencil className="w-3.5 h-3.5"/></button>
                                 <button onClick={(e) => { e.stopPropagation(); onDeleteGrowth(d.id!); }} className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors btn-active-scale rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
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
        <div className="max-w-2xl mx-auto space-y-3">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-xs font-bold text-slate-500 btn-active-scale px-2 py-1 rounded-lg"><ArrowLeft className="w-3.5 h-3.5"/> {t('back')}</button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-1">{t('manage_memories')}</h2>
            {isLocked ? renderLockedState() : (
            <div className="grid gap-2 animate-fade-in">
                {memories.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-50 dark:border-slate-700 shadow-sm btn-active-scale">
                        <div className="flex items-center gap-3">
                          <img src={m.imageUrl} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200 block text-xs">{m.title}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{m.date}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); onEditMemory(m); }} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-400 hover:text-primary transition-colors btn-active-scale"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteMemory(m.id); }} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-300 hover:text-rose-500 transition-colors btn-active-scale"><Trash2 className="w-3.5 h-3.5"/></button>
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
        <div className="max-w-2xl mx-auto space-y-3">
            <button onClick={() => setView('MAIN')} className="flex items-center gap-2 text-xs font-bold text-slate-500 btn-active-scale px-2 py-1 rounded-lg"><ArrowLeft className="w-3.5 h-3.5"/> {t('back')}</button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-1">{t('manage_reminders')}</h2>
            {isLocked ? renderLockedState() : (
            <div className="animate-fade-in space-y-3">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('add_reminder')}</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder={t('reminder_title')} value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-primary/20 dark:text-white" />
                        <input type="date" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-primary/20 dark:text-white min-h-[40px]" />
                        <button onClick={handleSaveNewReminder} disabled={isSavingReminder || !newReminder.title || !newReminder.date} className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 btn-primary-active transition-all">
                            {isSavingReminder ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : t('save_reminder')}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {remindersList.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 btn-active-scale">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Bell className="w-4 h-4"/></div>
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">{r.title}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.date}</p>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteReminder && onDeleteReminder(r.id); }} className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors btn-active-scale rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                    ))}
                </div>
            </div>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('settings_title')}</h1>
        
        {currentProfile && (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-5 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden btn-active-scale">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-2xl border-2 border-white dark:border-slate-700 shadow-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700">
                         {currentProfile.profileImage ? <img src={currentProfile.profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Baby className="w-7 h-7 text-slate-300"/></div>}
                    </div>
                    <div className="flex-1">
                        <span className="text-[8px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest mb-1 inline-block">{t('currently_active')}</span>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-0.5">{currentProfile.name}</h2>
                        <div className="flex items-center gap-2 opacity-70">
                           <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{calculateAge(currentProfile.dob)}</p>
                           <span className="w-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full"></span>
                           <p className={`text-[10px] font-bold uppercase tracking-tighter ${currentProfile.gender === 'boy' ? 'text-indigo-400' : 'text-rose-400'}`}>{currentProfile.gender === 'boy' ? t('boy') : t('girl')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 relative">
                        <Cloud className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`}/>
                        {isCloudEnabled && !isGuestMode && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800"></div>}
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{t('cloud_sync')}</h3>
                        <div className="mt-0.5">
                            {isCloudEnabled ? (
                                isGuestMode ? (
                                    <span className="text-[8px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Local Mode</span>
                                ) : (
                                    <span className="text-[8px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{t('sync_active')}</span>
                                )
                            ) : (
                                <span className="text-[8px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{t('missing_config')}</span>
                            )}
                        </div>
                    </div>
                </div>
                {isCloudEnabled && !isGuestMode && (
                    <div className="flex gap-1.5">
                        <button onClick={handleTestConnection} disabled={isTestingConn} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 btn-active-scale"><Wifi className="w-4 h-4" /></button>
                        <button onClick={handleManualSync} disabled={isSyncing} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 btn-active-scale"><RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /></button>
                    </div>
                )}
            </div>

            {testResult && (
                <div className={`p-2.5 rounded-xl border animate-fade-in text-[10px] ${testResult.success ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800 text-emerald-700' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800 text-rose-700'}`}>
                    <div className="flex items-center gap-2">
                        {testResult.success ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span className="font-bold">{testResult.success ? 'Sync Connection OK' : 'Sync Error'}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600 flex items-center gap-2.5 btn-active-scale">
                    <Database className={`w-3.5 h-3.5 ${dbStatus === 'OK' ? 'text-emerald-500' : 'text-rose-500'}`}/>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Database: {dbStatus === 'OK' ? 'OK' : 'Err'}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600 flex items-center gap-2.5 btn-active-scale">
                    <Globe className={`w-3.5 h-3.5 ${navigator.onLine ? 'text-emerald-500' : 'text-rose-500'}`}/>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Network: {navigator.onLine ? 'Online' : 'Off'}</span>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-700 p-2 divide-y divide-slate-50 dark:divide-slate-700/30">
            <div className="flex justify-between items-center p-2.5 btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500"><Globe className="w-4 h-4"/></div><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('language')}</span></div>
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded-lg">
                    <button onClick={() => setLanguage('mm')} className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>မြန်မာ</button>
                    <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>ENG</button>
                </div>
            </div>
            <div className="flex justify-between items-center p-2.5 btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Moon className="w-4 h-4"/></div><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('theme')}</span></div>
                <button onClick={toggleTheme} className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-4.5 h-4.5 bg-white rounded-full shadow-sm"></div></button>
            </div>
            <div className="flex justify-between items-center p-2.5 btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Bell className="w-4 h-4"/></div><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('notifications')}</span></div>
                <button onClick={toggleReminders} className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${remindersEnabled ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-4.5 h-4.5 bg-white rounded-full shadow-sm"></div></button>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             <button onClick={() => isLocked ? onUnlockRequest() : setShowEditForm(!showEditForm)} className="w-full flex items-center justify-between p-4 btn-active-scale">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 relative">
                        <Pencil className="w-4 h-4"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-100"><Lock className="w-2 h-2 text-slate-400" /></div>}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('edit_profile')}</span>
                 </div>
                 {isLocked ? <ChevronRight className="w-3.5 h-3.5 text-slate-200"/> : (showEditForm ? <ChevronUp className="w-4 h-4 text-slate-300"/> : <ChevronDown className="w-4 h-4 text-slate-300"/>)}
             </button>
             {!isLocked && showEditForm && (
                 <div className="p-4 border-t border-slate-50 dark:border-slate-700 animate-slide-up space-y-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button onClick={() => { setEditingProfile({ id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: '', profileImage: '', birthWeight: undefined, birthHeight: undefined }); }} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-primary text-primary text-[10px] font-bold btn-active-scale"><UserPlus className="w-3 h-3"/> {t('add_new_profile')}</button>
                        {profiles.map(p => (
                            <button key={p.id} onClick={() => { onProfileChange(p.id!); setEditingProfile(p); }} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all btn-active-scale ${editingProfile.id === p.id ? 'bg-primary/10 border-primary text-primary' : 'border-slate-100 dark:border-slate-700 text-slate-400'}`}><span className="text-[10px] font-bold">{p.name}</span></button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 py-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 justify-center">
                        <div className="w-14 h-14 rounded-xl border-2 border-white dark:border-slate-800 shadow-md overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
                            {isUploadingProfileImage ? <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="w-4 h-4 animate-spin text-white" /></div> : editingProfile.profileImage ? <img src={editingProfile.profileImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Baby className="w-6 h-6" /></div>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <button onClick={() => cameraInputRef.current?.click()} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-black border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 btn-active-scale"><Camera className="w-3 h-3 text-indigo-500" /> {t('take_photo')}</button>
                            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-black border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 btn-active-scale"><ImageIcon className="w-3 h-3 text-rose-500" /> {t('upload_photo')}</button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" /><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleProfileImageUpload} className="hidden" />
                    </div>

                    {/* Grouped Information Sections */}
                    <div className="space-y-6">
                        {/* Section: General Info */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <UserPlus className="w-3.5 h-3.5 text-primary" />
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">အခြေခံအချက်အလက် (General)</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('child_name_label')}</label><input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('child_dob')}</label><input type="date" value={editingProfile.dob} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white min-h-[36px]" /></div>
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('gender_label')}</label><div className="flex bg-slate-50 dark:bg-slate-700 p-0.5 rounded-xl"><button onClick={() => setEditingProfile({...editingProfile, gender: 'boy'})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all btn-active-scale ${editingProfile.gender === 'boy' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-500' : 'text-slate-400'}`}>{t('boy')}</button><button onClick={() => setEditingProfile({...editingProfile, gender: 'girl'})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all btn-active-scale ${editingProfile.gender === 'girl' ? 'bg-white dark:bg-slate-600 shadow-sm text-rose-500' : 'text-slate-400'}`}>{t('girl')}</button></div></div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('blood_type')}</label>
                                  <select value={editingProfile.bloodType || ''} onChange={e => setEditingProfile({...editingProfile, bloodType: e.target.value})} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white appearance-none">
                                    <option value="">Select Type</option>
                                    <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                                    <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                                    <option value="O+">O+</option><option value="O-">O-</option>
                                  </select>
                                </div>
                            </div>
                        </div>

                        {/* Section: Birth Details */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">မွေးဖွားစဉ် အချက်အလက် (Birth Details)</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('birth_time')}</label><input type="time" value={editingProfile.birthTime || ''} onChange={e => setEditingProfile({...editingProfile, birthTime: e.target.value})} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('hospital_name')}</label><input type="text" value={editingProfile.hospitalName || ''} onChange={e => setEditingProfile({...editingProfile, hospitalName: e.target.value})} placeholder={t('hospital_placeholder')} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('city_label')}</label><input type="text" value={editingProfile.birthLocation || ''} onChange={e => setEditingProfile({...editingProfile, birthLocation: e.target.value})} placeholder={t('location_placeholder')} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('country_label')}</label><input type="text" value={editingProfile.country || ''} onChange={e => setEditingProfile({...editingProfile, country: e.target.value})} placeholder={t('country_placeholder')} className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                            </div>
                        </div>

                        {/* Section: Stats */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Scale className="w-3.5 h-3.5 text-teal-400" />
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">မွေးစဉ် အရွယ်အစား (Stats at Birth)</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('birth_weight_label')}</label><input type="number" step="0.01" value={editingProfile.birthWeight || ''} onChange={e => setEditingProfile({...editingProfile, birthWeight: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="0.00 kg" className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('birth_height_label')}</label><input type="number" step="0.1" value={editingProfile.birthHeight || ''} onChange={e => setEditingProfile({...editingProfile, birthHeight: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="0.0 cm" className="w-full px-3 py-2 rounded-xl border-none bg-slate-50 dark:bg-slate-700 text-xs dark:text-white" /></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingProfileImage} className="flex-1 py-3 bg-slate-900 dark:bg-primary text-white text-[10px] font-black uppercase rounded-xl shadow-md flex items-center justify-center gap-2 btn-primary-active">{isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> {t('save_changes')}</>}</button>
                        {editingProfile.id && <button onClick={() => onDeleteProfile(editingProfile.id!)} className="p-3 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900/20 btn-active-scale"><Trash2 className="w-4 h-4"/></button>}
                    </div>
                 </div>
             )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700/30 p-1">
            <button onClick={() => isLocked ? onUnlockRequest() : setView('GROWTH')} className="w-full p-3.5 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 relative">
                        <Activity className="w-4 h-4"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-50"><Lock className="w-2 h-2 text-slate-400" /></div>}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('manage_growth')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-200"/>
            </button>
            <button onClick={() => isLocked ? onUnlockRequest() : setView('MEMORIES')} className="w-full p-3.5 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 relative">
                        <ImageIcon className="w-4 h-4"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-50"><Lock className="w-2 h-2 text-slate-400" /></div>}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('manage_memories')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-200"/>
            </button>
            <button onClick={() => isLocked ? onUnlockRequest() : setView('REMINDERS')} className="w-full p-3.5 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary relative">
                        <Bell className="w-4 h-4"/>
                        {isLocked && <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-50"><Lock className="w-2 h-2 text-slate-400" /></div>}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('manage_reminders')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-200"/>
            </button>
            <button onClick={onPasscodeSetup} className="w-full p-3.5 flex justify-between items-center btn-active-scale rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><KeyRound className="w-4 h-4"/></div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{passcode ? t('change_passcode') : t('setup_passcode')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-200"/>
            </button>
        </div>

        <button onClick={onLogout} className="w-full p-4 bg-white dark:bg-slate-800 text-rose-500 text-xs font-black uppercase rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2 btn-active-scale"><LogOut className="w-4 h-4"/>{t('logout')}</button>
    </div>
  );
};
