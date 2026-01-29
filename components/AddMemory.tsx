
import React, { useState, useRef, useEffect } from 'react';
import { Memory, Language } from '../types';
import { getTranslation, translations } from '../utils/translations';
import { DataService, getImageSrc, uploadFileToCloud } from '../lib/db';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// FontAwesome Icon Bridge
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin ${className}`} />;
const Save = ({ className }: { className?: string }) => <i className={`fa-solid fa-floppy-disk ${className}`} />;
const Tag = ({ className }: { className?: string }) => <i className={`fa-solid fa-tag ${className}`} />;
const X = ({ className }: { className?: string }) => <i className={`fa-solid fa-xmark ${className}`} />;
const ImageIcon = ({ className }: { className?: string }) => <i className={`fa-solid fa-image ${className}`} />;
const Camera = ({ className }: { className?: string }) => <i className={`fa-solid fa-camera ${className}`} />;
const Text = ({ className }: { className?: string }) => <i className={`fa-solid fa-font ${className}`} />;
const Calendar = ({ className }: { className?: string }) => <i className={`fa-solid fa-calendar-days ${className}`} />;
const Plus = ({ className }: { className?: string }) => <i className={`fa-solid fa-plus ${className}`} />;

// Helper function to resize images
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
      if (!ctx) return reject(new Error('Could not get canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image failed to load.'));
    if (typeof file === 'string') img.src = file;
    else {
        const reader = new FileReader();
        reader.onload = (e) => { if (e.target?.result) img.src = e.target.result as string; };
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

// Compact FormField
const FormField = ({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children?: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
    <label className="flex items-center gap-2 text-[8px] font-black text-slate-400 mb-1 uppercase tracking-widest">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </label>
    {children}
  </div>
);

const AddMemory: React.FC<AddMemoryProps> = ({ 
  language, activeProfileId, editMemory, onSaveComplete, onCancel, session
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
        const initialUrls = Array.isArray(editMemory.imageUrls) && editMemory.imageUrls.length > 0 ? editMemory.imageUrls : (editMemory.imageUrl ? [editMemory.imageUrl] : []);
        setFormState({ title: editMemory.title, desc: editMemory.description, date: editMemory.date, imageUrls: initialUrls, tags: editMemory.tags || [] });
    } else {
        setFormState({ title: '', desc: '', date: getTodayLocal(), imageUrls: [], tags: [] });
    }
  }, [editMemory]);

  const saveImageToFile = async (dataUrl: string): Promise<string> => {
      if (!Capacitor.isNativePlatform()) return dataUrl;
      try {
          const fileName = `moments_${new Date().getTime()}_${Math.random().toString(36).substring(7)}.jpeg`;
          const savedFile = await Filesystem.writeFile({ path: fileName, data: dataUrl, directory: Directory.Data });
          return savedFile.uri;
      } catch (err) { return dataUrl; }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true); 
      try {
        const newDataUrls = await Promise.all(Array.from(files).map(async (file) => await resizeImage(file as File)));
        setFormState(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newDataUrls] }));
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleTakePhoto = async () => {
    if (!Capacitor.isNativePlatform()) { fileInputRef.current?.click(); return; }
    setIsProcessing(true);
    try {
      const image = await CapacitorCamera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.DataUrl });
      if (image.dataUrl) {
        const resizedDataUrl = await resizeImage(image.dataUrl as string);
        setFormState(prev => ({ ...prev, imageUrls: [...prev.imageUrls, resizedDataUrl] }));
      }
    } finally { setIsProcessing(false); }
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
                try { return await uploadFileToCloud(blob, session.user.id, activeProfileId, 'memories', memoryId, index); }
                catch (e) { return await saveImageToFile(url); }
            }
            if (url.startsWith('data:')) return await saveImageToFile(url);
            return url;
        }));
        const memory: Memory = { id: memoryId, childId: activeProfileId, title: formState.title, description: formState.desc, date: formState.date, imageUrls: finalImageUrls, imageUrl: finalImageUrls[0], tags: formState.tags, synced: 0 };
        await DataService.addMemory(memory);
        onSaveComplete();
    } finally { setIsSaving(false); }
  };

  return (
    <div className="animate-fade-in pb-6">
        <div className="flex justify-between items-center mb-4 pt-1 px-1">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            <button onClick={onCancel} disabled={isSaving} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-[0.2em]">{t('cancel_btn')}</button>
        </div>
        
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
               <div className="grid grid-cols-3 gap-2">
                  {formState.imageUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square">
                          <img src={getImageSrc(url)} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700" alt="Preview"/>
                          <button type="button" onClick={() => setFormState(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index)}))} className="absolute -top-1.5 -right-1.5 p-1.5 bg-rose-500 text-white rounded-full shadow-lg z-10 active:scale-90 transition-transform">
                              <X className="w-3 h-3"/>
                          </button>
                      </div>
                  ))}
                  <button type="button" onClick={Capacitor.isNativePlatform() ? handleTakePhoto : () => fileInputRef.current?.click()} disabled={isProcessing || isSaving} className="w-full aspect-square flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary active:scale-95 disabled:opacity-50">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                    <span className="text-[8px] font-black uppercase tracking-widest">{t('choose_photo')}</span>
                  </button>
               </div>
               <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </div>

            <div className="space-y-2">
              <FormField label={t('form_title')} icon={Text}>
                <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} disabled={isSaving} className="w-full bg-transparent outline-none text-base font-bold text-slate-800 dark:text-slate-100"/>
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                  <FormField label={t('date_label')} icon={Calendar}>
                    <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} disabled={isSaving} className="w-full bg-transparent outline-none text-xs font-bold text-slate-800 dark:text-slate-100"/>
                  </FormField>
                  <FormField label="Tags" icon={Tag}>
                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Tag + Enter" className="w-full bg-transparent outline-none text-xs font-bold text-slate-500" disabled={isSaving}/>
                  </FormField>
              </div>
              <FormField label={t('form_desc')} icon={Text}>
                <textarea value={formState.desc} onChange={e => setFormState({...formState, desc: e.target.value})} placeholder={t('form_desc_placeholder')} disabled={isSaving} className="w-full bg-transparent outline-none h-24 resize-none text-sm font-medium text-slate-600 dark:text-slate-200 leading-tight no-scrollbar"/>
              </FormField>
            </div>
          </div>
          <div className="pt-4 pb-12">
            <button type="submit" disabled={isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0} className={`w-full py-4 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-primary'}`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                {isSaving ? t('saving') : (editMemory ? t('update_btn') : t('record_btn'))}
            </button>
          </div>
        </form>
    </div>
  );
};

export default AddMemory;
