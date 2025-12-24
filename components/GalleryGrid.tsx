
import React, { useState, useMemo, useEffect } from 'react';
import { Memory, Language } from '../types';
import { Image as ImageIcon, Search, Cloud, HardDrive, Loader2, X, Trash2 } from 'lucide-react';
// FIX: Import translations to correctly type the `t` function.
import { getTranslation, translations } from '../utils/translations';
import { DataService, blobToBase64 } from '../lib/db';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
  userId?: string;
  activeProfileId: string;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick, userId, activeProfileId }) => {
  // FIX: Provide a strong type for the translation key.
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LOCAL' | 'CLOUD'>('LOCAL');
  const [cloudPhotos, setCloudPhotos] = useState<string[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [previewState, setPreviewState] = useState<{ url: string | null; data: string | null; isLoading: boolean }>({ url: null, data: null, isLoading: false });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (activeTab === 'CLOUD' && userId && activeProfileId) {
      fetchCloudPhotos();
    }
  }, [activeTab, userId, activeProfileId]);

  const fetchCloudPhotos = async () => {
    if (!userId || !activeProfileId) return;
    setIsLoadingCloud(true);
    const photos = await DataService.getCloudPhotos(userId, activeProfileId);
    setCloudPhotos(photos);
    setIsLoadingCloud(false);
  };

  const handlePreviewClick = async (url: string) => {
    if (!userId) {
        setPreviewState({ url, data: url, isLoading: false });
        return;
    }
    setPreviewState({ url, data: null, isLoading: true });
    try {
        const cached = await DataService.getCachedPhoto(url);
        if (cached && cached.userId === userId) {
            setPreviewState({ url, data: cached.base64data, isLoading: false });
        } else {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Image fetch failed: ${response.statusText}`);
            const blob = await response.blob();

            // Validate the fetched blob to prevent caching invalid data (e.g., from opaque responses)
            if (blob.size === 0 || !blob.type.startsWith('image/')) {
                throw new Error(`Invalid image data received. Size: ${blob.size}, Type: ${blob.type}`);
            }

            const base64data = await blobToBase64(blob);
            await DataService.cachePhoto(url, userId, base64data);
            setPreviewState({ url, data: base64data, isLoading: false });
        }
    } catch (error) {
        console.error("Failed to load or cache image:", error);
        setPreviewState({ url, data: url, isLoading: false });
    }
  };

  const handleDeleteCloudPhoto = async (url: string) => {
    if (isDeleting) return;
    const confirmDelete = window.confirm(t('confirm_delete'));
    if (confirmDelete) {
        setIsDeleting(true);
        const { success, error } = await DataService.deleteCloudPhoto(url);
        if (success) {
            setPreviewState({ url: null, data: null, isLoading: false });
            await fetchCloudPhotos();
        } else {
            alert("Deletion failed: " + error?.message);
        }
        setIsDeleting(false);
    }
  };

  const filteredMemories = useMemo(() => {
     if (!searchTerm.trim()) return memories;
     const lowerTerm = searchTerm.toLowerCase();
     return memories.filter(mem => 
        mem.title.toLowerCase().includes(lowerTerm) ||
        (mem.tags && mem.tags.some(tag => tag.toLowerCase().includes(lowerTerm))) ||
        (mem.description && mem.description.toLowerCase().includes(lowerTerm))
     );
  }, [memories, searchTerm]);

  return (
    <div className="pb-24 animate-fade-in">
       <div className="mb-6 space-y-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center transition-colors tracking-tight">
                  <ImageIcon className="w-6 h-6 mr-2.5 text-rose-400" />
                  {t('gallery_title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5 transition-colors">{t('gallery_subtitle')}</p>
            </div>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[24px] max-w-sm mx-auto shadow-inner border border-slate-200 dark:border-slate-700/50">
             <button 
                onClick={() => setActiveTab('LOCAL')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOCAL' ? 'bg-white dark:bg-slate-700 text-primary shadow-md' : 'text-slate-400'}`}
             >
                <HardDrive className="w-3.5 h-3.5" />
                {language === 'mm' ? 'မှတ်တမ်းများ' : 'Memories'}
             </button>
             <button 
                onClick={() => setActiveTab('CLOUD')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'CLOUD' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md' : 'text-slate-400'}`}
             >
                <Cloud className="w-3.5 h-3.5" />
                {language === 'mm' ? 'Cloud ပုံများ' : 'Cloud Photos'}
             </button>
          </div>
          
          {/* Search Bar */}
          {activeTab === 'LOCAL' && (
            <div className="relative max-w-md mx-auto group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               </div>
               <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-200 shadow-sm"
               />
            </div>
          )}
       </div>
       
       {activeTab === 'LOCAL' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-1">
             {filteredMemories.map((memory) => (
               <div 
                 key={memory.id} 
                 onClick={() => onMemoryClick(memory)}
                 className="group relative rounded-[28px] overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg border border-white dark:border-slate-700 cursor-pointer aspect-square active:scale-95 bg-white dark:bg-slate-800"
               >
                 {memory.imageUrls && memory.imageUrls.length > 0 ? (
                    <img 
                     src={memory.imageUrls[0]} 
                     alt={memory.title} 
                     className="w-full h-full object-cover transform transition-transform duration-700 md:group-hover:scale-110" 
                    />
                 ) : (
                   <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                     <ImageIcon className="w-10 h-10 text-slate-200 dark:text-slate-700"/>
                   </div>
                 )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5 pointer-events-none">
                     <span className="text-white text-xs font-black truncate uppercase tracking-widest">{memory.title}</span>
                  </div>
               </div>
             ))}
          </div>
       ) : (
          <div className="px-1">
             {isLoadingCloud ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                   <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Fetching from Supabase...</p>
                </div>
             ) : cloudPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {cloudPhotos.map((url, index) => (
                      <div 
                         key={index} 
                         onClick={() => handlePreviewClick(url)}
                         className="relative rounded-[28px] overflow-hidden shadow-sm border border-white dark:border-slate-700 cursor-pointer aspect-square active:scale-95 bg-white dark:bg-slate-800 group"
                      >
                         <img src={url} className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110" alt={`Cloud Photo ${index}`} />
                         <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                               <Cloud className="w-3.5 h-3.5" />
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-5 opacity-40">
                   <Cloud className="w-14 h-14" />
                   <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest">{language === 'mm' ? 'Cloud ပေါ်တွင် ဓာတ်ပုံမရှိသေးပါ' : 'No cloud photos found'}</p>
                      <p className="text-[10px] font-bold">{language === 'mm' ? 'အင်တာနက်လိုင်း နှင့် Supabase ချိတ်ဆက်မှုကို စစ်ဆေးပါ' : 'Check connection or Supabase config'}</p>
                   </div>
                </div>
             )}
          </div>
       )}
       
       {activeTab === 'LOCAL' && filteredMemories.length === 0 && (
         <div className="flex flex-col items-center justify-center py-24 text-slate-400/50">
           {searchTerm ? (
               <>
                <Search className="w-14 h-14 mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">No matches found</p>
               </>
           ) : (
               <>
                <ImageIcon className="w-14 h-14 mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">{t('no_photos')}</p>
               </>
           )}
         </div>
       )}

       {/* Full Screen Image Preview for Cloud Photos */}
       {previewState.url && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
             <div className="absolute inset-0" onClick={() => setPreviewState({ url: null, data: null, isLoading: false })} />
             <button onClick={() => setPreviewState({ url: null, data: null, isLoading: false })} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[210]">
                <X className="w-6 h-6" />
             </button>
             
             {previewState.isLoading ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
             ) : (
                <img src={previewState.data || previewState.url} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in relative z-[205]" alt="Preview" />
             )}

             <button 
                onClick={(e) => { e.stopPropagation(); if(previewState.url) handleDeleteCloudPhoto(previewState.url); }}
                disabled={isDeleting || previewState.isLoading}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[210] px-6 py-4 bg-rose-500/80 hover:bg-rose-600 backdrop-blur-md text-white rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg disabled:bg-rose-400/50 disabled:cursor-not-allowed"
             >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                {isDeleting ? t('deleting') : t('delete')}
             </button>
          </div>
       )}
    </div>
  );
};