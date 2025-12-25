import React, { useState, useRef } from 'react';
import { Baby, ArrowRight, Loader2, User, Calendar, Clock, Building2, MapPin, Globe, ShieldCheck, Camera, Image as ImageIcon, X, ChevronDown } from 'lucide-react';
import { Language, ChildProfile } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getImageSrc } from '../lib/db';

// Helper to resize images to a max dimension for profile pictures
const resizeImage = (file: File | string, maxWidth = 512, maxHeight = 512, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Image failed to load.'));

        if (typeof file === 'string') {
            img.src = file;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    img.src = e.target.result as string;
                } else {
                    reject(new Error('FileReader failed to read file.'));
                }
            };
            reader.onerror = () => reject(reader.error || new Error('FileReader unknown error'));
            reader.readAsDataURL(file);
        }
    });
};

const IOSInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, options, className = "" }: any) => (
  <div className={`bg-white dark:bg-slate-800 px-4 py-2.5 flex items-start gap-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm group transition-all focus-within:ring-4 focus-within:ring-primary/5 ${className}`}>
     <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors shrink-0 shadow-inner mt-0.5">
        <Icon className="w-4 h-4" />
     </div>
     <div className="flex-1 flex flex-col min-w-0">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1 text-left">{label}</label>
        <div className="flex items-center">
            {type === 'select' ? (
               <div className="relative flex items-center w-full">
                 <select value={value} onChange={onChange} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none h-6 text-left outline-none">
                    {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </select>
                 <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
               </div>
            ) : (
               <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 dark:text-slate-100 focus:ring-0 h-6 text-left outline-none" />
            )}
        </div>
     </div>
  </div>
);

interface CreateFirstProfileProps {
  language: Language;
  onProfileCreated: (profile: Omit<ChildProfile, 'id' | 'synced' | 'is_deleted'>) => void;
}

const CreateFirstProfile: React.FC<CreateFirstProfileProps> = ({ language, onProfileCreated }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  
  const [profile, setProfile] = useState<Omit<ChildProfile, 'id'>>({
    name: '',
    dob: new Date().toISOString().split('T')[0],
    gender: 'boy',
    profileImage: undefined,
    birthTime: '',
    hospitalName: '',
    birthLocation: '',
    country: '',
    bloodType: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof Omit<ChildProfile, 'id'>, value: string | undefined) => {
    setProfile(p => ({ ...p, [field]: value }));
  };

  const saveImageToFile = async (dataUrl: string): Promise<string> => {
      const fileName = `profile_new_${new Date().getTime()}.jpeg`;
      const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: dataUrl,
          directory: Directory.Data
      });
      return savedFile.uri;
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsProcessingImage(true);
        try {
            const resizedDataUrl = await resizeImage(file);
            const fileUri = await saveImageToFile(resizedDataUrl);
            handleInputChange('profileImage', fileUri);
        } catch (error) {
            console.error("Profile image upload failed:", error);
            alert("Profile image upload failed.");
        } finally {
            setIsProcessingImage(false);
            if(imageInputRef.current) imageInputRef.current.value = "";
        }
    }
  };

  const handleTakePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
        imageInputRef.current?.click();
        return;
    }
    setIsProcessingImage(true);
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90, allowEditing: true, resultType: CameraResultType.DataUrl
      });
      if (image.dataUrl) {
        const fileUri = await saveImageToFile(image.dataUrl);
        handleInputChange('profileImage', fileUri);
      }
    } catch (error) {
      console.error("Failed to take photo", error);
    } finally {
        setIsProcessingImage(false);
    }
  };
  
  const handleRemoveImage = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const currentImage = profile.profileImage;
      if (currentImage && currentImage.startsWith('file://')) {
          try {
              await Filesystem.deleteFile({ path: currentImage });
          } catch (err) {
              console.warn("Could not delete profile image file:", err);
          }
      }
      handleInputChange('profileImage', undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.dob) return;
    setIsSaving(true);
    
    onProfileCreated(profile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 text-center animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800/50 rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-700/50 p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
            <Baby className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            {t('welcome_onboarding_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mt-2">
            {t('welcome_onboarding_msg')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col items-center mb-4">
            <div className="relative group w-24 h-24">
               <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 flex items-center justify-center">
                  {isProcessingImage ? (<Loader2 className="w-8 h-8 text-primary animate-spin" />) : profile.profileImage ? (<img src={getImageSrc(profile.profileImage)} className="w-full h-full object-cover" alt="Profile" />) : (<Baby className="w-10 h-10 text-slate-400" />)}
               </div>
               {profile.profileImage && !isProcessingImage && (<button type="button" onClick={handleRemoveImage} className="absolute top-0 right-0 z-10 p-1.5 bg-rose-500 text-white rounded-full shadow-md transition-transform hover:scale-110"><X className="w-3 h-3" /></button>)}
            </div>
            <div className="flex gap-3 mt-4">
               {Capacitor.isNativePlatform() ? (<button type="button" onClick={handleTakePhoto} disabled={isProcessingImage} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50"><Camera className="w-3.5 h-3.5" />{t('take_photo')}</button>) : (<button type="button" onClick={() => !isProcessingImage && imageInputRef.current?.click()} disabled={isProcessingImage} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50"><ImageIcon className="w-3.5 h-3.5" />{t('upload_photo')}</button>)}
            </div>
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <IOSInput label={t('child_name_label')} icon={User} value={profile.name} onChange={(e: any) => handleInputChange('name', e.target.value)} placeholder={language === 'mm' ? 'ဥပမာ - သားသား' : 'e.g., Sonny'} required/>
          <div className="grid grid-cols-2 gap-3">
            <IOSInput label={t('child_dob')} icon={Calendar} type="date" value={profile.dob} onChange={(e: any) => handleInputChange('dob', e.target.value)} required/>
            <IOSInput label={t('birth_time')} icon={Clock} type="time" value={profile.birthTime || ''} onChange={(e: any) => handleInputChange('birthTime', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <IOSInput label={t('gender_label')} icon={Baby} type="select" options={[{ value: 'boy', label: t('boy') }, { value: 'girl', label: t('girl') }]} value={profile.gender} onChange={(e: any) => handleInputChange('gender', e.target.value)} />
             <IOSInput label={t('blood_type')} icon={ShieldCheck} type="select" options={[{ value: '', label: 'Select' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }]} value={profile.bloodType || ''} onChange={(e: any) => handleInputChange('bloodType', e.target.value)} />
          </div>
          <IOSInput label={t('hospital_name')} icon={Building2} value={profile.hospitalName || ''} placeholder={t('hospital_placeholder')} onChange={(e: any) => handleInputChange('hospitalName', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <IOSInput label={t('city_label')} icon={MapPin} value={profile.birthLocation || ''} placeholder={t('location_placeholder')} onChange={(e: any) => handleInputChange('birthLocation', e.target.value)} />
            <IOSInput label={t('country_label')} icon={Globe} value={profile.country || ''} placeholder={t('country_placeholder')} onChange={(e: any) => handleInputChange('country', e.target.value)} />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving || !profile.name.trim() || !profile.dob}
              className="w-full max-w-sm mx-auto py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:shadow-none"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {t('create_first_profile')} <ArrowRight className="w-5 h-5" /> </>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFirstProfile;
