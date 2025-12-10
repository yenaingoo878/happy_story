import React from 'react';
import { Memory } from '../types';
import { X, Calendar, Tag } from 'lucide-react';

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({ memory, onClose }) => {
  if (!memory) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-zoom-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative h-72 sm:h-80 bg-slate-100 dark:bg-slate-800">
          <img 
            src={memory.imageUrl} 
            alt={memory.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 p-6 text-white w-full">
            <h2 className="text-2xl font-bold leading-tight mb-2 drop-shadow-sm">{memory.title}</h2>
            <div className="flex items-center text-white/90 text-sm font-medium">
              <Calendar className="w-4 h-4 mr-2" />
              {memory.date}
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[40vh] overflow-y-auto">
          <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6 whitespace-pre-wrap">
            {memory.description}
          </p>

          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {memory.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};