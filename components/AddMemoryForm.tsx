import React, { useState, useRef } from 'react';
import { Camera, Save, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';
import { supabase } from '../supabaseClient';
import { DataService } from '../db';

interface AddMemoryFormProps {
  language: Language;
  currentProfileId: string;
  onClose: () => void;
  onSave: () => void;
}

export const AddMemoryForm: React.FC<AddMemoryFormProps> = ({ language, currentProfileId, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: any) => getTranslation(language, key);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get Public URL
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      // Fallback: If upload fails (e.g., offline/guest), return base64 preview
      // Note: In a real production app, you might want to retry syncing later.
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !currentProfileId) return;

    setIsSubmitting(true);

    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80'; // Default placeholder

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

      await DataService.addMemory({
        id: crypto.randomUUID(),
        childId: currentProfileId,
        title,
        date,
        description,
        imageUrl: finalImageUrl,
        tags: tagArray.length > 0 ? tagArray : ['Memory']
      });

      onSave();
    } catch (error) {
      console.error("Error saving memory:", error);
      alert(language === 'mm' ? "သိမ်းဆည်းမရပါ၊ ပြန်လည်ကြိုးစားပါ" : "Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-up">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-rose-50 dark:bg-slate-700/50">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <Camera className="w-5 h-5 mr-2 text-rose-500" />
          {t('add_memory_title')}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        
        {/* Image Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden
            ${previewUrl ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700'}`}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white font-bold text-sm flex items-center">
                  <Camera className="w-4 h-4 mr-2" />
                  {t('choose_photo')}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('choose_photo')}</p>
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('form_title')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('form_title_placeholder')}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('date_label')}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('form_desc')}</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form_desc_placeholder')}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none text-slate-800 dark:text-slate-100 font-medium h-24 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('tags_label')}</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Milestone, Birthday, First Step"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {t('record_btn')}
            </>
          )}
        </button>
      </form>
    </div>
  );
};