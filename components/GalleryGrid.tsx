import React, { useState, useMemo, useEffect } from 'react';
import { Memory, Language } from '../types';
import { Image as ImageIcon, Search, Cloud, HardDrive, Loader2, X, Trash2, CheckSquare, Square, ThumbsUp, ZoomIn, Maximize, Download } from 'lucide-react';
import { getTranslation, translations } from '../utils/translations';
import { DataService, blobToBase64, getImageSrc } from '../lib/db';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
  userId?: string;
  activeProfileId: string;
  requestDeleteConfirmation: (onConfirm: () => Promise<any>) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick, userId, activeProfileId, requestDeleteConfirmation }) => {
  const t = (key: keyof typeof translations) => getTranslation(language, key);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LOCAL' | 'CLOUD'>('LOCAL');
  const [cloudPhotos, setCloudPhotos] = useState<string[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [previewState, setPreviewState] = useState<{ url: string | null; data: string | null; isLoading: boolean }>({ url: null, data: null, isLoading: false });

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'CLOUD' && userId && activeProfileId) {
      fetchCloudPhotos();
    }
  }, [activeTab, userId, activeProfileId]);

  // Prevent background scrolling when preview is open
  useEffect(() => {
    if (previewState.url) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewState.url]);

  const fetchCloudPhotos = async () => {
    if (!userId || !activeProfileId) return;
    setIsLoadingCloud(true);
    const photos = await DataService.getCloudPhotos(userId, activeProfileId);
    setCloudPhotos(photos);
    setIsLoadingCloud(false);
  };

  const handleGridItemClick = (url: string) => {
    if (isSelectMode) {
        toggleSelection(url);
    } else {
        handlePreviewClick(url);
    }
  }

  const toggleSelection = (url: string) => {
    setSelectedPhotos(prev => 
        prev.includes(url) ? prev.filter(p => p !== url) : [...prev, url]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedPhotos.length === 0) return;
    requestDeleteConfirmation(async () => {
        const deletePromises = selectedPhotos.map(url => DataService.deleteCloudPhoto(url));
        const results = await Promise.allSettled(deletePromises);
        
        await fetchCloudPhotos();
        setIsSelectMode(false);
        setSelectedPhotos([]);

        if (results.some(r => r.status === 'rejected')) {
            throw new Error("Some photos could not be deleted.");
        }
    });
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
    <div className="pb-24 animate-fade-in relative">
       <div className="mb-6 space-y-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center transition-colors tracking-tight">
                  <ImageIcon className="w-6 h-6 mr-2.5 text-rose-400" />
                  {t('gallery_title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5 transition-colors">{t('gallery_subtitle')}</p>
            </div>
            {activeTab === 'CLOUD' && cloudPhotos.length > 0 && (
                <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedPhotos([]); }} className={`px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${isSelectMode ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    {isSelectMode ? t('cancel_btn') : 'Select'}
                </button>
            )}
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[24px] max-w-sm mx-auto shadow-inner border border-slate-200 dark:border-slate-700/50">
             <button onClick={() => { setActiveTab('LOCAL'); setIsSelectMode(false); setSelectedPhotos([]); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOCAL' ? 'bg-white dark:bg-slate-700 text-primary shadow-md' : 'text-slate-400'}`}><HardDrive className="w-3.5 h-3.5" />{language === 'mm' ? 'မှတ်တမ်းများ' : 'Memories'}</button>
             <button onClick={() => setActiveTab('CLOUD')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'CLOUD' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md' : 'text-slate-400'}`}><Cloud className="w-3.5 h-3.5" />{language === 'mm' ? 'Cloud ပုံများ' : 'Cloud Photos'}</button>
          </div>
          
          {activeTab === 'LOCAL' && <div className="relative max-w-md mx-auto group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" /></div><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('search_placeholder')} className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-200 shadow-sm" /></div>}
       </div>
       
       {activeTab === 'LOCAL' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-1">{filteredMemories.map((memory) => (<div key={memory.id} onClick={() => onMemoryClick(memory)} className="group relative rounded-[28px] overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg border border-white dark:border-slate-700 cursor-pointer aspect-square active:scale-95 bg-white dark:bg-slate-800">{memory.imageUrls && memory.imageUrls.length > 0 ? (<img src={getImageSrc(memory.imageUrls[0])} alt={memory.title} className="w-full h-full object-cover transform transition-transform duration-700 md:group-hover:scale-110" />) : (<div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><ImageIcon className="w-10 h-10 text-slate-200 dark:text-slate-700"/></div>)}<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5 pointer-events-none"><span className="text-white text-xs font-black truncate uppercase tracking-widest">{memory.title}</span></div></div>))}</div>
       ) : (
          <div className="px-1">{isLoadingCloud ? (<div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4"><Loader2 className="w-10 h-10 animate-spin text-sky-500" /><p className="text-[10px] font-black uppercase tracking-widest">Fetching from Supabase...</p></div>) : cloudPhotos.length > 0 ? (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{cloudPhotos.map((url, index) => { const isSelected = selectedPhotos.includes(url); return (<div key={index} onClick={() => handleGridItemClick(url)} className={`relative rounded-[28px] overflow-hidden shadow-sm border-2 cursor-pointer aspect-square active:scale-95 bg-white dark:bg-slate-800 group transition-all duration-300 ${isSelected ? 'border-primary' : 'border-white dark:border-slate-700'}`}><img src={url} className={`w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110 ${isSelectMode && isSelected ? 'opacity-50' : ''}`} alt={`Cloud Photo ${index}`} />{isSelectMode && (<div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white transition-all ${isSelected ? 'bg-primary' : 'bg-black/30 backdrop-blur-sm'}`}>{isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 opacity-50" />}</div>)}</div>);})}</div>) : (<div className="py-24 text-center text-slate-400 flex flex-col items-center gap-5 opacity-40"><Cloud className="w-14 h-14"/><div className="space-y-1"><p className="text-xs font-black uppercase tracking-widest">{language === 'mm' ? 'Cloud ပေါ်တွင် ဓာတ်ပုံမရှိသေးပါ' : 'No cloud photos found'}</p><p className="text-[10px] font-bold">{language === 'mm' ? 'အင်တာနက်လိုင်း နှင့် Supabase ချိတ်ဆက်မှုကို စစ်ဆေးပါ' : 'Check connection or Supabase config'}</p></div></div>)}</div>
       )}
       
       {activeTab === 'LOCAL' && filteredMemories.length === 0 && (<div className="flex flex-col items-center justify-center py-24 text-slate-400/50">{searchTerm ? (<><Search className="w-14 h-14 mb-4 opacity-20" /><p className="text-xs font-black uppercase tracking-widest">No matches found</p></>) : (<><ImageIcon className="w-14 h-14 mb-4 opacity-20" /><p className="text-xs font-black uppercase tracking-widest">{t('no_photos')}</p></>)}</div>)}

       {isSelectMode && selectedPhotos.length > 0 && (<div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-slide-up"><button onClick={handleDeleteSelected} className="w-full flex items-center justify-center gap-3 py-5 bg-rose-500 text-white rounded-2xl shadow-2xl shadow-rose-500/30 font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"><Trash2 className="w-5 h-5"/>{t('delete')} ({selectedPhotos.length})</button></div>)}
       
       {previewState.url && (
         <div className="fixed inset-0 z-[1000] bg-black overflow-hidden animate-fade-in touch-none flex flex-col items-center justify-center h-screen w-screen">
           {/* Pure Background Overlay */}
           <div className="absolute inset-0 z-0 bg-black" onClick={() => setPreviewState({ url: null, data: null, isLoading: false })} />
           
           {/* Top Header Controls - Fixed to top of viewport */}
           <div className="absolute top-0 left-0 right-0 z-[1010] p-6 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
             <button 
                onClick={() => setPreviewState({ url: null, data: null, isLoading: false })} 
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl border border-white/10 transition-all active:scale-90"
             >
               <X className="w-6 h-6" />
             </button>
             
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = previewState.data || previewState.url || '';
                  link.download = `CloudPhoto_${Date.now()}.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl border border-white/10 transition-all active:scale-90"
              >
                <Download className="w-5 h-5" />
              </button>
           </div>

           {/* Main Image Content - Centered in viewport */}
           <div className="relative z-[1005] w-full h-full flex items-center justify-center p-4">
              {previewState.isLoading ? (
                <div className="flex flex-col items-center gap-5">
                  <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">{language === 'mm' ? 'ပုံဖော်နေသည်...' : 'Loading HD...'}</p>
                </div>
              ) : (
                <img 
                  src={previewState.data || previewState.url || ''} 
                  className="max-w-full max-h-full object-contain animate-zoom-in shadow-2xl" 
                  alt="Full Screen Preview" 
                />
              )}
           </div>

           {/* Bottom Actions - Fixed to bottom of viewport */}
           <div className="absolute bottom-0 left-0 right-0 z-[1010] p-10 flex justify-center bg-gradient-to-t from-black/70 to-transparent">
             <button 
               onClick={(e) => { 
                 e.stopPropagation(); 
                 requestDeleteConfirmation(async () => { 
                   if(previewState.url) { 
                     await DataService.deleteCloudPhoto(previewState.url); 
                     setPreviewState({ url: null, data: null, isLoading: false }); 
                     await fetchCloudPhotos(); 
                   } 
                 }); 
               }} 
               className="px-10 py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-[2rem] flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-2xl shadow-rose-500/40 border border-white/10"
             >
               <Trash2 className="w-4.5 h-4.5" />
               {t('delete')}
             </button>
           </div>
         </div>
       )}
    </div>
  );
};