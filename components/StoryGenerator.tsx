
import React, { useState, useEffect } from 'react';
import { generateBedtimeStoryStream } from '../services/geminiService';
import { Wand2, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';
import { GenerateContentResponse } from '@google/genai';

interface StoryGeneratorProps {
  language: Language;
  defaultChildName?: string;
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ language, defaultChildName }) => {
  const [topic, setTopic] = useState('');
  const [childName, setChildName] = useState(defaultChildName || (language === 'mm' ? 'သားသား' : 'Baby'));
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);

  const t = (key: any) => getTranslation(language, key);

  useEffect(() => {
    if (defaultChildName) {
        setChildName(defaultChildName);
    }
  }, [defaultChildName]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    setStory(''); // Clear previous
    
    try {
        const streamResponse = await generateBedtimeStoryStream(topic, childName, language);
        
        for await (const chunk of streamResponse) {
             const c = chunk as GenerateContentResponse;
             if (c.text) {
                 setStory(prev => prev + c.text);
             }
        }
    } catch (error) {
        setStory(language === 'mm' ? "ခေတ္တခဏ ရပ်ဆိုင်းနေပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။" : "Something went wrong. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 dark:border-b dark:border-slate-700 p-6">
        <div className="flex items-center mb-2">
          <Sparkles className="text-indigo-400 w-5 h-5 mr-2" />
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">{t('story_card_title')}</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('story_card_desc')}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              {t('child_name')}
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-indigo-100 dark:border-slate-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500 focus:border-indigo-300 outline-none text-slate-700 dark:text-slate-100 bg-white/80 dark:bg-slate-700/50 transition-colors"
              placeholder={t('child_name_placeholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              {t('topic_label')}
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-indigo-100 dark:border-slate-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500 focus:border-indigo-300 outline-none text-slate-700 dark:text-slate-100 bg-white/80 dark:bg-slate-700/50 h-24 resize-none transition-colors"
              placeholder={t('topic_placeholder')}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !topic}
            className={`w-full py-3 rounded-xl flex items-center justify-center font-bold text-white transition-all transform active:scale-95 shadow-md
              ${loading || !topic 
                ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-500 hover:to-purple-500'
              }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t('thinking')}
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                {t('generate_btn')}
              </>
            )}
          </button>
        </div>
      </div>

      {story && (
        <div className="p-6 bg-white dark:bg-slate-800 animate-fade-in transition-colors">
          <div className="flex items-center mb-4 text-purple-600 dark:text-purple-400">
            <BookOpen className="w-5 h-5 mr-2" />
            <span className="font-bold">{t('result_title')}</span>
          </div>
          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none">
            <p className="text-slate-600 dark:text-slate-300 leading-loose whitespace-pre-line text-lg">
              {story}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
