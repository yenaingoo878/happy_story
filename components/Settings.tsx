
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Camera, Loader2, Save, ShieldCheck, KeyRound, Unlock, ChevronRight, Moon, Sun, ArrowLeft, Trash2, Pencil, LogOut, Check, ChevronDown, ChevronUp, Globe, CalendarHeart, Plus, Repeat } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory, EventReminder } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService } from '../lib/db';
import { supabase } from '../lib/supabaseClient';

interface SettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  profiles: ChildProfile[];
  activeProfileId: string;
  onProfileChange: (id: string) => void; // When user just selects to switch view
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
  events: EventReminder[];
  onEditMemory: (mem: Memory) => void;
  onDeleteMemory: (id: string) => void;
  onDeleteGrowth: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onDeleteEvent: (id: string) => void;

  // Auth
  isGuestMode?: boolean;
  onLogout: () => void; // Unified logout handler
  
  // Navigation
  initialView?: 'MAIN' | 'GROWTH' | 'MEMORIES' | 'EVENTS';
}

export const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme,
  profiles, activeProfileId, onProfileChange, onRefreshData,
  passcode, isDetailsUnlocked, onUnlockRequest,
  onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails,
  growthData, memories, events, onEditMemory, onDeleteMemory, onDeleteGrowth, onDeleteProfile, onDeleteEvent,
  isGuestMode, onLogout, initialView
}) => {
  const t = (key: any) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES' | 'EVENTS'>(initialView || 'MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({
    id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Toggles for UI compactness
  const [showEditForm, setShowEditForm] = useState(false);

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  
  // Growth Form State
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });

  // Event Form State
  const [newEvent, setNewEvent] = useState<{title: string, date: string, isRecurring: boolean}>({ title: '', date: '', isRecurring: false });
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  // Load active profile into form when selected or unlocked
  useEffect(() => {
     if (activeProfileId) {
         const p = profiles.find(pr => pr.id === activeProfileId);
         if (p) setEditingProfile(p);
     }
  }, [activeProfileId, profiles]);

  // Reset success message
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
        years--;
        months += 12;
    }
    
    if (years === 0) {
        return `${months} ${t('age_months')}`;
    }
    
    return `${years} ${t('age_years')}, ${months} ${t('age_months')}`;
  };

  const triggerProfileImageInput = () => {
    if(!isUploading && !isSavingProfile) profileImageInputRef.current?.click();
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const targetId = editingProfile.id || 'temp_' + Date.now();
        setIsUploading(true);
        try {
            const url = await DataService.uploadImage(file, targetId, 'profile');
            setEditingProfile(prev => ({ ...prev, id: prev.id || targetId, profileImage: url }));
        } catch (error) {
            console.error("Profile image upload failed", error);
            alert("Failed to upload image.");
        } finally {
            setIsUploading(false);
        }
    }
  };

  const handleSaveProfile = async () => {
    if (!editingProfile.name.trim()) return;
    
    setIsSavingProfile(true);
    try {
        const isNew = !editingProfile.id;
        const profileToSave = {
        ...editingProfile,
        id: editingProfile.id || crypto.randomUUID()
        };
        
        await DataService.saveProfile(profileToSave);
        await onRefreshData();
        
        if (isNew) {
            onProfileChange(profileToSave.id || '');
        }
        setSaveSuccess(true);
        
        // Auto-lock if passcode is set
        if (passcode) {
            setTimeout(() => {
                onHideDetails();
                setShowEditForm(false); // Close form
            }, 1000);
        } else {
            // Close form after save if no passcode
            setTimeout(() => setShowEditForm(false), 1000);
        }

    } catch (error) {
        console.error("Failed to save profile", error);
        alert("Failed to save profile.");
    } finally {
        setIsSavingProfile(false);
    }
  };

  const createNewProfile = () => {
      // Check security before creating new
      if (passcode && !isDetailsUnlocked) {
          onUnlockRequest();
          return;
      }
      setEditingProfile({
         id: '', name: '', dob: '', gender: 'boy', 
         hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: ''
      });
      setShowEditForm(true); // Open the form
  };

  const selectProfileToEdit = (profile: ChildProfile) => {
     // Check security before viewing details
     if (passcode && !isDetailsUnlocked) {
         onProfileChange(profile.id || '');
         onUnlockRequest();
     } else {
         onProfileChange(profile.id || '');
         setEditingProfile(profile);
     }
  };

  const handleAddGrowthRecord = async () => {
    if (newGrowth.month !== undefined && newGrowth.height && newGrowth.weight && activeProfileId) {
      setIsSavingGrowth(true);
      try {
          let updatedData: GrowthData = {
              id: crypto.randomUUID(),
              childId: activeProfileId,
              month: Number(newGrowth.month),
              height: Number(newGrowth.height),
              weight: Number(newGrowth.weight),
              synced: 0
          };

          await DataService.saveGrowth(updatedData);
          await onRefreshData(); // Reload data
          setNewGrowth({ month: undefined, height: undefined, weight: undefined });
      } catch (error) {
          alert("Failed to save growth record");
      } finally {
          setIsSavingGrowth(false);
      }
    }
  };

  const handleAddEvent = async () => {
      if(!newEvent.title || !newEvent.date || !activeProfileId) return;
      setIsSavingEvent(true);
      try {
          const event: EventReminder = {
              id: crypto.randomUUID(),
              childId: activeProfileId,
              title: newEvent.title,
              date: newEvent.date,
              isRecurring: newEvent.isRecurring,
              synced: 0
          };

          await DataService.addEvent(event);
          await onRefreshData();
          setNewEvent({title: '', date: '', isRecurring: false});
      } catch (error) {
          console.error("Failed to save event", error);
          alert("Failed to save event");
      } finally {
          setIsSavingEvent(false);
      }
  };

  const handleAuthAction = () => {
      if (onLogout) onLogout();
  };

  const currentProfile = profiles.find(p => p.id === activeProfileId);
  
  const formatDateDisplay = (isoDate: string | undefined) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Sub-views are kept similar but can be tightened if needed. 
  if (view === 'GROWTH') {
      return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('manage_growth')}</h2>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-4">
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <input type="number" placeholder={t('month')} value={newGrowth.month || ''} onChange={e => setNewGrowth({...newGrowth, month: Number(e.target.value)})} disabled={isSavingGrowth} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50"/>
                    <input type="number" placeholder="cm" value={newGrowth.height || ''} onChange={e => setNewGrowth({...newGrowth, height: Number(e.target.value)})} disabled={isSavingGrowth} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50"/>
                    <input type="number" placeholder="kg" value={newGrowth.weight || ''} onChange={e => setNewGrowth({...newGrowth, weight: Number(e.target.value)})} disabled={isSavingGrowth} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50"/>
                </div>
                <button 
                    onClick={handleAddGrowthRecord} 
                    disabled={isSavingGrowth || !newGrowth.month}
                    className="w-full py-2 bg-teal-500 text-white rounded-lg font-bold flex items-center justify-center disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                    {isSavingGrowth ? <Loader2 className="w-4 h-4 animate-spin"/> : t('add_record')}
                </button>
            </div>
            <div className="space-y-2">
                {growthData.map((d, i) => (
                    <div key={i} className="flex justify-between p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 items-center">
                        <span className="font-bold text-teal-600 dark:text-teal-400">Month {d.month}</span>
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
                    <div key={m.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="truncate w-32 font-bold text-slate-700 dark:text-slate-200">{m.title}</span>
                        <div className="flex gap-2">
                            <button onClick={() => onEditMemory(m)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-300"><Pencil className="w-4 h-4"/></button>
                            <button onClick={() => onDeleteMemory(m.id)} className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  if (view === 'EVENTS') {
      return (
          <div className="max-w-2xl mx-auto">
              <button onClick={() => setView('MAIN')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4"/> {t('back')}</button>
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('manage_events')}</h2>
              
              {/* Add Event Form */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-4 border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">{t('new_event_title')}</h3>
                  <div className="space-y-3">
                      <input 
                          type="text" 
                          placeholder={t('event_name')}
                          value={newEvent.title} 
                          onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                          className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none"
                      />
                      <input 
                          type="date" 
                          value={newEvent.date} 
                          onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                          className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none"
                      />
                      <div className="flex items-center gap-2">
                          <input 
                             type="checkbox" 
                             id="recurring_manage"
                             checked={newEvent.isRecurring} 
                             onChange={e => setNewEvent({...newEvent, isRecurring: e.target.checked})}
                             className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="recurring_manage" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('recurring')}</label>
                      </div>
                      <button 
                          onClick={handleAddEvent}
                          disabled={isSavingEvent || !newEvent.title || !newEvent.date}
                          className="w-full py-2 bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isSavingEvent ? <Loader2 className="w-4 h-4 animate-spin"/> : t('save_event')}
                      </button>
                  </div>
              </div>

              {/* Event List */}
              <div className="space-y-2">
                  {events.map(e => (
                      <div key={e.id} className="flex justify-between p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 items-center">
                          <div className="overflow-hidden">
                              <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{e.title}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <span>{formatDateDisplay(e.date)}</span>
                                  {e.isRecurring && <span className="flex items-center gap-0.5"><Repeat className="w-3 h-3"/> Yearly</span>}
                              </div>
                          </div>
                          <button onClick={() => onDeleteEvent(e.id)} className="text-rose-500 p-2"><Trash2 className="w-4 h-4"/></button>
                      </div>
                  ))}
                  {events.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-4">{t('no_events')}</p>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
        <div className="mb-2"><h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings_title')}</h1></div>
        
        {/* Active Profile Hero Card - Compact */}
        {currentProfile && (
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
                {/* Hide button */}
                 {passcode && isDetailsUnlocked && (
                    <button onClick={onHideDetails} className="absolute top-4 right-4 text-xs text-slate-400 hover:text-primary flex items-center gap-1 z-10 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full transition-colors">
                        <Lock className="w-3 h-3"/> {t('hide_details')}
                    </button>
                )}
                {/* Lock indicator */}
                 {passcode && !isDetailsUnlocked && (
                    <div className="absolute top-4 right-4 text-xs text-slate-400 flex items-center gap-1 z-10 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full transition-colors">
                        <Lock className="w-3 h-3"/>
                    </div>
                )}
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-full border-[3px] border-white dark:border-slate-700 shadow-md overflow-hidden shrink-0 bg-white dark:bg-slate-700">
                         {currentProfile.profileImage ? (
                            <img src={currentProfile.profileImage} className="w-full h-full object-cover"/>
                         ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-600">
                                <Baby className="w-6 h-6 text-slate-300 dark:text-slate-400"/>
                            </div>
                         )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('currently_active')}</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight mb-0.5">{currentProfile.name}</h2>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>{calculateAge(currentProfile.dob)}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className={currentProfile.gender === 'boy' ? 'text-blue-400' : 'text-pink-400'}>
                                {currentProfile.gender === 'boy' ? t('boy') : t('girl')}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Preferences (Language & Theme) - Moved Outside Passcode Protection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden p-3 space-y-3">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Globe className="w-3.5 h-3.5"/></div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('language')}</span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded-lg">
                        <button onClick={() => setLanguage('mm')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>MM</button>
                        <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}>EN</button>
                </div>
            </div>

            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><Moon className="w-3.5 h-3.5"/></div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('theme')}</span>
                </div>
                <button 
                    onClick={toggleTheme}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                    <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                </button>
            </div>
        </div>

        {/* Security Lock Overlay */}
        {passcode && !isDetailsUnlocked ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-slate-400"/>
            </div>
            <h3 className="font-bold text-md text-slate-800 dark:text-slate-100">{t('private_info')}</h3>
            <button 
                onClick={onUnlockRequest}
                className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-md hover:bg-rose-400 transition-colors"
            >
                {t('tap_to_unlock')}
            </button>
        </div>
        ) : (
        <div className="animate-fade-in space-y-4">
            {/* Collapsible Edit Profile Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                 <button 
                    onClick={() => setShowEditForm(!showEditForm)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                 >
                     <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-slate-500"/>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('edit_profile')} / {t('add_new_profile')}</span>
                     </div>
                     {showEditForm ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                 </button>

                 {showEditForm && (
                     <div className="p-5 border-t border-slate-100 dark:border-slate-700 animate-slide-up">
                        {/* Profile Switcher inside Edit Mode */}
                        <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide flex gap-3">
                            <button onClick={createNewProfile} disabled={isSavingProfile} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-primary text-primary text-xs font-bold hover:bg-primary/5">
                                <UserPlus className="w-3 h-3"/> {t('add_new_profile')}
                            </button>
                            {profiles.map(p => (
                                <button 
                                    key={p.id} 
                                    onClick={() => selectProfileToEdit(p)} 
                                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                        editingProfile.id === p.id 
                                        ? 'bg-primary/10 border-primary text-primary' 
                                        : 'border-slate-200 dark:border-slate-600 text-slate-500'
                                    }`}
                                >
                                    <span className="text-xs font-bold">{p.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* The Form */}
                        <div className="space-y-4">
                            <div className="flex justify-center mb-4 relative">
                                <div className={`relative group ${!isUploading && !isSavingProfile ? 'cursor-pointer' : 'cursor-wait opacity-80'}`} onClick={triggerProfileImageInput}>
                                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-600">
                                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary"/> : 
                                            editingProfile.profileImage ? <img src={editingProfile.profileImage} className="w-full h-full object-cover"/> : <Camera className="w-6 h-6 text-slate-300"/>}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-slate-800 text-white p-1.5 rounded-full shadow-md"><Camera className="w-3 h-3"/></div>
                                    <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={isUploading || isSavingProfile} />
                                </div>
                                {editingProfile.id && !isSavingProfile && (
                                    <button onClick={() => onDeleteProfile(editingProfile.id!)} className="absolute top-0 right-0 p-1.5 text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-full" title={t('delete')}>
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Row 1: Name */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('child_name_label')}</label>
                                <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100" />
                            </div>

                            {/* Row 2: DOB & Birth Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('child_dob')}</label>
                                    <input type="date" value={editingProfile.dob} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('birth_time')}</label>
                                    <input type="time" value={editingProfile.birthTime || ''} onChange={e => setEditingProfile({...editingProfile, birthTime: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100" />
                                </div>
                            </div>
                            
                            {/* Row 3: Gender & Blood Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('gender_label')}</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 h-[38px]">
                                        <button onClick={() => setEditingProfile({...editingProfile, gender: 'boy'})} disabled={isSavingProfile} className={`flex-1 rounded-lg text-xs font-bold transition-all ${editingProfile.gender === 'boy' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-500' : 'text-slate-400'}`}>{t('boy')}</button>
                                        <button onClick={() => setEditingProfile({...editingProfile, gender: 'girl'})} disabled={isSavingProfile} className={`flex-1 rounded-lg text-xs font-bold transition-all ${editingProfile.gender === 'girl' ? 'bg-white dark:bg-slate-600 shadow-sm text-pink-500' : 'text-slate-400'}`}>{t('girl')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('blood_type')}</label>
                                    <select value={editingProfile.bloodType || ''} onChange={e => setEditingProfile({...editingProfile, bloodType: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100">
                                        <option value="">-</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 4: Hospital */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('hospital_name')}</label>
                                <input type="text" value={editingProfile.hospitalName || ''} onChange={e => setEditingProfile({...editingProfile, hospitalName: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100" placeholder={t('hospital_placeholder')} />
                            </div>

                            {/* Row 5: City & Country */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('city_label')}</label>
                                    <input type="text" value={editingProfile.birthLocation || ''} onChange={e => setEditingProfile({...editingProfile, birthLocation: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100" placeholder={t('location_placeholder')} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('country_label')}</label>
                                    <input type="text" value={editingProfile.country || ''} onChange={e => setEditingProfile({...editingProfile, country: e.target.value})} disabled={isSavingProfile} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none focus:border-primary text-sm dark:text-slate-100" placeholder={t('country_placeholder')} />
                                </div>
                            </div>

                            <button onClick={handleSaveProfile} disabled={isSavingProfile} className={`w-full py-3 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 mt-2 transition-all ${saveSuccess ? 'bg-emerald-500' : 'bg-primary hover:bg-rose-400'} ${isSavingProfile ? 'cursor-not-allowed opacity-80' : ''}`}>
                                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin"/> : saveSuccess ? <Check className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
                                {isSavingProfile ? t('saving') : saveSuccess ? t('profile_saved') : t('save_changes')}
                            </button>
                        </div>
                     </div>
                 )}
            </div>

            {/* General Settings List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                {/* Security */}
                <div className="p-3">
                     {!passcode ? (
                        <button onClick={onPasscodeSetup} className="w-full p-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-left items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><KeyRound className="w-3.5 h-3.5"/></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('setup_passcode')}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300"/>
                        </button>
                    ) : (
                        <>
                        <button onClick={onPasscodeChange} className="w-full p-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-left items-center mb-1">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500"><KeyRound className="w-3.5 h-3.5"/></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('change_passcode')}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300"/>
                        </button>
                        <button onClick={onPasscodeRemove} className="w-full p-2 flex justify-between hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg text-left items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500"><Unlock className="w-3.5 h-3.5"/></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('remove_passcode')}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300"/>
                        </button>
                        </>
                    )}
                </div>

                {/* Data Management */}
                 <div className="p-3">
                    <button onClick={() => setView('EVENTS')} className="w-full p-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg items-center text-sm font-bold text-slate-700 dark:text-slate-200">
                        {t('manage_events')}<ChevronRight className="w-4 h-4 text-slate-300"/>
                    </button>
                    <button onClick={() => setView('GROWTH')} className="w-full p-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg items-center text-sm font-bold text-slate-700 dark:text-slate-200">
                        {t('manage_growth')}<ChevronRight className="w-4 h-4 text-slate-300"/>
                    </button>
                    <button onClick={() => setView('MEMORIES')} className="w-full p-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg items-center text-sm font-bold text-slate-700 dark:text-slate-200">
                        {t('manage_memories')}<ChevronRight className="w-4 h-4 text-slate-300"/>
                    </button>
                </div>
            </div>

            {/* Logout */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <button onClick={handleAuthAction} className={`w-full p-3 flex items-center justify-center font-bold gap-2 text-sm transition-colors ${isGuestMode ? 'text-teal-600 hover:bg-teal-50' : 'text-rose-500 hover:bg-rose-50'}`}>
                    <LogOut className="w-4 h-4"/>
                    {isGuestMode ? "Sign In to Sync" : t('logout')}
                </button>
            </div>
        </div>
        )}
    </div>
  );
};
