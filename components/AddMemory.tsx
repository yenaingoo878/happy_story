
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Memory, Language } from '../types';
import { getTranslation } from '../translations';
import { DataService } from '../db';

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
  const [isUploading, setIsUploading] = useState(false);
  
  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formState, setFormState] = useState<{title: string; desc: string; date: string; imageUrl?: string}>({ 
    title: '', 
    desc: '', 
    date: getTodayLocal() 
  });

  useEffect(() => {
    if (editMemory) {
        setFormState({
            title: editMemory.title,
            desc: editMemory.description,
            date: editMemory.date,
            imageUrl: editMemory.imageUrl
        });
    } else {
        setFormState({ 
            title: '', 
            desc: '', 
            date: getTodayLocal(),
            imageUrl: undefined 
        });
    }
  }, [editMemory]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!activeProfileId) {
          alert("Please create or select a profile first.");
          return;
      }
      
      setIsUploading(true);
      try {
          const url = await DataService.uploadImage(file, activeProfileId, 'memories');
          setFormState(prev => ({ ...prev, imageUrl: url }));
      } catch (error) {
          console.error("Image upload failed", error);
          alert("Image upload failed. Please try again.");
      } finally {
          setIsUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!formState.title) return;
    if (!activeProfileId) return; 

    const finalImageUrl = formState.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`;

    if (editMemory) {
      const updated: Memory = { 
        ...editMemory, 
        childId: editMemory.childId,
        title: formState.title, 
        description: formState.desc, 
        imageUrl: finalImageUrl,
        date: formState.date,
        synced: 0 // Mark as dirty
      };
      await DataService.addMemory(updated); 
    } else {
      const memory: Memory = {
        id: crypto.randomUUID(),
        childId: activeProfileId,
        title: formState.title, 
        description: formState.desc, 
        date: formState.date, 
        imageUrl: finalImageUrl,
        tags: ['New Memory'],
        synced: 0
      };
      await DataService.addMemory(memory);
    }
    onSaveComplete();
  };

  const triggerFileInput = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            {editMemory && <button onClick={onCancel} className="text-sm text-slate-500">{t('cancel_btn')}</button>}
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div onClick={triggerFileInput} className="w-full h-48 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 cursor-pointer flex items-center justify-center overflow-hidden relative">
                {isUploading ? (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2"/>
                        <span className="text-sm text-slate-400">Uploading...</span>
                    </div>
                ) : formState.imageUrl ? (
                    <img src={formState.imageUrl} className="w-full h-full object-cover"/> 
                ) : (
                    <div className="text-center">
                        <Camera className="w-8 h-8 mx-auto text-slate-300 mb-2"/>
                        <span className="text-sm text-slate-400">{t('choose_photo')}</span>
                    </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                <div className="space-y-4">
                <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-800 dark:text-slate-100"/>
                <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-800 dark:text-slate-100"/>
                <textarea value={formState.desc} onChange={e => setFormState({...formState, desc: e.target.value})} placeholder={t('form_desc_placeholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none h-32 resize-none text-slate-800 dark:text-slate-100"/>
                <button onClick={handleSave} disabled={isUploading} className={`w-full py-3 text-white font-bold rounded-xl ${isUploading ? 'bg-slate-300' : 'bg-primary'}`}>{editMemory ? t('update_btn') : t('record_btn')}</button>
                </div>
        </div>
    </div>
  );
};
