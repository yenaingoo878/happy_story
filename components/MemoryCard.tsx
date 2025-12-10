import React from 'react';
import { Memory } from '../types';
import { Calendar, Tag } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  // Helper to ensure dd/mm/yyyy format
  const formatDate = (isoDate: string) => {
     if (!isoDate) return '';
     const parts = isoDate.split('-');
     if (parts.length !== 3) return isoDate;
     return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-slate-100 dark:border-slate-700 mb-6">
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={memory.imageUrl} 
          alt={memory.title} 
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-3 text-white">
            <h3 className="font-bold text-lg drop-shadow-md">{memory.title}</h3>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center text-slate-400 dark:text-slate-500 text-sm mb-3 space-x-4">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDate(memory.date)}</span>
          </div>
        </div>
        
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
          {memory.description}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {memory.tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/30 dark:bg-secondary/20 text-teal-800 dark:text-teal-200">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};