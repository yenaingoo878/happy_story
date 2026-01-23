import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Save, Tag, X, Image as ImageIcon, CheckCircle2, Camera, Text, Calendar, Plus } from 'lucide-react';
import { Memory, Language } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { DataService, getImageSrc } from '../lib/db';
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
}
const FormField = ({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children?: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </label>
    {children}
  </div>
);

export const AddMemory: React.FC<AddMemoryProps> = ({ 
  language, 
  activeProfileId, 
  editMemory, 
  onSaveComplete,
  onCancel 
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
        setFormState({
            title: editMemory.title,
            desc: editMemory.description,
            date: editMemory.date,
            imageUrls: editMemory.imageUrls || [],
            tags: editMemory.tags || []
        });
    } else {
        setFormState({ title: '', desc: '', date: getTodayLocal(), imageUrls: [], tags: [] });
    }
  }, [editMemory]);

  const saveImageToFile = async (dataUrl: string): Promise<string> => {
      const fileName = `${new Date().getTime()}.jpeg`;
      const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: dataUrl,
          directory: Directory.Data
      });
      return savedFile.uri;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true); 
      try {
        const newDataUrls = await Promise.all(Array.from(files).map(async (file) => {
            return await resizeImage(file as File);
        }));
        // Store dataUrls directly for previewing. 
        // We will only call saveImageToFile when the user clicks 'Save'.
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
    try {
        // Convert any dataUrls (previews) to actual files before saving to DB
        const finalImageUrls = await Promise.all(formState.imageUrls.map(async (url) => {
            if (url.startsWith('data:')) {
                return await saveImageToFile(url);
            }
            return url;
        }));

        const memory: Memory = {
            id: editMemory ? editMemory.id : crypto.randomUUID(), 
            childId: activeProfileId, 
            title: formState.title, 
            description: formState.desc, 
            date: formState.date, 
            imageUrls: finalImageUrls, 
            tags: formState.tags
        };
        await DataService.addMemory(memory);
        onSaveComplete();
    } catch (error) { 
        console.error("Save failed", error); 
        alert("Failed to save memory locally.");
    } finally { 
        setIsSaving(false); 
    }
  };

  const removeImage = async (indexToRemove: number) => {
    const urlToRemove = formState.imageUrls[indexToRemove];
    // Only attempt cleanup if it's a permanent file. If it's a dataUrl, we don't need to delete anything.
    if (urlToRemove.startsWith('file://')) {
        try {
            await Filesystem.deleteFile({ path: urlToRemove });
        } catch (e) {
            console.warn(`Could not delete file: ${urlToRemove}`, e);
        }
    }
    setFormState(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove)}));
  };

  return (
    <div className="max-w-4xl mx-auto relative animate-fade-in pb-32">
        <div className="flex justify-between items-center mb-8 px-1">
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            <button onClick={onCancel} disabled={isSaving} className="text-sm font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-[0.2em]">{t('cancel_btn')}</button>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div className="grid grid-cols-3 gap-3">
                  {formState.imageUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square group">
                          {/* getImageSrc will handle both data: URLs and file:// URLs correctly */}
                          <img src={getImageSrc(url)} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700" alt="Preview"/>
                          <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-90">
                              <X className="w-3.5 h-3.5"/>
                          </button>
                      </div>
                  ))}
                  <div className="col-span-1">
                     <button 
                        type="button"
                        onClick={Capacitor.isNativePlatform() ? handleTakePhoto : () => fileInputRef.current?.click()}
                        disabled={isProcessing || isSaving}
                        className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/50 transition-all active:scale-95 disabled:opacity-50"
                     >
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : <Plus className="w-6 h-6"/>}
                     </button>
                  </div>
               </div>
               <p className="text-center text-xs text-slate-400 font-medium">{t('photos')}</p>
               <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </div>

            <div className="space-y-4">
              <FormField label={t('form_title')} icon={Text}>
                <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} disabled={isSaving} className="w-full bg-transparent outline-none text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"/>
              </FormField>

              <FormField label={t('date_label')} icon={Calendar}>
                <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} disabled={isSaving} className="w-full bg-transparent outline-none text-base font-bold text-slate-800 dark:text-slate-100"/>
              </FormField>
              
              <FormField label="Tags" icon={Tag}>
                <div className="flex flex-wrap gap-2 mb-2">
                    {formState.tags.map(tag => (
                        <span key={tag} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                            #{tag}
                            <button type="button" onClick={() => removeTag(tag)} className="ml-2 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5"/></button>
                        </span>
                    ))}
                </div>
                <input 
                    type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag}
                    placeholder={t('tags_placeholder')}
                    className="w-full bg-transparent outline-none text-sm font-medium text-slate-600 dark:text-slate-200 placeholder:text-slate-400"
                    disabled={isSaving}
                />
              </FormField>

              <FormField label={t('form_desc')} icon={Text}>
                <textarea value={formState.desc} onChange={e => setFormState({...formState, desc: e.target.value})} placeholder={t('form_desc_placeholder')} disabled={isSaving} className="w-full bg-transparent outline-none h-24 resize-none text-sm font-medium text-slate-600 dark:text-slate-200 placeholder:text-slate-400"/>
              </FormField>
            </div>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent md:relative md:p-0 md:bg-none md:mt-8 z-50">
            <button 
                type="submit"
                disabled={isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0} 
                className={`w-full max-w-lg mx-auto py-5 text-white text-sm font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0 ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-primary shadow-primary/30'}`}
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                {isSaving ? t('saving') : (editMemory ? t('update_btn') : t('record_btn'))}
            </button>
          </div>
        </form>
    </div>
  );
};