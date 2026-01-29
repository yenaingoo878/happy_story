
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GrowthData, Language } from '../types';
// FIX: Import translations to correctly type the `t` function.
import { getTranslation, translations } from '../utils/translations';
import { analyzeGrowthData } from '../services/geminiService';

// FontAwesome Icon Bridge
const Sparkles = ({ className }: { className?: string }) => <i className={`fa-solid fa-wand-magic-sparkles flex items-center justify-center ${className}`} />;
const Loader2 = ({ className }: { className?: string }) => <i className={`fa-solid fa-spinner fa-spin flex items-center justify-center ${className}`} />;
const AlertCircle = ({ className }: { className?: string }) => <i className={`fa-solid fa-circle-exclamation flex items-center justify-center ${className}`} />;

interface GrowthChartProps {
  data: GrowthData[];
  language: Language;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({ data, language }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(false);
  // FIX: Provide a strong type for the translation key.
  const t = (key: keyof typeof translations) => getTranslation(language, key);

  const handleAnalyze = async () => {
      if (data.length === 0) return;
      setAnalyzing(true);
      setError(false);
      try {
        const result = await analyzeGrowthData(data, language);
        setAnalysis(result);
      } catch (err) {
        setError(true);
      } finally {
        setAnalyzing(false);
      }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center">
            <span className="w-2 h-6 bg-primary rounded-full mr-2"></span>
            {t('growth_tracker')}
          </h3>
          
          <button 
             onClick={handleAnalyze}
             disabled={analyzing || data.length === 0}
             className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center justify-center
                ${analyzing || data.length === 0 
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                }`}
          >
             {analyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin"/> : <Sparkles className="w-3 h-3 mr-1"/>}
             {analyzing ? t('analyzing') : t('analyze_btn')}
          </button>
      </div>
      
      <div style={{ width: '100%', height: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis 
              dataKey="month" 
              label={{ value: t('months_label'), position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} 
              stroke="#94a3b8"
              fontSize={12}
              tick={{fill: '#94a3b8'}}
            />
            <YAxis stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                color: '#1e293b'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line 
              type="monotone" 
              dataKey="height" 
              name={`${t('height_label')} (cm)`}
              stroke="#FF9AA2" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#FF9AA2', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="weight" 
              name={`${t('weight_label')} (kg)`}
              stroke="#C7CEEA" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#C7CEEA', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {(analysis || error) && (
          <div className={`mt-4 p-4 rounded-xl animate-fade-in border ${error ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-indigo-50 dark:bg-slate-700/50 border-indigo-100 dark:border-slate-600'}`}>
             <h4 className={`text-sm font-bold mb-1 flex items-center ${error ? 'text-rose-600' : 'text-indigo-800 dark:text-indigo-300'}`}>
                {error ? <AlertCircle className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {error ? t('delete_title') : t('ai_insight')}
             </h4>
             <p className={`text-xs leading-relaxed ${error ? 'text-rose-500' : 'text-indigo-700 dark:text-slate-300'}`}>
                 {error ? (language === 'mm' ? "AI ဆန်းစစ်မှု အဆင်မပြေပါ။ API Key စစ်ဆေးပါ။" : "Analysis failed. Please check your API Key.") : analysis}
             </p>
          </div>
      )}

      <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-4">
        {t('disclaimer')}
      </p>
    </div>
  );
};