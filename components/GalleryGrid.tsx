import React, { useState, useMemo, useEffect } from 'react';
import { Memory, Language } from '../types';
import { Image as ImageIcon, Search, Cloud, HardDrive, Loader2, X, Check, Trash2, Download, CheckSquare, Square, ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react';
import { getTranslation } from '../utils/translations';
import { DataService, CloudPhoto } from '../lib/db';

interface GalleryGridProps {
  memories: Memory[];
  language: Language;
  onMemoryClick: (memory: Memory) => void;
}

interface PhotoItemProps {
  photo: CloudPhoto;
  isSelected: boolean;
  isSelectionMode: boolean;
  onClick: () => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ photo, isSelected, isSelectionMode, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      onClick={onClick}
      className={`relative aspect-square overflow-hidden cursor-pointer active:scale-95 bg-slate-200 dark:bg-slate-800 transition-all duration-300 ${isSelected ? 'ring-4 ring-primary ring-inset z-10' : ''}`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}
      
      {/* Background blur to fill squares for non-square photos in grid */}
      <img 
        src={photo.thumbnailUrl} 
        className={`absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110 transition-opacity duration-700 ${isLoaded ? 'opacity-40' : 'opacity-0'}`} 
        alt="Ambient"
      />

      <img 
        src={photo.thumbnailUrl} 
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`relative w-full h-full object-contain transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isSelected ? 'scale-90 rounded-lg' : 'scale-100'}`} 
        alt="Cloud Item" 
      />
      
      {isSelectionMode ? (
        <div className="absolute top-1.5 right-1.5 z-10">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg border transition-all duration-300 ${isSelected ? 'bg-primary border-primary text-white' : 'bg-black/20 border-white/50 text-transparent'}`}>
            <Check className="w-3 h-3 stroke-[3px]" />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/0 active:bg-black/10 transition-colors" />
      )}
    </div>
  );
};

export const GalleryGrid: React.FC<GalleryGridProps> = ({ memories, language, onMemoryClick }) => {
  const t = (key: any) => getTranslation(language, key);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LOCAL' | 'CLOUD'>('LOCAL');
  const [cloudPhotos, setCloudPhotos] = useState<CloudPhoto[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const activeProfileId = memories[0]?.childId || '';

  useEffect(() => {
    if (activeTab === 'CLOUD' && activeProfileId) {
      fetchCloudPhotos();
    }
    setIsSelectionMode(false);
    setSelectedPaths(new Set());
  }, [activeTab, activeProfileId]);

  const fetchCloudPhotos = async () => {
    setIsLoadingCloud(true);
    const photos = await DataService.getCloudPhotos(activeProfileId);
    setCloudPhotos(photos);
    setIsLoadingCloud(false);
  };

  const getPhotoDate = (path: string) => {
    const filename = path.split('/').pop() || '';
    const timestamp = parseInt(filename.split('_')[0]);
    if (isNaN(timestamp)) return null;
    return new Date(timestamp);
  };

  const groupedCloudPhotos = useMemo<Record<string, CloudPhoto[]>>(() => {
    const groups: Record<string, CloudPhoto[]> = {};
    cloudPhotos.forEach(photo => {
      const date = getPhotoDate(photo.path);
      let dateKey = language === 'mm' ? 'အခြား' : 'Other';
      
      if (date) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          dateKey = language === 'mm' ? 'ယနေ့' : 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          dateKey = language === 'mm' ? 'မနေ့က' : 'Yesterday';
        } else {
          dateKey = date.toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', { 
            month: 'long', 
            year: 'numeric',
            day: 'numeric'
          });
        }
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(photo);
    });
    return groups;
  }, [cloudPhotos, language]);

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
      : `Are you sure you want to delete ${selectedPaths.size} selected photos?`;
    
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    const pathsArray = [...selectedPaths];
    const result = await DataService.deleteCloudPhotos(pathsArray);
    
    if (result.success) {
      setCloudPhotos(prev => prev.filter(p => !selectedPaths.has(p.path)));
      setSelectedPaths(new Set());
      setIsSelectionMode(false);
    } else {
      alert(language === 'mm' ? "ဖျက်၍မရပါ။ နောက်မှပြန်ကြိုးစားပါ။" : "Failed to delete photos.");
    }
    setIsDeleting(false);
  };

  const filteredMemories = useMemo(() => {
     if (!searchTerm.trim()) return memories;
     const lowerTerm = searchTerm.toLowerCase();
     return memories.filter(mem => 
        mem.title.toLowerCase().includes(lowerTerm) ||
        (mem.tags && mem.tags.some(tag => tag.toLowerCase().includes(lowerTerm)))
     );
  }, [memories, searchTerm]);

  return (
    <div className="pb-32 animate-fade-in relative">
       <div className="mb-6 space-y-5 px-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
                  <ImageIcon className="w-6 h-6 mr-2.5 text-rose-400" />
                  {t('gallery_title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{t('gallery_subtitle')}</p>
            </div>
            
            <div className="flex gap-2">
                {activeTab === 'CLOUD' && (
                    <button 
                        onClick={fetchCloudPhotos}
                        disabled={isLoadingCloud}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl active:scale-90 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingCloud ? 'animate-spin' : ''}`} />
                    </button>
                )}
                {activeTab === 'CLOUD' && cloudPhotos.length > 0 && (
                    <button 
                    onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedPaths(new Set());
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isSelectionMode ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                    {isSelectionMode ? t('cancel_btn') : (language === 'mm' ? 'ရွေးမည်' : 'Select')}
                    </button>
                )}
            </div>
          </div>

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
       </div>
       
       {activeTab === 'LOCAL' ? (
          <div className="px-2">
             <div className="relative max-w-md mx-auto group mb-6">
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

             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                        loading="lazy"
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
          </div>
       ) : (
          <div className="space-y-8 pb-20">
             {isLoadingCloud ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                   <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Optimizing cloud view...</p>
                </div>
             ) : cloudPhotos.length > 0 ? (
                (Object.entries(groupedCloudPhotos) as [string, CloudPhoto[]][]).map(([date, photos]) => (
                   <div key={date} className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-1">
                         <Calendar className="w-3.5 h-3.5 text-sky-400" />
                         <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">{date}</h3>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[2px]">
                         {photos.map((photo) => {
                            const isSelected = selectedPaths.has(photo.path);
                            const photoIndex = cloudPhotos.findIndex(p => p.path === photo.path);
                            return (
                                <PhotoItem 
                                  key={photo.path}
                                  photo={photo}
                                  isSelected={isSelected}
                                  isSelectionMode={isSelectionMode}
                                  onClick={() => isSelectionMode ? toggleSelection(photo.path) : setPreviewIndex(photoIndex)}
                                />
                            );
                         })}
                      </div>
                   </div>
                ))
             ) : (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-5 opacity-40">
                   <Cloud className="w-14 h-14" />
                   <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest">{language === 'mm' ? 'Cloud ပေါ်တွင် ဓာတ်ပုံမရှိသေးပါ' : 'No cloud photos found'}</p>
                   </div>
                </div>
             )}
          </div>
       )}
       
       {isSelectionMode && activeTab === 'CLOUD' && (
         <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-slide-up">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-4 rounded-[32px] shadow-2xl border border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-4 pl-2">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest active:scale-90">
                        {selectedPaths.size === cloudPhotos.length ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                        {language === 'mm' ? 'အားလုံး' : 'All'}
                    </button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] font-black text-primary">
                        {selectedPaths.size} {language === 'mm' ? 'ပုံ ရွေးထားသည်' : 'Selected'}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadSelected}
                        disabled={selectedPaths.size === 0}
                        className="p-3 bg-sky-500 text-white rounded-2xl active:scale-90 disabled:opacity-30 shadow-lg shadow-sky-500/20"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedPaths.size === 0 || isDeleting}
                        className="p-3 bg-rose-500 text-white rounded-2xl active:scale-90 disabled:opacity-30 shadow-lg shadow-rose-500/20"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
         </div>
       )}

       {previewIndex !== null && (
          <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in overflow-hidden">
             {/* Background Immersive Glow */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <img 
                  src={cloudPhotos[previewIndex].previewUrl} 
                  className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-40 scale-125"
                  alt="Ambient"
                />
             </div>

             <div className="flex items-center justify-between p-6 z-20">
                <div className="text-white/60 text-[10px] font-black uppercase tracking-widest bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                   {previewIndex + 1} / {cloudPhotos.length}
                </div>
                <button 
                   onClick={() => setPreviewIndex(null)}
                   className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors active:scale-90 backdrop-blur-md"
                >
                   <X className="w-6 h-6" />
                </button>
             </div>

             <div className="flex-1 relative flex items-center justify-center z-10 px-4">
                {cloudPhotos[previewIndex] && (
                    <img 
                      src={cloudPhotos[previewIndex].previewUrl} 
                      className="max-w-full max-h-[85vh] object-contain animate-zoom-in shadow-2xl rounded-sm" 
                      alt="Full Preview" 
                    />
                )}
                
                {cloudPhotos.length > 1 && (
                   <>
                      <button 
                         onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev! > 0 ? prev! - 1 : cloudPhotos.length - 1)}}
                         className="absolute left-4 p-5 bg-black/10 text-white/50 hover:text-white rounded-full active:scale-90 transition-all backdrop-blur-sm"
                      >
                         <ChevronLeft className="w-7 h-7" />
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev! < cloudPhotos.length - 1 ? prev! + 1 : 0)}}
                         className="absolute right-4 p-5 bg-black/10 text-white/50 hover:text-white rounded-full active:scale-90 transition-all backdrop-blur-sm"
                      >
                         <ChevronRight className="w-7 h-7" />
                      </button>
                   </>
                )}
             </div>

             <div className="p-8 flex justify-center gap-6 z-20 pb-12">
                <button 
                   onClick={async () => {
                      if (previewIndex === null) return;
                      const photo = cloudPhotos[previewIndex];
                      const response = await fetch(photo.url);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = photo.path.split('/').pop() || 'photo.jpg';
                      link.click();
                      window.URL.revokeObjectURL(url);
                   }}
                   className="flex items-center gap-3 px-6 py-4 bg-white/10 text-white rounded-[24px] backdrop-blur-xl border border-white/10 active:scale-95 transition-all shadow-xl"
                >
                   <Download className="w-5 h-5"/>
                   <span className="text-[11px] font-black uppercase tracking-widest">Download</span>
                </button>
                <button 
                   onClick={async () => {
                      if (previewIndex === null) return;
                      if (!window.confirm(language === 'mm' ? 'ဤဓာတ်ပုံအား ဖျက်ရန် သေချာပါသလား?' : 'Delete this photo?')) return;
                      const result = await DataService.deleteCloudPhotos([cloudPhotos[previewIndex].path]);
                      if (result.success) {
                         const nextPhotos = cloudPhotos.filter((_, i) => i !== previewIndex);
                         setCloudPhotos(nextPhotos);
                         if (nextPhotos.length === 0) setPreviewIndex(null);
                         else setPreviewIndex(prev => prev! >= nextPhotos.length ? nextPhotos.length - 1 : prev);
                      }
                   }}
                   className="flex items-center gap-3 px-6 py-4 bg-rose-500/20 text-rose-400 rounded-[24px] backdrop-blur-xl border border-rose-500/10 active:scale-95 transition-all shadow-xl"
                >
                   <Trash2 className="w-5 h-5"/>
                   <span className="text-[11px] font-black uppercase tracking-widest">Delete</span>
                </button>
             </div>
          </div>
       )}
    </div>
  );
};