
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, Save, Tag, X, Image as ImageIcon } from 'lucide-react';
import { Memory, Language } from '../types';
import { getTranslation } from '../utils/translations';
import { DataService } from '../lib/db';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formState, setFormState] = useState<{title: string; desc: string; date: string; imageUrl?: string; tags: string[]}>({ 
    title: '', 
    desc: '', 
    date: getTodayLocal(),
    tags: []
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editMemory) {
        setFormState({
            title: editMemory.title,
            desc: editMemory.description,
            date: editMemory.date,
            imageUrl: editMemory.imageUrl,
            tags: editMemory.tags || []
        });
    } else {
        setFormState({ 
            title: '', 
            desc: '', 
            date: getTodayLocal(),
            imageUrl: undefined,
            tags: []
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
    if (!formState.title) return;
    if (!activeProfileId) return; 

    setIsSaving(true);
    try {
        const finalImageUrl = formState.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`;
        const finalTags = formState.tags.length > 0 ? formState.tags : [];

        if (editMemory) {
          const updated: Memory = { 
            ...editMemory, 
            childId: editMemory.childId,
            title: formState.title, 
            description: formState.desc, 
            imageUrl: finalImageUrl,
            date: formState.date,
            tags: finalTags,
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
            tags: finalTags,
            synced: 0
          };
          await DataService.addMemory(memory);
        }
        onSaveComplete();
    } catch (error) {
        console.error("Save failed", error);
        alert("Failed to save memory.");
    } finally {
        setIsSaving(false);
    }
  };

  const triggerGalleryInput = () => {
    if (!isUploading && !isSaving) fileInputRef.current?.click();
  };
  
  const triggerCameraInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUploading && !isSaving) cameraInputRef.current?.click();
  };

  const removeImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFormState(prev => ({...prev, imageUrl: undefined}));
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            {editMemory && <button onClick={onCancel} disabled={isSaving} className="text-sm text-slate-500 disabled:opacity-50">{t('cancel_btn')}</button>}
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className={`w-full h-56 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 flex items-center justify-center overflow-hidden relative transition-all ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
                
                {isUploading ? (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2"/>
                        <span className="text-sm text-slate-400">{t('uploading')}</span>
                    </div>
                ) : formState.imageUrl ? (
                    <div className="relative w-full h-full group">
                        <img src={formState.imageUrl} className="w-full h-full object-cover"/>
                        <button onClick={removeImage} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 w-full px-8">
                        <div className="text-center mb-2">
                             <span className="text-sm text-slate-400 font-medium">{t('choose_photo')}</span>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={triggerCameraInput}
                                className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                                    <Camera className="w-5 h-5"/>
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('take_photo')}</span>
                            </button>
                            
                            <button 
                                onClick={triggerGalleryInput}
                                className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500">
                                    <ImageIcon className="w-5 h-5"/>
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('upload_photo')}</span>
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Gallery Input */}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading || isSaving} />
                
                {/* Camera Input - capture="environment" forces back camera on mobile */}
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" disabled={isUploading || isSaving} />
                
                </div>
                <div className="space-y-4">
                  <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} disabled={isSaving} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-800 dark:text-slate-100 disabled:opacity-50"/>
                  <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} disabled={isSaving} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-800 dark:text-slate-100 disabled:opacity-50 min-h-[48px] appearance-none"/>
                  
                  {/* Tags Input */}
                  <div>
                      <div className="flex flex-wrap gap-2 mb-2 min-h-[24px]">
                          {formState.tags.map(tag => (
                              <span key={tag} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                  #{tag}
                                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-rose-500"><X className="w-3 h-3"/></button>
                              </span>
                          ))}
                      </div>
                      <div className="relative">
                          <Tag className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                          <input 
                              type="text" 
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={handleAddTag}
                              placeholder={t('tags_placeholder')}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none text-slate-800 dark:text-slate-100 disabled:opacity-50 text-sm"
                              disabled={isSaving}
                          />
                      </div>
                  </div>

                  <textarea value={formState.desc} onChange={e => setFormState({...formState, desc: e.target.value})} placeholder={t('form_desc_placeholder')} disabled={isSaving} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 outline-none h-32 resize-none text-slate-800 dark:text-slate-100 disabled:opacity-50"/>
                  <button 
                      onClick={handleSave} 
                      disabled={isUploading || isSaving || !formState.title} 
                      className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 ${isUploading || isSaving || !formState.title ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' : 'bg-primary shadow-lg shadow-primary/30 active:scale-95 transition-transform'}`}
                  >
                      {isSaving ? (
                          <>
                              <Loader2 className="w-5 h-5 animate-spin"/>
                              {t('saving')}
                          </>
                      ) : (
                          <>
                              {editMemory ? t('update_btn') : t('record_btn')}
                          </>
                      )}
                  </button>
                </div>
        </div>
    </div>
  );
};
