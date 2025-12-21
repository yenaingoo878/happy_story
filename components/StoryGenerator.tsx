
import React, { useState, useEffect } from 'react';
import { generateBedtimeStoryStream } from '../services/geminiService';
import { Wand2, BookOpen, Sparkles, Loader2, Save, Heart, CheckCircle2 } from 'lucide-react';
import { Language, Story } from '../types';
import { getTranslation } from '../utils/translations';
import { GenerateContentResponse } from '@google/genai';
import { DataService } from '../lib/db';

interface StoryGeneratorProps {
  language: Language;
  activeProfileId?: string;
  defaultChildName?: string;
  onSaveComplete?: () => void;
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ language, activeProfileId, defaultChildName, onSaveComplete }) => {
  const [topic, setTopic] = useState('');
  const [childName, setChildName] = useState(defaultChildName || (language === 'mm' ? 'သားသား' : 'Baby'));
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const t = (key: any) => getTranslation(language, key);

  useEffect(() => {
    if (defaultChildName) setChildName(defaultChildName);
  }, [defaultChildName]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setStory('');
    try {
        const streamResponse = await generateBedtimeStoryStream(topic, childName, language);
        for await (const chunk of streamResponse) {
             const c = chunk as GenerateContentResponse;
             if (c.text) setStory(prev => prev + c.text);
        }
    } catch (error) {
        setStory(language === 'mm' ? "ခေတ္တခဏ ရပ်ဆိုင်းနေပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။" : "Something went wrong. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleSaveToStories = async () => {
    if (!story || !activeProfileId) return;
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newStory: Story = {
        id: crypto.randomUUID(),
        childId: activeProfileId,
        title: language === 'mm' ? `ပုံပြင်လေး - ${topic || 'အိပ်ရာဝင်'}` : `Story - ${topic || 'Bedtime'}`,
        topic: topic,
        content: story,
        date: today,
        synced: 0
      };
      await DataService.addStory(newStory);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSaveComplete) onSaveComplete();
      }, 1500);
    } catch (error) {
      console.error("Failed to save story", error);
      alert("Failed to save story.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors max-w-2xl mx-auto relative">
      {showSuccess && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center p-6 animate-fade-in bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 animate-zoom-in border border-slate-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">{language === 'mm' ? 'ပုံပြင်စာအုပ် သိမ်းဆည်းပြီး' : 'Story Book Saved'}</h3>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 dark:border-b dark:border-slate-700 p-6">
        <div className="flex items-center mb-2"><Sparkles className="text-indigo-400 w-5 h-5 mr-2" /><h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">{t('story_card_title')}</h2></div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('story_card_desc')}</p>
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{t('child_name')}</label>
            <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-indigo-100 dark:border-slate-600 outline-none text-slate-700 dark:text-slate-100 bg-white/80 dark:bg-slate-700/50" placeholder={t('child_name_placeholder')} />
          </div>
          <div><label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{t('topic_label')}</label>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-indigo-100 dark:border-slate-600 outline-none text-slate-700 dark:text-slate-100 bg-white/80 dark:bg-slate-700/50 h-24 resize-none" placeholder={t('topic_placeholder')} />
          </div>
          <button onClick={handleGenerate} disabled={loading || !topic} className={`w-full py-3 rounded-xl flex items-center justify-center font-bold text-white transition-all shadow-md ${loading || !topic ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />{t('thinking')}</> : <><Wand2 className="w-5 h-5 mr-2" />{t('generate_btn')}</>}
          </button>
        </div>
      </div>
      {story && (
        <div className="p-6 bg-white dark:bg-slate-800 animate-fade-in transition-colors">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center text-purple-600 dark:text-purple-400"><BookOpen className="w-5 h-5 mr-2" /><span className="font-bold">{t('result_title')}</span></div>
            <button onClick={handleSaveToStories} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {language === 'mm' ? 'ပုံပြင်စာအုပ်အဖြစ်သိမ်းမည်' : 'Save as Story Book'}
            </button>
          </div>
          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-300 leading-loose whitespace-pre-line text-lg font-serif">{story}</p>
          </div>
        </div>
      )}
    </div>
  );
};
