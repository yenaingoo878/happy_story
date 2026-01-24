
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Save, Tag, X, Image as ImageIcon, CheckCircle2, Camera, Text, Calendar, Plus } from 'lucide-react';
import { Memory, Language } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { DataService, getImageSrc, uploadFileToCloud } from '../lib/db';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Helper function to resize images to a max dimension while maintaining aspect ratio
const resizeImage = (file: File | string, maxWidth = 1024, maxHeight = 1024, quality = 0.8): Promise<string> => {
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
      
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      reject(new Error('Image failed to load.'));
    };

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


interface AddMemoryProps {
  language: Language;
  activeProfileId: string;
  editMemory: Memory | null;
  onSaveComplete: () => void;
  onCancel: () => void;
  session?: any;
}

// Compact FormField component
const FormField = ({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children?: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
    <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </label>
    {children}
  </div>
);

const AddMemory: React.FC<AddMemoryProps> = ({ 
  language, 
  activeProfileId, 
  editMemory, 
  onSaveComplete,
  onCancel,
  session
}) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const getTodayLocal = () => new Date().toISOString().split('T')[0];

  const [formState, setFormState] = useState<{title: string; desc: string; date: string; imageUrls: string[]; tags: string[]}>({ 
    title: '', desc: '', date: getTodayLocal(), imageUrls: [], tags: []
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editMemory) {
        const initialUrls = Array.isArray(editMemory.imageUrls) && editMemory.imageUrls.length > 0 
            ? editMemory.imageUrls 
            : (editMemory.imageUrl ? [editMemory.imageUrl] : []);

        setFormState({
            title: editMemory.title,
            desc: editMemory.description,
            date: editMemory.date,
            imageUrls: initialUrls,
            tags: editMemory.tags || []
        });
    } else {
        setFormState({ title: '', desc: '', date: getTodayLocal(), imageUrls: [], tags: [] });
    }
  }, [editMemory]);

  const saveImageToFile = async (dataUrl: string): Promise<string> => {
      if (!Capacitor.isNativePlatform()) {
          return dataUrl;
      }

      try {
          const fileName = `moments_${new Date().getTime()}_${Math.random().toString(36).substring(7)}.jpeg`;
          const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: dataUrl,
              directory: Directory.Data
          });
          return savedFile.uri;
      } catch (err) {
          console.error("Failed to save image to filesystem, falling back to data URL", err);
          return dataUrl;
      }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true); 
      try {
        const newDataUrls = await Promise.all(Array.from(files).map(async (file) => {
            return await resizeImage(file as File);
        }));
        setFormState(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newDataUrls] }));
      } catch (error) { 
        console.error("Image processing failed", error); 
        alert("Failed to process images."); 
      }
      finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleTakePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
        fileInputRef.current?.click();
        return;
    }
    setIsProcessing(true);
    try {
      const permissions = await CapacitorCamera.checkPermissions();
      if (permissions.camera !== 'granted') {
        const newPermissions = await CapacitorCamera.requestPermissions();
        if (newPermissions.camera !== 'granted') {
          alert(language === 'mm' ? "Camera သုံးဖို့ Permission ပေးရန် လိုအပ်ပါတယ်" : "Camera permission is required to take photos.");
          return;
        }
      }
      
      const image = await CapacitorCamera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.DataUrl });
      if (image.dataUrl) {
        const resizedDataUrl = await resizeImage(image.dataUrl as string);
        setFormState(prev => ({ ...prev, imageUrls: [...prev.imageUrls, resizedDataUrl] }));
      }
    } catch (error) {
      console.error("Failed to take photo", error);
      let isCancellation = false;
      if (error instanceof Error) {
        isCancellation = error.message.toLowerCase().includes('cancelled');
      } else if (typeof error === 'string') {
        isCancellation = error.toLowerCase().includes('cancelled');
      }
      if (!isCancellation) {
        alert(language === 'mm' ? "ဓာတ်ပုံရိုက်မရပါ။" : "Failed to take photo.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !formState.tags.includes(val)) setFormState(prev => ({ ...prev, tags: [...prev.tags, val] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => setFormState(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title || formState.imageUrls.length === 0 || !activeProfileId) return;

    setIsSaving(true);
    const memoryId = editMemory ? editMemory.id : crypto.randomUUID();
    
    try {
        const finalImageUrls = await Promise.all(formState.imageUrls.map(async (url, index) => {
            if (session?.user?.id && navigator.onLine && url.startsWith('data:')) {
                const blob = await (await fetch(url)).blob();
                try {
                  return await uploadFileToCloud(blob, session.user.id, activeProfileId, 'memories', memoryId, index);
                } catch (e) {
                  console.warn("Cloud upload failed during save, falling back to local storage", e);
                  return await saveImageToFile(url);
                }
            }
            
            if (url.startsWith('data:')) {
                return await saveImageToFile(url);
            }
            return url;
        }));

        const memory: Memory = {
            id: memoryId, 
            childId: activeProfileId, 
            title: formState.title, 
            description: formState.desc, 
            date: formState.date, 
            imageUrls: finalImageUrls,
            imageUrl: finalImageUrls[0],
            tags: formState.tags,
            synced: 0 
        };
        await DataService.addMemory(memory);
        onSaveComplete();
    } catch (error) { 
        console.error("Save failed", error); 
        alert("Failed to save memory.");
    } finally { 
        setIsSaving(false); 
    }
  };

  const removeImage = async (indexToRemove: number) => {
    const urlToRemove = formState.imageUrls[indexToRemove];
    if (urlToRemove.startsWith('file://')) {
        try {
            await Filesystem.deleteFile({ path: urlToRemove });
        } catch (e) {}
    }
    setFormState(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove)}));
  };

  return (
    <div className="animate-fade-in pb-12 px-1 sm:px-2">
        <div className="flex justify-between items-center mb-6 pt-2 px-1">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            <button onClick={onCancel} disabled={isSaving} className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-[0.2em]">{t('cancel_btn')}</button>
        </div>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Image Previews (More Compact) */}
            <div className="space-y-3">
               <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
                  {formState.imageUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square group">
                          <img src={getImageSrc(url)} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700" alt="Preview"/>
                          <button type="button" onClick={() => removeImage(index)} className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-md z-10">
                              <X className="w-3 h-3"/>
                          </button>
                      </div>
                  ))}
                  <div className="col-span-1">
                     <button 
                        type="button"
                        onClick={Capacitor.isNativePlatform() ? handleTakePhoto : () => fileInputRef.current?.click()}
                        disabled={isProcessing || isSaving}
                        className="w-full aspect-square flex flex-col items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/50 transition-all active:scale-95 disabled:opacity-50"
                     >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Plus className="w-5 h-5"/>}
                        <span className="text-[8px] font-black uppercase tracking-widest">{t('choose_photo')}</span>
                     </button>
                  </div>
               </div>
               <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Right Column: Compact Form Fields */}
            <div className="space-y-3">
              <FormField label={t('form_title')} icon={Text}>
                <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} disabled={isSaving} className="w-full bg-transparent outline-none text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300"/>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label={t('date_label')} icon={Calendar}>
                    <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} disabled={isSaving} className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 dark:text-slate-100"/>
                  </FormField>
                  
                  <FormField label="Tags" icon={Tag}>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {formState.tags.map(tag => (
                            <span key={tag} className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center border border-primary/20">
                                #{tag}
                                <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 hover:text-rose-500 transition-colors"><X className="w-2.5 h-2.5"/></button>
                            </span>
                        ))}
                    </div>
                    <input 
                        type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag}
                        placeholder="Tag + Enter"
                        className="w-full bg-transparent outline-none text-[11px] font-bold text-slate-500 dark:text-slate-300 placeholder:text-slate-300"
                        disabled={isSaving}
                    />
                  </FormField>
              </div>

              <FormField label={t('form_desc')} icon={Text}>
                <textarea 
                    value={formState.desc} 
                    onChange={e => setFormState({...formState, desc: e.target.value})} 
                    placeholder={t('form_desc_placeholder')} 
                    disabled={isSaving} 
                    className="w-full bg-transparent outline-none h-32 sm:h-40 resize-none text-sm font-medium text-slate-600 dark:text-slate-200 placeholder:text-slate-300 leading-relaxed"
                />
              </FormField>
            </div>
          </div>
          
          <div className="mt-8 pb-20 px-2">
            <button 
                type="submit"
                disabled={isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0} 
                className={`w-full py-4 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 ${isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0 ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-primary shadow-primary/20'}`}
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                {isSaving ? t('saving') : (editMemory ? t('update_btn') : t('record_btn'))}
            </button>
          </div>
        </form>
    </div>
  );
};

export default AddMemory;
