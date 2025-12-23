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
      className={`relative aspect-square overflow-hidden cursor-pointer active:scale-95 bg-slate-100 dark:bg-slate-800 transition-all duration-300 rounded-4xl ${isSelected ? 'ring-4 ring-primary ring-inset z-10' : ''}`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}
      
      <img 
        src={photo.thumbnailUrl} 
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        alt="Cloud Item" 
      />
      
      {isSelectionMode ? (
        <div className="absolute top-2.5 right-2.5 z-10">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 ${isSelected ? 'bg-primary border-primary text-white' : 'bg-black/20 border-white/50 text-transparent'}`}>
            <Check className="w-4 h-4 stroke-[3px]" />
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
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

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

  useEffect(() => {
    if (previewIndex !== null) {
        setIsPreviewLoading(true);
    }
  }, [previewIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (previewIndex === null) return;
        if (e.key === 'ArrowRight') {
            setPreviewIndex(prev => prev! < cloudPhotos.length - 1 ? prev! + 1 : 0);
        } else if (e.key === 'ArrowLeft') {
            setPreviewIndex(prev => prev! > 0 ? prev! - 1 : cloudPhotos.length - 1);
        } else if (e.key === 'Escape') {
            setPreviewIndex(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, cloudPhotos.length]);


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
       <div className="mb-8 space-y-8">
          <div className="text-center">
              <div className="flex items-center justify-center gap-3">
                  <ImageIcon className="w-7 h-7 text-slate-400" />
                  <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                      {t('gallery_title')}
                  </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-1.5">{t('gallery_subtitle')}</p>
          </div>

          <div className="flex bg-slate-800 p-1.5 rounded-full max-w-sm mx-auto border border-slate-700">
             <button 
                onClick={() => setActiveTab('LOCAL')}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'LOCAL' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-400'}`}
             >
                <HardDrive className="w-4 h-4" />
                {t('memories')}
             </button>
             <button 
                onClick={() => setActiveTab('CLOUD')}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'CLOUD' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-400'}`}
             >
                <Cloud className="w-4 h-4" />
                {language === 'mm' ? 'Cloud ပုံများ' : 'Cloud Photos'}
             </button>
          </div>
       </div>
       
       {activeTab === 'LOCAL' ? (
          <div>
             <div className="relative max-w-sm mx-auto group mb-8">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('search_placeholder')}
                    className="w-full pl-14 pr-5 py-4 bg-slate-800 border border-slate-700 rounded-full text-sm font-bold outline-none focus:ring-2 focus:ring-slate-500 transition-all text-white placeholder:text-slate-500"
                />
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMemories.map((memory) => (
                <div 
                    key={memory.id} 
                    onClick={() => onMemoryClick(memory)}
                    className="group relative rounded-4xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg border border-white dark:border-slate-700 cursor-pointer aspect-square active:scale-95 bg-white dark:bg-slate-800"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-5 pointer-events-none">
                        <h3 className="text-white text-base font-bold truncate">{memory.title}</h3>
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
                      <div className="flex items-center justify-between px-3 py-1">
                         <div className="flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5 text-sky-400" />
                           <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">{date}</h3>
                         </div>
                          {isSelectionMode && (
                              <button 
                                onClick={() => {
                                    const photoPathsInGroup = new Set(photos.map(p => p.path));
                                    const selectedInGroup = [...selectedPaths].filter(p => photoPathsInGroup.has(p));
                                    const newSelected = new Set(selectedPaths);
                                    if (selectedInGroup.length === photos.length) { // all selected, so deselect all in group
                                        photoPathsInGroup.forEach(p => newSelected.delete(p));
                                    } else { // not all selected, so select all in group
                                        photoPathsInGroup.forEach(p => newSelected.add(p));
                                    }
                                    setSelectedPaths(newSelected);
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-primary/70"
                              >
                                {language === 'mm' ? 'အားလုံးရွေးမည်' : 'Select All'}
                              </button>
                          )}
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
       
       {activeTab === 'CLOUD' && cloudPhotos.length > 0 && (
        <div className="fixed top-6 right-6 z-50">
           <button 
            onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedPaths(new Set());
            }}
            className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isSelectionMode ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}
            >
            {isSelectionMode ? t('cancel_btn') : (language === 'mm' ? 'ရွေးမည်' : 'Select')}
            </button>
        </div>
       )}
       
       {isSelectionMode && activeTab === 'CLOUD' && (
         <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-slide-up">
            <div className="bg-slate-800/80 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4 pl-2">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest active:scale-90">
                        {selectedPaths.size === cloudPhotos.length ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                        {language === 'mm' ? 'အားလုံး' : 'All'}
                    </button>
                    <div className="h-4 w-px bg-slate-700" />
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewIndex(null)}>
             <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             
             <div 
                className="relative bg-slate-900 w-full max-w-md md:max-w-lg rounded-4xl overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[90vh]" 
                onClick={(e) => e.stopPropagation()}
             >
                <div className="relative h-64 sm:h-80 bg-slate-800 shrink-0 flex items-center justify-center">
                    {isPreviewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center text-primary z-10">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    )}
                    <img 
                        key={previewIndex}
                        src={cloudPhotos[previewIndex].previewUrl} 
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isPreviewLoading ? 'opacity-0' : 'opacity-100'}`}
                        alt="Full Preview"
                        onLoad={() => setIsPreviewLoading(false)}
                    />
                    
                    <button 
                        onClick={() => setPreviewIndex(null)}
                        className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {cloudPhotos.length > 1 && (
                        <>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev! > 0 ? prev! - 1 : cloudPhotos.length - 1)}} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
                            <ChevronLeft className="w-6 h-6"/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev! < cloudPhotos.length - 1 ? prev! + 1 : 0)}} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
                            <ChevronRight className="w-6 h-6"/>
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/30 text-white text-xs font-bold rounded-full backdrop-blur-md">
                            {previewIndex + 1} / {cloudPhotos.length}
                        </div>
                        </>
                    )}
                </div>

                <div className="p-6 overflow-y-auto grow">
                    <h2 className="text-2xl font-black text-white leading-tight mb-1 truncate">
                        {(cloudPhotos[previewIndex]?.path.split('/').pop() || 'Photo').substring(14)}
                    </h2>
                    
                    <div className="flex items-center text-slate-500 text-sm font-bold mb-6">
                        <Calendar className="w-4 h-4 mr-2" />
                        {getPhotoDate(cloudPhotos[previewIndex]?.path)?.toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (previewIndex === null) return;
                                const photo = cloudPhotos[previewIndex];
                                const response = await fetch(photo.url);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = photo.path.split('/').pop() || 'photo.jpg';
                                link.click(); window.URL.revokeObjectURL(url);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sky-900/20 text-sky-300 rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                            <Download className="w-4 h-4" /> Download
                        </button>
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
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
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-900/20 text-rose-500 rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};