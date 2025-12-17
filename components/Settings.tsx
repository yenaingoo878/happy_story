
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Baby, UserPlus, Camera, Loader2, Calendar, Clock, Droplet, Building2, MapPin, Globe, Save, ShieldCheck, KeyRound, Unlock, ChevronRight, Moon, Sun, ArrowLeft, Trash2, Pencil, LogOut, Check } from 'lucide-react';
import { ChildProfile, Language, Theme, GrowthData, Memory } from '../types';
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
  onEditMemory: (mem: Memory) => void;
  onDeleteMemory: (id: string) => void;
  onDeleteGrowth: (id: string) => void;
  onDeleteProfile: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  language, setLanguage, theme, toggleTheme,
  profiles, activeProfileId, onProfileChange, onRefreshData,
  passcode, isDetailsUnlocked, onUnlockRequest,
  onPasscodeSetup, onPasscodeChange, onPasscodeRemove, onHideDetails,
  growthData, memories, onEditMemory, onDeleteMemory, onDeleteGrowth, onDeleteProfile
}) => {
  const t = (key: any) => getTranslation(language, key);
  const [view, setView] = useState<'MAIN' | 'GROWTH' | 'MEMORIES'>('MAIN');
  const [editingProfile, setEditingProfile] = useState<ChildProfile>({
    id: '', name: '', dob: '', gender: 'boy', hospitalName: '', birthLocation: '', country: '', birthTime: '', bloodType: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  
  // Growth Form State
  const [newGrowth, setNewGrowth] = useState<Partial<GrowthData>>({ month: undefined, height: undefined, weight: undefined });

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
  };

  const selectProfileToEdit = (profile: ChildProfile) => {
     // Check security before viewing details
     if (passcode && !isDetailsUnlocked) {
         // We might want to switch the 'active' profile in the background, 
         // but strictly for editing/viewing details, we need unlock
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('settings_title')}</h1></div>
        
        {/* Security Lock Overlay for Details */}
        {passcode && !isDetailsUnlocked ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-slate-400"/>
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{t('private_info')}</h3>
            <p className="text-sm text-slate-500">{t('locked_msg')}</p>
            <button 
                onClick={onUnlockRequest}
                className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-rose-400 transition-colors"
            >
                {t('tap_to_unlock')}
            </button>
            
            {/* Show profile switcher even when locked, but clicking triggers unlock */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 mt-4 max-w-full justify-center">
                {profiles.map(p => (
                    <button key={p.id} onClick={() => selectProfileToEdit(p)} className={`flex flex-col items-center flex-shrink-0 transition-all opacity-60`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 border-2 overflow-hidden border-slate-200`}>
                            {p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover"/> : <Baby className="w-6 h-6 text-slate-300"/>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
        ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            {/* Hide button if unlocked */}
            {passcode && isDetailsUnlocked && (
                <button onClick={onHideDetails} className="absolute top-4 right-4 text-xs text-slate-400 hover:text-primary flex items-center gap-1">
                    <Lock className="w-3 h-3"/> {t('hide_details')}
                </button>
            )}

            <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-4">
            {profiles.map(p => (
                <button key={p.id} onClick={() => selectProfileToEdit(p)} className={`flex flex-col items-center flex-shrink-0 transition-all ${editingProfile.id === p.id ? 'opacity-100 scale-105' : 'opacity-60'}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-1 border-2 overflow-hidden ${editingProfile.id === p.id ? 'border-primary' : 'border-slate-200'}`}>
                        {p.profileImage ? <img src={p.profileImage} className="w-full h-full object-cover"/> : <Baby className="w-8 h-8 text-slate-300"/>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{p.name || 'New'}</span>
                </button>
            ))}
            <button onClick={createNewProfile} disabled={isSavingProfile} className="flex flex-col items-center flex-shrink-0 opacity-60 hover:opacity-100 disabled:opacity-30">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-1"><UserPlus className="w-6 h-6 text-slate-400"/></div>
                <span className="text-[10px] font-bold text-slate-500">Add</span>
            </button>
            </div>
            
            <div className="space-y-4">
                <div className="flex justify-center mb-2 relative">
                    <div className={`relative group ${!isUploading && !isSavingProfile ? 'cursor-pointer' : 'cursor-wait opacity-80'}`} onClick={triggerProfileImageInput}>
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-600">
                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary"/> : 
                            editingProfile.profileImage ? <img src={editingProfile.profileImage} className="w-full h-full object-cover"/> : <Baby className="w-10 h-10 text-slate-300"/>}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-primary p-2 rounded-full text-white shadow-sm"><Camera className="w-3 h-3"/></div>
                    <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={isUploading || isSavingProfile} />
                    </div>
                    
                    {/* Delete Profile Button (only if ID exists) */}
                    {editingProfile.id && !isSavingProfile && (
                        <button onClick={() => onDeleteProfile(editingProfile.id!)} className="absolute top-0 right-0 p-2 text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-full">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('child_name_label')}</label>
                    <div className="relative mt-1">
                    <Baby className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} disabled={isSavingProfile} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 disabled:opacity-50" placeholder="e.g. Baby" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('child_dob')}</label>
                        <div className="relative mt-1">
                        <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input type="date" value={editingProfile.dob} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} disabled={isSavingProfile} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 text-sm disabled:opacity-50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('birth_time')}</label>
                        <div className="relative mt-1">
                        <Clock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input type="time" value={editingProfile.birthTime || ''} onChange={e => setEditingProfile({...editingProfile, birthTime: e.target.value})} disabled={isSavingProfile} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 text-sm disabled:opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('gender_label')}</label>
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 mt-1 h-[46px]">
                            <button 
                            onClick={() => setEditingProfile({...editingProfile, gender: 'boy'})}
                            disabled={isSavingProfile}
                            className={`flex-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${editingProfile.gender === 'boy' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-500' : 'text-slate-400'}`}
                            >
                            {t('boy')}
                            </button>
                            <button 
                            onClick={() => setEditingProfile({...editingProfile, gender: 'girl'})}
                            disabled={isSavingProfile}
                            className={`flex-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${editingProfile.gender === 'girl' ? 'bg-white dark:bg-slate-600 shadow-sm text-pink-500' : 'text-slate-400'}`}
                            >
                            {t('girl')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('blood_type')}</label>
                        <div className="relative mt-1">
                        <Droplet className="absolute left-3 top-3.5 w-4 h-4 text-rose-400" />
                        <select 
                            value={editingProfile.bloodType || ''} 
                            onChange={e => setEditingProfile({...editingProfile, bloodType: e.target.value})}
                            disabled={isSavingProfile}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 text-sm appearance-none disabled:opacity-50"
                        >
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
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('hospital_name')}</label>
                    <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input type="text" value={editingProfile.hospitalName || ''} onChange={e => setEditingProfile({...editingProfile, hospitalName: e.target.value})} disabled={isSavingProfile} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 disabled:opacity-50" placeholder={t('hospital_placeholder')} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('city_label')}</label>
                        <div className="relative mt-1">
                        <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input type="text" value={editingProfile.birthLocation || ''} onChange={e => setEditingProfile({...editingProfile, birthLocation: e.target.value})} disabled={isSavingProfile} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 text-sm disabled:opacity-50" placeholder={t('location_placeholder')} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('country_label')}</label>
                        <div className="relative mt-1">
                        <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input type="text" value={editingProfile.country || ''} onChange={e => setEditingProfile({...editingProfile, country: e.target.value})} disabled={isSavingProfile} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-700 dark:text-slate-100 text-sm disabled:opacity-50" placeholder={t('country_placeholder')} />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSaveProfile} 
                    disabled={isSavingProfile}
                    className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mt-4 transition-all active:scale-95 ${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary hover:bg-rose-400'} ${isSavingProfile ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                    {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin"/> : saveSuccess ? <Check className="w-5 h-5"/> : <Save className="w-5 h-5"/>}
                    {isSavingProfile ? t('saving') : saveSuccess ? t('profile_saved') : t('save_changes')}
                </button>
            </div>
        </div>
        )}

        {/* Security Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 font-bold text-xs uppercase text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400"/>
            {t('security_title')}
        </div>
        <div className="p-2">
            {!passcode ? (
                <button onClick={onPasscodeSetup} className="w-full p-3 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500"><KeyRound className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('setup_passcode')}</span>
                    </div>
                    <ChevronRight className="text-slate-300"/>
                </button>
            ) : (
                <>
                <button onClick={onPasscodeChange} className="w-full p-3 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left mb-1">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500"><KeyRound className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('change_passcode')}</span>
                    </div>
                    <ChevronRight className="text-slate-300"/>
                </button>
                <button onClick={onPasscodeRemove} className="w-full p-3 flex justify-between hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500"><Unlock className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('remove_passcode')}</span>
                    </div>
                    <ChevronRight className="text-slate-300"/>
                </button>
                </>
            )}
        </div>
        </div>

        {/* App Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 font-bold text-xs uppercase text-slate-500">{t('app_settings')}</div>
        <div className="p-4 space-y-6">
            {/* Language Row */}
            <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-slate-200 font-bold">{t('language')}</span>
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                        <button 
                        onClick={() => setLanguage('mm')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${language === 'mm' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}
                        >
                        မြန်မာ
                        </button>
                        <button 
                        onClick={() => setLanguage('en')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400'}`}
                        >
                        English
                        </button>
                </div>
            </div>

            {/* Theme Row */}
            <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-slate-200 font-bold">{t('theme')}</span>
                <button 
                    onClick={toggleTheme}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                    <div className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                        {theme === 'dark' ? <Moon className="w-3 h-3 text-indigo-500"/> : <Sun className="w-3 h-3 text-amber-500"/>}
                    </div>
                </button>
            </div>
        </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 font-bold text-xs uppercase text-slate-500">{t('data_management')}</div>
        <div className="p-2">
            <button onClick={() => setView('GROWTH')} className="w-full p-3 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl dark:text-slate-200">{t('manage_growth')}<ChevronRight/></button>
            <button onClick={() => setView('MEMORIES')} className="w-full p-3 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl dark:text-slate-200">{t('manage_memories')}<ChevronRight/></button>
        </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mt-6">
        <button onClick={() => supabase.auth.signOut()} className="w-full p-4 flex items-center justify-center text-rose-500 font-bold gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <LogOut className="w-5 h-5"/>
            {t('logout')}
        </button>
        </div>
    </div>
  );
};
