import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, Baby, Loader2, Save, Moon, Sun, Trash2, Pencil, LogOut, 
  ChevronDown, Bell, Activity, Image as ImageIcon, X, Cloud, 
  HardDrive, Clock, User, ShieldCheck, ChevronLeft, Plus, 
  Settings as SettingsIcon, CircleUser, CheckCircle2, BookOpen, 
  BellRing, Languages, Mail, Filter, Building2, MapPin, Globe, Scale, Ruler,
  Calendar, Heart, FileText, UserPlus, ChevronRight, KeyRound, Sparkles, Eye, EyeOff, Camera
} from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, Reminder, Story } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService, syncData } from '../lib/db';
import { syncManager } from '../lib/syncManager';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "", id, multiline = false, step, onRightIconClick }: any) => (
  <div className={`bg-white dark:bg-slate-800 px-4 py-2.5 flex items-start gap-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm group transition-all focus-within:ring-4 focus-within:ring-primary/5 ${className}`}>
     <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors shrink-0 shadow-inner mt-0.5">
        <Icon className="w-4 h-4" />
     </div>
     <div className="flex-1 flex flex-col min-w-0">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1 text-left">{label}</label>
        <div className="flex items-center">
            {type === 'select' ? (
               <div className="relative flex items-center w-full">
                 <select id={id} value={value} onChange={onChange} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-6 text-left outline-none">
                    {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </select>
                 <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
               </div>
            ) : multiline ? (
               <textarea 
                 id={id} 
                 value={value} 
                 onChange={onChange} 
                 placeholder={placeholder} 
                 className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 min-h-[60px] resize-none text-left outline-none"
               />
            ) : (
               <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 h-6 text-left outline-none" />
            )}
            {onRightIconClick && (
                <button type="button" onClick={onRightIconClick} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                    {type === 'password' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            )}
        </div>
     </div>
  </div>
);

const SettingToggle = ({ icon: Icon, label, sublabel, active, onToggle, colorClass = "text-primary", bgClass = "bg-primary/10" }: any) => (
  <button 
    type="button"
    onClick={(e) => {
        e.preventDefault();
        onToggle();
    }}
    className="w-full p-5 flex items-center justify-between group bg-transparent border-none outline-none cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/20 transition-all rounded-2xl"
  >
     <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl ${bgClass} flex items-center justify-center ${colorClass} shadow-sm transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
           <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{label}</h3>
           {sublabel && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sublabel}</p>}
        </div>
     </div>
     <div className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 shadow-inner ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
     </div>
  </button>
);

interface SettingsProps {
  language: Language; setLanguage: (lang: Language) => void; theme: Theme; toggleTheme: () => void;
  profiles: ChildProfile[]; activeProfileId: string; onProfileChange: (id: string) => void; onRefreshData: () => Promise<void>;
  passcode: string | null; isDetailsUnlocked: boolean; onUnlockRequest: () => void; onPasscodeSetup: () => void;
  onPasscodeChange: () => void; onPasscodeRemove: () => void; onHideDetails: () => void;
  growthData: GrowthData[]; memories: Memory[]; stories: Story[];
  onEditMemory: (mem: Memory) => void; onDeleteMemory: (id: string) => void; 
  onStoryClick: (story: Story) => void; onDeleteStory: (id: string) => void;
  onDeleteGrowth: (id: string) => void; onSaveGrowth: (growth: GrowthData) => Promise<void>;
  onDeleteProfile: (id: string) => void;
  isGuestMode?: boolean; onLogout: () => void; initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES';
  remindersEnabled: boolean; toggleReminders: () => void; remindersList: Reminder[]; onDeleteReminder: (id: string) => void;
  onSaveReminder: (reminder: Reminder) => Promise<void>;
  session: any;
}

export const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme,
  profiles, activeProfileId, onProfileChange, onRefreshData,
  passcode, isDetailsUnlocked, onUnlockRequest,
  onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails,
  growthData, memories, stories, onEditMemory, onDeleteMemory, onStoryClick, onDeleteStory, onDeleteGrowth, onSaveGrowth, onDeleteProfile,
  isGuestMode, onLogout, initialView, remindersEnabled, toggleReminders,
  remindersList = [], onDeleteReminder, onSaveReminder,
  session
}) => {
  const t = (key: any) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'REMINDERS' | 'STORIES'>(initialView || 'MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({ id: '', name: '', dob: '', gender: 'boy' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingGrowth, setEditingGrowth] = useState<Partial<GrowthData>>({});
  const [isProcessingProfileImage, setIsProcessingProfileImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isWeb = Capacitor.getPlatform() === 'web';

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncState, setSyncState] = useState({ status: 'idle' });

  useEffect(() => {
    syncManager.subscribe(setSyncState);
    return () => syncManager.unsubscribe();
  }, []);

  useEffect(() => {
    DataService.getSetting('geminiApiKey').then(setting => {
        if (setting && setting.value) {
            setSavedApiKey(setting.value);
        }
    });
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
        await syncData();
        await onRefreshData();
    } catch(e) {
        console.error("Manual sync failed", e);
    } finally {
        setIsManualSyncing(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsSavingApiKey(true);
    try {
        await DataService.saveSetting('geminiApiKey', apiKeyInput.trim());
        setSavedApiKey(apiKeyInput.trim());
        setApiKeyInput('');
        triggerSuccess();
    } catch (e) {
        alert("Failed to save API Key.");
    } finally {
        setIsSavingApiKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    try {
        await DataService.removeSetting('geminiApiKey');
        setSavedApiKey(null);
        setApiKeyInput('');
    } catch (e) {
        alert("Failed to remove API Key.");
    }
  };

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  const isLocked = passcode && !isDetailsUnlocked;

  useEffect(() => { 
    if (activeProfileId) { 
      const p = profiles.find(pr => pr.id === activeProfileId); 
      if (p) setEditingProfile(p); 
    } 
  }, [activeProfileId, profiles]);

  const triggerSuccess = () => { setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000); };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProfile.id) {
        setIsProcessingProfileImage(true);
        try {
            const url = await DataService.uploadImage(file);
            setEditingProfile(prev => ({ ...prev, profileImage: url }));
        } catch (error) {
            console.error("Profile image upload failed:", error);
            alert("Profile image upload failed.");
        } finally {
            setIsProcessingProfileImage(false);
            if(imageInputRef.current) imageInputRef.current.value = "";
        }
    }
  };
  
  const handleTakeProfilePhoto = async () => {
    setIsProcessingProfileImage(true);
    try {
      const permissions = await CapacitorCamera.checkPermissions();
      if (permissions.camera !== 'granted') {
        const newPermissions = await CapacitorCamera.requestPermissions();
        if (newPermissions.camera !== 'granted') {
          alert(language === 'mm' ? "Camera သုံးဖို့ Permission ပေးရန် လိုအပ်ပါတယ်" : "Camera permission is required to take photos.");
          setIsProcessingProfileImage(false);
          return;
        }
      }
      
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true, // Allow editing for profile pictures
        resultType: CameraResultType.DataUrl
      });

      if (image.dataUrl) {
        setEditingProfile(prev => ({ ...prev, profileImage: image.dataUrl }));
      }
    } catch (error) {
      console.error("Failed to take photo", error);
      if (!(error instanceof Error && error.message.toLowerCase().includes('cancelled'))) {
         alert(language === 'mm' ? "ဓာတ်ပုံရိုက်မရပါ။" : "Failed to take photo.");
      }
    } finally {
        setIsProcessingProfileImage(false);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingProfile(prev => ({...prev, profileImage: undefined}));
  };

  const handleSaveProfile = async () => {
      if (editingProfile.name && editingProfile.id) {
          setIsSavingProfile(true);
          try {
              await DataService.saveProfile({ ...editingProfile, synced: 0 });
              await onRefreshData(); 
              setShowProfileDetails(false); 
              triggerSuccess();
          } catch (e) { 
              alert("Failed to save profile."); 
          } finally { 
              setIsSavingProfile(false); 
          }
      }
  };

  const handleSaveGrowth = async () => {
      if (editingGrowth.month && editingGrowth.height && editingGrowth.weight && activeProfileId) {
          const dataToSave: GrowthData = {
              id: editingGrowth.id || crypto.randomUUID(),
              childId: activeProfileId,
              month: Number(editingGrowth.month),
              height: Number(editingGrowth.height),
              weight: Number(editingGrowth.weight)
          };
          await onSaveGrowth(dataToSave);
          setEditingGrowth({});
          triggerSuccess();
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
      <button onClick={onUnlockRequest} className="px-14 py-5 bg-slate-900 dark:bg-primary text-white text-sm font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] transition-all active:scale-95">{t('tap_to_unlock')}</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-2 relative">
      {showSuccess && (<div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] animate-fade-in pointer-events-none"><div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/20"><CheckCircle2 className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">{t('profile_saved')}</span></div></div>)}
      
      {view !== 'MAIN' && (<button onClick={() => setView('MAIN')} className="mb-6 flex items-center gap-3 text-slate-500 font-black hover:text-primary transition-colors px-2 text-lg active:scale-95"><ChevronLeft className="w-7 h-7" />{t('back')}</button>)}
      
      {view === 'MAIN' && (
        <div className="animate-fade-in space-y-5 pb-32">
          <div className="flex items-center justify-between px-2">
            <div className="text-left">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{t('settings_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-0.5">{t('settings_subtitle')}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner"><SettingsIcon className="w-5 h-5"/></div>
          </div>

          {/* User Profile Card */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-slate-=100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4 mt-3 px-1">
                <div className="flex items-center gap-2.5">
                   <CircleUser className="w-4 h-4 text-slate-400"/>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('about_child')}</h3>
                </div>
                <button onClick={() => DataService.saveProfile({ id: crypto.randomUUID(), name: t('add_new_profile'), dob: new Date().toISOString().split('T')[0], gender: 'boy' }).then(() => onRefreshData())} className="text-primary text-[10px] font-black uppercase tracking-wider px-4 py-2.5 bg-primary/5 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all"><Plus className="w-3.5 h-3.5"/> {t('add_new_profile')}</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar border-b border-slate-50 dark:border-slate-700/50 mb-5 items-center">
                {profiles.map(p => (<button key={p.id} onClick={() => onProfileChange(p.id!)} className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${p.id === activeProfileId ? 'scale-105' : 'opacity-40 grayscale'}`}><div className={`w-12 h-12 rounded-[18px] border-2 overflow-hidden flex items-center justify-center ${p.id === activeProfileId ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>{p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover" /> : <Baby className="w-5 h-5 text-slate-400" />}</div><span className="text-[9px] font-black truncate max-w-[50px]">{p.name}</span></button>))}
            </div>
            <div className="flex items-center justify-between px-1">
                <div className="text-left">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1">{currentProfile?.name}</h2>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{currentProfile?.dob}</p>
                </div>
                <button onClick={() => isLocked ? onUnlockRequest() : setShowProfileDetails(!showProfileDetails)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-primary text-white active:scale-95 shadow-lg shadow-primary/20">{isLocked ? <Lock className="w-3.5 h-3.5" /> : (showProfileDetails ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />)}{isLocked ? t('tap_to_unlock') : (showProfileDetails ? t('close_edit') : t('edit_profile'))}</button>
            </div>

            {showProfileDetails && !isLocked && (
              <div className="animate-slide-up space-y-4 pt-4 pb-4 overflow-y-auto max-h-[70vh] no-scrollbar">
                 <div className="flex flex-col items-center mb-4">
                    <div className="relative group w-24 h-24">
                       <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 flex items-center justify-center">
                          {isProcessingProfileImage ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          ) : editingProfile.profileImage ? (
                            <img src={editingProfile.profileImage} className="w-full h-full object-cover" alt="Profile" />
                          ) : (
                            <Baby className="w-10 h-10 text-slate-400" />
                          )}
                       </div>
                       {editingProfile.profileImage && !isProcessingProfileImage && (
                          <button type="button" onClick={handleRemoveImage} className="absolute top-0 right-0 z-10 p-1.5 bg-rose-500 text-white rounded-full shadow-md transition-transform hover:scale-110">
                             <X className="w-3 h-3" />
                          </button>
                       )}
                    </div>

                    <div className="flex gap-3 mt-4">
                       {isWeb ? (
                         <button type="button" onClick={() => !isProcessingProfileImage && imageInputRef.current?.click()} disabled={isProcessingProfileImage} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50">
                            <ImageIcon className="w-3.5 h-3.5" />
                            {t('upload_photo')}
                         </button>
                       ) : (
                         <button type="button" onClick={handleTakeProfilePhoto} disabled={isProcessingProfileImage} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50">
                            <Camera className="w-3.5 h-3.5" />
                            {t('take_photo')}
                         </button>
                       )}
                    </div>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                </div>
                
                <div className="space-y-3">
                  <IOSInput 
                    label={t('child_name_label')} 
                    icon={User} 
                    value={editingProfile.name} 
                    onChange={(e: any) => setEditingProfile({...editingProfile, name: e.target.value})} 
                  />
                  <div className="space-y-3 text-align: start">
                    <IOSInput 
                      label={t('child_dob')} 
                      icon={Calendar} 
                      type="date"
                      value={editingProfile.dob} 
                      onChange={(e: any) => setEditingProfile({...editingProfile, dob: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-3 text-align: start">
                    <IOSInput 
                      label={t('birth_time')} 
                      icon={Clock} 
                      type="time"
                      value={editingProfile.birthTime || ''} 
                      onChange={(e: any) => setEditingProfile({...editingProfile, birthTime: e.target.value})} 
                    />
                  </div>
                   <div className="grid grid-cols-2 gap-3">
                     <IOSInput 
                      label={t('gender_label')} 
                      icon={Baby} 
                      type="select"
                      options={[{ value: 'boy', label: t('boy') }, { value: 'girl', label: t('girl') }]}
                      value={editingProfile.gender} 
                      onChange={(e: any) => setEditingProfile({...editingProfile, gender: e.target.value})} 
                    />
                    <IOSInput 
                      label={t('blood_type')} 
                      icon={ShieldCheck} 
                      type="select"
                      options={[
                        { value: '', label: 'Select' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                        { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' },
                        { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }
                      ]}
                      value={editingProfile.bloodType || ''} 
                      onChange={(e: any) => setEditingProfile({...editingProfile, bloodType: e.target.value})} 
                    />
                  </div>
                  <IOSInput 
                    label={t('hospital_name')} 
                    icon={Building2} 
                    value={editingProfile.hospitalName || ''} 
                    placeholder={t('hospital_placeholder')}
                    onChange={(e: any) => setEditingProfile({...editingProfile, hospitalName: e.target.value})} 
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <IOSInput 
                      label={t('city_label')} 
                      icon={MapPin} 
                      value={editingProfile.birthLocation || ''} 
                      placeholder={t('location_placeholder')}
                      onChange={(e: any) => setEditingProfile({...editingProfile, birthLocation: e.target.value})} 
                    />
                    <IOSInput 
                      label={t('country_label')} 
                      icon={Globe} 
                      value={editingProfile.country || ''} 
                      placeholder={t('country_placeholder')}
                      onChange={(e: any) => setEditingProfile({...editingProfile, country: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <button 
                      onClick={handleSaveProfile} 
                      disabled={isSavingProfile} 
                      className="flex-1 py-4 bg-primary text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3 shadow-primary/20"
                    >
                      {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {t('save_changes')}
                    </button>
                    <button 
                      onClick={() => { if(editingProfile.id) { onDeleteProfile(editingProfile.id); setShowProfileDetails(false); } }}
                      disabled={isSavingProfile || profiles.length <= 1}
                      aria-label={t('delete_profile')}
                      className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                </div>
              </div>
            )}
          </section>

          {/* App Settings Section */}
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

            <div className="p-5 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 shadow-sm transition-transform group-hover:scale-110 duration-300">
                      <Languages className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                     <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{t('language')}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'mm' ? 'မြန်မာဘာသာ' : 'English (US)'}</p>
                  </div>
               </div>
               <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-600/50 shadow-inner">
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setLanguage('mm'); }}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${language === 'mm' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-500' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    MM
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setLanguage('en'); }}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${language === 'en' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-500' : 'text-slate-400 hover:text-slate-600'}`}
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

          {/* AI Settings Section */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="p-4 px-6 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">AI & Services</h3></div>
            <div className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{t('api_key_title')}</h3>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                            {t('api_key_desc_1')}
                            <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline underline-offset-2">
                                Google AI Studio
                            </a>
                            {t('api_key_desc_2')}
                        </p>
                    </div>
                </div>

                {savedApiKey ? (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-600/50 shadow-inner">
                        <div className="flex items-center gap-3">
                           <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                           <div>
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('api_key_saved')}</p>
                             <p className="text-sm font-bold text-slate-600 dark:text-slate-300 font-mono tracking-tight">{`••••${savedApiKey.slice(-4)}`}</p>
                           </div>
                        </div>
                        <button onClick={handleRemoveApiKey} className="p-3 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl active:scale-90 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <IOSInput 
                                label={t('api_key_label')}
                                icon={KeyRound}
                                value={apiKeyInput}
                                onChange={(e: any) => setApiKeyInput(e.target.value)}
                                type={showApiKey ? 'text' : 'password'}
                                onRightIconClick={() => setShowApiKey(!showApiKey)}
                                placeholder={t('api_key_placeholder')}
                            />
                        </div>
                        <button 
                            onClick={handleSaveApiKey}
                            disabled={!apiKeyInput || isSavingApiKey}
                            className="h-[60px] px-6 bg-primary text-white rounded-2xl active:scale-95 shadow-lg shadow-primary/20 transition-all flex items-center justify-center disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            {isSavingApiKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        </button>
                    </div>
                )}
            </div>
          </section>

          {/* Data & Content Section */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-4 px-6 bg-slate-50/50 dark:bg-slate-700/20"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('data_management')}</h3></div>
            
            <section className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500 shadow-sm shrink-0">
                        <Cloud className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none mb-1">{t('cloud_sync')}</h3>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                            {isGuestMode ? t('sync_guest_msg') : session ? t('sync_active') : t('sync_disconnected')}
                        </p>
                    </div>
                </div>
                {!isGuestMode && session && (
                    <button
                        onClick={handleManualSync}
                        disabled={isManualSyncing || syncState.status === 'syncing'}
                        className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3 shadow-sky-500/20 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {isManualSyncing || syncState.status === 'syncing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />}
                        {t('sync_now')}
                    </button>
                )}
            </section>
            
             <button onClick={() => setView('GROWTH')} className="w-full text-left p-5 flex items-center group transition-colors active:bg-slate-50 dark:active:bg-slate-700/20">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform duration-300 mr-4">
                   <Activity className="w-5 h-5" />
                </div>
                <p className="font-black text-slate-800 dark:text-white text-sm">{t('manage_growth')}</p>
                <div className="ml-auto flex items-center gap-3 text-slate-400">
                   <span className="text-sm font-black">{growthData.length}</span>
                   <ChevronRight className="w-4 h-4"/>
                </div>
             </button>
             <button onClick={() => setView('REMINDERS')} className="w-full text-left p-5 flex items-center group transition-colors active:bg-slate-50 dark:active:bg-slate-700/20">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-300 mr-4">
                   <Bell className="w-5 h-5" />
                </div>
                <p className="font-black text-slate-800 dark:text-white text-sm">{t('manage_reminders')}</p>
                <div className="ml-auto flex items-center gap-3 text-slate-400">
                   <span className="text-sm font-black">{remindersList.length}</span>
                   <ChevronRight className="w-4 h-4"/>
                </div>
             </button>
             <button onClick={() => setView('STORIES')} className="w-full text-left p-5 flex items-center group transition-colors active:bg-slate-50 dark:active:bg-slate-700/20">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform duration-300 mr-4">
                   <BookOpen className="w-5 h-5" />
                </div>
                <p className="font-black text-slate-800 dark:text-white text-sm">Ebooks</p>
                <div className="ml-auto flex items-center gap-3 text-slate-400">
                   <span className="text-sm font-black">{stories.length}</span>
                   <ChevronRight className="w-4 h-4"/>
                </div>
             </button>
             <button onClick={() => setView('MEMORIES')} className="w-full text-left p-5 flex items-center group transition-colors active:bg-slate-50 dark:active:bg-slate-700/20">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 mr-4">
                   <ImageIcon className="w-5 h-5" />
                </div>
                <p className="font-black text-slate-800 dark:text-white text-sm">{t('manage_memories')}</p>
                <div className="ml-auto flex items-center gap-3 text-slate-400">
                   <span className="text-sm font-black">{memories.length}</span>
                   <ChevronRight className="w-4 h-4"/>
                </div>
             </button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
            <div className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm"><ShieldCheck className="w-4.5 h-4.5" /></div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight leading-none">{t('security_title')}</h3>
               </div>
               <div className="flex gap-2">
                  {passcode ? (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.preventDefault(); onPasscodeChange(); }} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-primary transition-all active:scale-90"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.preventDefault(); onPasscodeRemove(); }} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : <button onClick={(e) => { e.preventDefault(); onPasscodeSetup(); }} className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest active:scale-95 shadow-md shadow-indigo-500/20">{t('setup_passcode')}</button>}
               </div>
            </div>
          </section>

          {/* Account & Logout Card at the Bottom */}
          <section className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 p-5 mt-10 shadow-sm mb-12">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                   <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl shadow-inner flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-600">
                      <CircleUser className="w-6 h-6" />
                   </div>
                   <div className="text-left flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 dark:text-white text-sm tracking-tight uppercase tracking-widest">{isGuestMode ? 'Guest Mode' : 'Account Active'}</h4>
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mt-1">
                         <Mail className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate max-w-[200px]">{isGuestMode ? 'Locally Stored Data' : (session?.user?.email || 'Logged In')}</span>
                      </div>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onLogout(); }} 
                  className="w-full sm:w-auto px-6 py-4 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-500 hover:text-white text-rose-500 text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/20"
                >
                   <LogOut className="w-4 h-4" />
                   {t('logout')}
                </button>
             </div>
          </section>
        </div>
      )}

      {/* Other Views (Memories, Reminders, Stories) remain unchanged */}
      {view === 'MEMORIES' && (isLocked ? <LockedScreen /> : (
        <div className="space-y-4 animate-fade-in pb-32 px-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">{t('manage_memories')}</h2>
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner"><Filter className="w-5 h-5" /></div>
            </div>
            {memories.length > 0 ? (
                <div className="grid gap-3">
                   {memories.map(m => (
                      <div key={m.id} className="bg-white dark:bg-slate-800 p-3 rounded-[32px] border border-slate-50 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                         <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-50 dark:border-slate-700 shadow-sm flex items-center justify-center">
                            {m.imageUrls && m.imageUrls.length > 0 ? (
                                <img src={m.imageUrls[0]} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-slate-300" />
                            )}
                         </div>
                         <div className="min-w-0 text-left">
                            <h4 className="font-black text-slate-800 dark:text-white text-sm truncate leading-none mb-1.5">{m.title}</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-2.5 h-2.5"/> {m.date}</p>
                         </div>
                         <div className="flex gap-1 pr-1 ml-auto">
                            <button onClick={() => onEditMemory(m)} className="p-3 text-slate-400 hover:text-primary transition-colors active:scale-90"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => onDeleteMemory(m.id)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </div>
                   ))}
                </div>
            ) : (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4"><ImageIcon className="w-14 h-14"/><p className="text-xs font-black uppercase tracking-widest">No Memories Yet</p></div>
            )}
        </div>
      ))}
      
      {view === 'GROWTH' && (isLocked ? <LockedScreen /> : (
        <div className="space-y-6 animate-fade-in pb-32 px-1">
            <section className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 tracking-tight leading-none">
                    <Activity className="w-6 h-6 text-teal-500" /> 
                    {editingGrowth.id ? t('update_record') : t('add_record')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <IOSInput label={t('month')} icon={Calendar} type="number" value={editingGrowth.month || ''} onChange={(e: any) => setEditingGrowth({...editingGrowth, month: e.target.value ? parseInt(e.target.value) : undefined})} placeholder="e.g. 12" />
                    <IOSInput label={`${t('height_label')} (cm)`} icon={Ruler} type="number" step="0.1" value={editingGrowth.height || ''} onChange={(e: any) => setEditingGrowth({...editingGrowth, height: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="e.g. 75.5" />
                    <IOSInput label={`${t('weight_label')} (kg)`} icon={Scale} type="number" step="0.1" value={editingGrowth.weight || ''} onChange={(e: any) => setEditingGrowth({...editingGrowth, weight: e.target.value ? parseFloat(e.target.value) : undefined})} placeholder="e.g. 10.2" className="sm:col-span-2"/>
                </div>
                <div className="flex gap-3">
                  {editingGrowth.id && <button onClick={() => setEditingGrowth({})} className="w-full py-4.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-black rounded-2xl uppercase tracking-[0.2em] active:scale-95">{t('cancel_edit')}</button>}
                  <button onClick={handleSaveGrowth} className="w-full py-5 bg-teal-500 text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em] active:scale-95 shadow-teal-500/20">{editingGrowth.id ? t('update_btn') : t('add_record')}</button>
                </div>
            </section>
            <div className="space-y-2">
               {growthData.map(g => (
                   <div key={g.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm group hover:border-teal-200 transition-all">
                       <div className="text-left flex items-center gap-6">
                          <div className="text-center w-12 shrink-0">
                             <p className="font-black text-teal-500 text-xl leading-none">{g.month}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">{t('months_label')}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">{t('height_label')}: <span className="text-sm font-black text-slate-700 dark:text-slate-200">{g.height} cm</span></p>
                            <p className="text-xs font-bold text-slate-400">{t('weight_label')}: <span className="text-sm font-black text-slate-700 dark:text-slate-200">{g.weight} kg</span></p>
                          </div>
                       </div>
                       <div className="flex gap-1">
                          <button onClick={() => setEditingGrowth(g)} className="p-2.5 text-slate-400 hover:text-primary transition-colors active:scale-90"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => onDeleteGrowth?.(g.id!)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
                       </div>
                   </div>
               ))}
            </div>
        </div>
      ))}

      {view === 'REMINDERS' && (isLocked ? <LockedScreen /> : (
        <div className="space-y-6 animate-fade-in pb-32 px-1">
            <section className="bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 tracking-tight leading-none"><Bell className="w-6 h-6 text-amber-500" /> {t('add_reminder')}</h2>
                <div className="flex flex-col gap-4 mb-8">
                    <IOSInput label={t('reminder_title')} icon={User} value={newReminder.title} onChange={(e: any) => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Vaccination" />
                    <IOSInput label={t('reminder_date')} icon={Clock} type="date" value={newReminder.date} onChange={(e: any) => setNewReminder({...newReminder, date: e.target.value})} />
                </div>
                <button onClick={handleAddReminder} className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl shadow-lg uppercase tracking-[0.2em] active:scale-95 shadow-amber-500/20">{t('save_reminder')}</button>
            </section>
            <div className="space-y-2">
               {remindersList.map(r => (
                   <div key={r.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm group hover:border-amber-200 transition-all">
                       <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm leading-none mb-1">{r.title}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{r.date}</p></div>
                       <button onClick={() => onDeleteReminder?.(r.id)} className="p-2 text-rose-500 active:scale-90"><Trash2 className="w-5 h-5" /></button>
                   </div>
               ))}
            </div>
        </div>
      ))}

      {view === 'STORIES' && (isLocked ? <LockedScreen /> : (
        <div className="space-y-4 animate-fade-in pb-32 px-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Saved Ebooks</h2>
            <div className="w-10 h-10 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-500 shadow-inner"><BookOpen className="w-5 h-5" /></div>
          </div>
          {stories.length > 0 ? stories.map(s => (
            <div key={s.id} onClick={() => onStoryClick(s)} className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm text-left relative overflow-hidden cursor-pointer group active:scale-[0.98] transition-all hover:border-violet-200">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5" /></div><div className="text-left"><h4 className="font-black text-slate-800 dark:text-white text-sm truncate max-w-[180px] leading-none mb-1">{s.title}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.date}</p></div></div><button onClick={(e) => { e.stopPropagation(); onDeleteStory(s.id); }} className="p-2 text-slate-300 hover:text-rose-500 active:scale-90"><Trash2 className="w-4 h-4" /></button></div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic line-clamp-3">"{s.content}"</p>
            </div>
          )) : (
            <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4"><BookOpen className="w-14 h-14"/><p className="text-xs font-black uppercase tracking-widest">No Stories Found</p></div>
          )}
        </div>
      ))}
    </div>
  );
};
