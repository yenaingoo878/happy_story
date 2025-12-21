
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Save, Tag, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
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
            synced: 0 
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
        
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onSaveComplete();
        }, 1500);
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

  const removeImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFormState(prev => ({...prev, imageUrl: undefined}));
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto relative">
        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in pointer-events-none">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 animate-zoom-in border border-white/20">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">{t('profile_saved')}</h3>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 px-1">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{editMemory ? t('edit_memory_title') : t('add_memory_title')}</h2>
            {editMemory && <button onClick={onCancel} disabled={isSaving} className="text-sm font-bold text-slate-500 disabled:opacity-50">{t('cancel_btn')}</button>}
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className={`w-full h-64 bg-slate-50 dark:bg-slate-700/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-600 mb-6 flex items-center justify-center overflow-hidden relative transition-all ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
                
                {isUploading ? (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-3"/>
                        <span className="text-sm font-bold text-slate-400">{t('uploading')}</span>
                    </div>
                ) : formState.imageUrl ? (
                    <div className="relative w-full h-full group">
                        <img src={formState.imageUrl} className="w-full h-full object-cover"/>
                        <button onClick={removeImage} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={triggerGalleryInput}
                        className="w-full h-full flex flex-col items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                            <ImageIcon className="w-8 h-8"/>
                        </div>
                        <div className="text-center">
                             <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">{t('choose_photo')}</p>
                             <p className="text-xs font-bold text-slate-400">{t('upload_photo')}</p>
                        </div>
                    </button>
                )}
                
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading || isSaving} />
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">{t('form_title')}</label>
                    <input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder={t('form_title_placeholder')} disabled={isSaving} className="w-full px-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-700/50 outline-none text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-primary/10 transition-all"/>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">{t('date_label')}</label>
                    <input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} disabled={isSaving} className="w-full px-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-700/50 outline-none text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-primary/10 transition-all min-h-[56px] appearance-none"/>
                  </div>
                  
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Tags</label>
                      <div className="flex flex-wrap gap-2 mb-2 px-1">
                          {formState.tags.map(tag => (
                              <span key={tag} className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-black flex items-center shadow-sm">
                                  #{tag}
                                  <button onClick={() => removeTag(tag)} className="ml-1.5 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5"/></button>
                              </span>
                          ))}
                      </div>
                      <div className="relative">
                          <Tag className="absolute left-4 top-4.5 w-5 h-5 text-slate-400" />
                          <input 
                              type="text" 
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={handleAddTag}
                              placeholder={t('tags_placeholder')}
                              className="w-full pl-12 pr-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-700/50 outline-none text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-primary/10 transition-all"
                              disabled={isSaving}
                          />
                      </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">{t('form_desc')}</label>
                    <textarea value={formState.desc} onChange={e => setFormState({...formState, desc: e.target.value})} placeholder={t('form_desc_placeholder')} disabled={isSaving} className="w-full px-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-700/50 outline-none h-40 resize-none text-base font-medium text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"/>
                  </div>

                  <button 
                      onClick={handleSave} 
                      disabled={isUploading || isSaving || !formState.title} 
                      className={`w-full py-5 text-white text-base font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${isUploading || isSaving || !formState.title ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' : 'bg-primary shadow-primary/30'}`}
                  >
                      {isSaving ? (
                          <>
                              <Loader2 className="w-6 h-6 animate-spin"/>
                              {t('saving')}
                          </>
                      ) : (
                          <>
                              <Save className="w-6 h-6"/>
                              {editMemory ? t('update_btn') : t('record_btn')}
                          </>
                      )}
                  </button>
                </div>
        </div>
    </div>
  );
};
