import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Save, Tag, X, Image as ImageIcon, CheckCircle2, Camera } from 'lucide-react';
import { Memory, Language } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService, blobToBase64 } from '../lib/db';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface AddMemoryProps {
  language: Language;
  activeProfileId: string;
  editMemory: Memory | null;
  onSaveComplete: () => void;
  onCancel: () => void;
}

export const AddMemory: React.FC<AddMemoryProps> = ({ 
  language, 
  activeProfileId, 
  editMemory, 
  onSaveComplete,
  onCancel 
}) => {
  const t = (key: any) => getTranslation(language, key);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isWeb = Capacitor.getPlatform() === 'web';
  
  const getTodayLocal = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [formState, setFormState] = useState<{title: string; desc: string; date: string; imageUrls: string[]; tags: string[]}>({ 
    title: '', 
    desc: '', 
    date: getTodayLocal(),
    imageUrls: [],
    tags: []
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
        setFormState({ 
            title: '', 
            desc: '', 
            date: getTodayLocal(),
            imageUrls: [],
            tags: []
        });
    }
  }, [editMemory]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true); 
      try {
        const base64Promises = Array.from(files).map(file => blobToBase64(file as File));
        const newImageUrls = await Promise.all(base64Promises);
        setFormState(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newImageUrls] }));
      } catch (error) {
        console.error("Image processing failed", error);
        alert("Failed to process images.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissions = await CapacitorCamera.checkPermissions();
      if (permissions.camera !== 'granted') {
        const newPermissions = await CapacitorCamera.requestPermissions();
        if (newPermissions.camera !== 'granted') {
          alert(language === 'mm' ? "Camera သုံးဖို့ Permission ပေးရန် လိုအပ်ပါတယ်" : "Camera permission is required to take photos.");
          return;
        }
      }
      
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });

      if (image.dataUrl) {
        setFormState(prev => ({ ...prev, imageUrls: [...prev.imageUrls, image.dataUrl!] }));
      }
    } catch (error) {
      console.error("Failed to take photo", error);
      if (!(error instanceof Error && error.message.toLowerCase().includes('cancelled'))) {
        alert(language === 'mm' ? "ဓာတ်ပုံရိုက်မရပါ။" : "Failed to take photo.");
      }
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !formState.tags.includes(val)) {
        setFormState(prev => ({ ...prev, tags: [...prev.tags, val] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormState(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleSave = async () => {
    if (!formState.title || formState.imageUrls.length === 0 || !activeProfileId) return;

    setIsSaving(true);
    try {
        const memory: Memory = {
            id: editMemory ? editMemory.id : crypto.randomUUID(),
            childId: activeProfileId,
            title: formState.title, 
            description: formState.desc, 
            date: formState.date, 
            imageUrls: formState.imageUrls,
            tags: formState.tags,
            synced: 0
        };
        await DataService.addMemory(memory);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onSaveComplete();
        }, 1500);
    } catch (error) {
        console.error("Save failed", error);
        alert("Failed to save memory locally.");
    } finally {
        setIsSaving(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
      setFormState(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove)}));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto relative animate-fade-in pb-24">
        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in pointer-events-none">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 animate-zoom-in border border-slate-100 dark:border-slate-700">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">{t('profile_saved')}</h3>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 px-1">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            <button onClick={onCancel} disabled={isSaving} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest">{t('cancel_btn')}</button>
        </div>
        
        <div className="space-y-8">
            {/* Image Section */}
            <div>
                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">{t('photos')}</label>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {formState.imageUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square group">
                                <img src={url} className="w-full h-full object-cover rounded-xl shadow-sm border border-slate-200 dark:border-slate-700" alt="Preview"/>
                                <button onClick={() => removeImage(index)} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-90">
                                    <X className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        ))}
                        {isWeb ? (
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isProcessing || isSaving}
                              className="aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/50 transition-all active:scale-95"
                          >
                              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : <ImageIcon className="w-6 h-6"/>}
                              <span className="text-[10px] font-black uppercase tracking-widest">{isProcessing ? t('uploading') : t('upload_photo')}</span>
                          </button>
                        ) : (
                          <button 
                              onClick={handleTakePhoto}
                              disabled={isProcessing || isSaving}
                              className="aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/50 transition-all active:scale-95"
                          >
                              <Camera className="w-6 h-6"/>
                              <span className="text-[10px] font-black uppercase tracking-widest">{t('take_photo')}</span>
                          </button>
                        )}
                    </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Details Section */}
            <div className="space-y-6">
                <div>
                    <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">{t('form_title')}</label>
                    <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} disabled={isSaving} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400"/>
                </div>

                <div className="space-y-6">
                    <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block text-align: start">{t('date_label')}</label>
                    <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} disabled={isSaving} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 transition-all"/>
                </div>
                
                <div>
                    <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {formState.tags.map(tag => (
                            <span key={tag} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                                #{tag}
                                <button onClick={() => removeTag(tag)} className="ml-2 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5"/></button>
                            </span>
                        ))}
                    </div>
                    <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder={t('tags_placeholder')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400"
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">{t('form_desc')}</label>
                    <textarea value={formState.desc} onChange={e => setFormState({...formState, desc: e.target.value})} placeholder={t('form_desc_placeholder')} disabled={isSaving} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none h-36 resize-none text-base font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400"/>
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0} 
                    className={`w-full py-4 text-white text-sm font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isProcessing || isSaving || !formState.title || formState.imageUrls.length === 0 ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' : 'bg-primary shadow-primary/30'}`}
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                    {isSaving ? t('saving') : (editMemory ? t('update_btn') : t('record_btn'))}
                </button>
            </div>
        </div>
    </div>
  );
};
