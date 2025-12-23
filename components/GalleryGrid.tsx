import React, { useState, useMemo, useEffect } from 'react';
import { Memory, Language } from '../types';
import { Image as ImageIcon, Search, Cloud, HardDrive, Loader2, X, Check, Trash2, Download, CheckSquare, Square } from 'lucide-react';
import { getTranslation } from '../utils/translations';
import { DataService, CloudPhoto } from '../lib/db';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick }) => {
  const t = (key: any) => getTranslation(language, key);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LOCAL' | 'CLOUD'>('LOCAL');
  const [cloudPhotos, setCloudPhotos] = useState<CloudPhoto[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const activeProfileId = memories[0]?.childId || '';

  useEffect(() => {
    if (activeTab === 'CLOUD' && activeProfileId) {
      fetchCloudPhotos();
    }
    // Reset selection mode when switching tabs
    setIsSelectionMode(false);
    setSelectedPaths(new Set());
  }, [activeTab, activeProfileId]);

  const fetchCloudPhotos = async () => {
    setIsLoadingCloud(true);
    const photos = await DataService.getCloudPhotos(activeProfileId);
    setCloudPhotos(photos);
    setIsLoadingCloud(false);
  };

  const toggleSelection = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const toggleSelectAll = () => {
    if (selectedPaths.size === cloudPhotos.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(cloudPhotos.map(p => p.path)));
    }
  };

  const handleDownloadSelected = async () => {
    const photosToDownload = cloudPhotos.filter(p => selectedPaths.has(p.path));
    
    for (const photo of photosToDownload) {
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = photo.path.split('/').pop() || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to download photo:", photo.path, err);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPaths.size === 0) return;
    const confirmMsg = language === 'mm' 
      ? `ရွေးချယ်ထားသော ဓာတ်ပုံ ${selectedPaths.size} ပုံအား Cloud ပေါ်မှ ဖျက်ရန် သေချာပါသလား?` 
      : `Are you sure you want to delete ${selectedPaths.size} selected photos from the cloud?`;
    
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    // Fix: Use spread operator to ensure pathsArray is inferred as string[] from Set<string>
    const pathsArray = [...selectedPaths];
    const result = await DataService.deleteCloudPhotos(pathsArray);
    
    if (result.success) {
      setCloudPhotos(prev => prev.filter(p => !selectedPaths.has(p.path)));
      setSelectedPaths(new Set());
      setIsSelectionMode(false);
    } else {
      alert(language === 'mm' ? "ဖျက်၍မရပါ။ နောက်မှပြန်ကြိုးစားပါ။" : "Failed to delete photos. Please try again.");
    }
    setIsDeleting(false);
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
            
            {activeTab === 'CLOUD' && cloudPhotos.length > 0 && (
                <button 
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedPaths(new Set());
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isSelectionMode ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  {isSelectionMode ? t('cancel_btn') : (language === 'mm' ? 'ရွေးချယ်မည်' : 'Select')}
                </button>
            )}
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
          
          {/* Action Bar for Selection Mode */}
          {isSelectionMode && activeTab === 'CLOUD' && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-between animate-slide-up">
                <div className="flex items-center gap-3">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-black text-slate-500">
                        {selectedPaths.size === cloudPhotos.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                        {language === 'mm' ? 'အားလုံး' : 'All'}
                    </button>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        {selectedPaths.size} {language === 'mm' ? 'ပုံ ရွေးထားသည်' : 'Selected'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDownloadSelected}
                        disabled={selectedPaths.size === 0}
                        className="p-3 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-xl active:scale-90 disabled:opacity-30 transition-all"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedPaths.size === 0 || isDeleting}
                        className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl active:scale-90 disabled:opacity-30 transition-all"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
          )}

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
                   {cloudPhotos.map((photo, index) => {
                      const isSelected = selectedPaths.has(photo.path);
                      return (
                        <div 
                           key={index} 
                           onClick={() => isSelectionMode ? toggleSelection(photo.path) : setPreviewUrl(photo.url)}
                           className={`relative rounded-[28px] overflow-hidden shadow-sm border cursor-pointer aspect-square active:scale-95 bg-white dark:bg-slate-800 group transition-all duration-300 ${isSelected ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-slate-900 border-primary' : 'border-white dark:border-slate-700'}`}
                        >
                           <img src={photo.url} className={`w-full h-full object-cover transition-transform duration-700 ${!isSelectionMode && 'md:group-hover:scale-110'} ${isSelected ? 'opacity-70 scale-90 rounded-[24px]' : 'opacity-100'}`} alt={`Cloud Photo ${index}`} />
                           
                           {/* Selection Overlay */}
                           {isSelectionMode ? (
                              <div className="absolute top-3 right-3">
                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 transition-all ${isSelected ? 'bg-primary border-primary text-white scale-110' : 'bg-white/40 border-white text-transparent scale-100'}`}>
                                    <Check className="w-4 h-4" />
                                 </div>
                              </div>
                           ) : (
                              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <div className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                                    <Cloud className="w-3.5 h-3.5" />
                                 </div>
                              </div>
                           )}
                        </div>
                      );
                   })}
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
       {previewUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setPreviewUrl(null)}>
             <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[210]">
                <X className="w-6 h-6" />
             </button>
             <img src={previewUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in" alt="Preview" />
          </div>
       )}
    </div>
  );
};