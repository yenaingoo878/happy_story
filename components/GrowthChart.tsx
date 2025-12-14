// import React, { useState } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// import { GrowthData, Language } from '../types';
// import { getTranslation } from '../translations';
// import { analyzeGrowthData } from '../services/geminiService';
// import { Sparkles, Loader2 } from 'lucide-react';

// interface GrowthChartProps {
//   data: GrowthData[];
//   language: Language;
// }

// export const GrowthChart: React.FC<GrowthChartProps> = ({ data, language }) => {
//   const [analysis, setAnalysis] = useState<string>('');
//   const [analyzing, setAnalyzing] = useState(false);
//   const t = (key: any) => getTranslation(language, key);

//   const handleAnalyze = async () => {
//       setAnalyzing(true);
//       const result = await analyzeGrowthData(data, language);
//       setAnalysis(result);
//       setAnalyzing(false);
//   };

//   return (
//     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
//       <div className="flex justify-between items-center mb-6">
//           <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center">
//             <span className="w-2 h-6 bg-primary rounded-full mr-2"></span>
//             {t('growth_tracker')}
//           </h3>
          
//           <button 
//              onClick={handleAnalyze}
//              disabled={analyzing}
//              className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center"
//           >
//              {analyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin"/> : <Sparkles className="w-3 h-3 mr-1"/>}
//              {analyzing ? t('analyzing') : t('analyze_btn')}
//           </button>
//       </div>
      
//       {/* Explicit styling to prevent Recharts size calculation errors */}
//       <div style={{ width: '100%', height: 300, minHeight: 300 }}>
//         <ResponsiveContainer width="100%" height="100%" minWidth={0}>
//           <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
//             <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
//             <XAxis 
//               dataKey="month" 
//               label={{ value: t('months_label'), position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} 
//               stroke="#94a3b8"
//               fontSize={12}
//               tick={{fill: '#94a3b8'}}
//             />
//             <YAxis stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} />
//             <Tooltip 
//               contentStyle={{ 
//                 borderRadius: '12px', 
//                 border: 'none', 
//                 boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
//                 backgroundColor: 'rgba(255, 255, 255, 0.95)',
//                 color: '#1e293b'
//               }}
//             />
//             <Legend wrapperStyle={{ paddingTop: '10px' }} />
//             <Line 
//               type="monotone" 
//               dataKey="height" 
//               name={`${t('height_label')} (cm)`}
//               stroke="#FF9AA2" 
//               strokeWidth={3} 
//               dot={{ r: 4, fill: '#FF9AA2', strokeWidth: 2, stroke: '#fff' }}
//               activeDot={{ r: 6 }} 
//             />
//             <Line 
//               type="monotone" 
//               dataKey="weight" 
//               name={`${t('weight_label')} (kg)`}
//               stroke="#C7CEEA" 
//               strokeWidth={3} 
//               dot={{ r: 4, fill: '#C7CEEA', strokeWidth: 2, stroke: '#fff' }}
//               activeDot={{ r: 6 }}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>

//       {analysis && (
//           <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-700/50 rounded-xl animate-fade-in border border-indigo-100 dark:border-slate-600">
//              <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center">
//                 <Sparkles className="w-3 h-3 mr-1" />
//                 {t('ai_insight')}
//              </h4>
//              <p className="text-xs text-indigo-700 dark:text-slate-300 leading-relaxed">
//                  {analysis}
//              </p>
//           </div>
//       )}

//       <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-4">
//         {t('disclaimer')}
//       </p>
//     </div>
//   );
// };

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GrowthData, Language } from '../types';
import { getTranslation } from '../translations';
// --------------------------------------------------------------------------------------------------
// ပြောင်းလဲမှု (၁): generateGuidance ကို ထည့်သွင်းပါ။
import { analyzeGrowthData, generateGuidance } from '../services/geminiService';
// --------------------------------------------------------------------------------------------------
import { Sparkles, Loader2, ListChecks } from 'lucide-react';

// --------------------------------------------------------------------------------------------------
// ပြောင်းလဲမှု (၂): childAgeMonths နှင့် childGender ကို Props တွင် ထည့်သွင်းပါ။
interface GrowthChartProps {
    data: GrowthData[];
    language: Language;
    childAgeMonths: number; // App.tsx မှ တွက်ချက်ပြီး ပို့ပေးရန်
    childGender: 'male' | 'female'; // App.tsx မှ ပို့ပေးရန်
}
// --------------------------------------------------------------------------------------------------

export const GrowthChart: React.FC<GrowthChartProps> = ({ 
    data, 
    language, 
    // ပြောင်းလဲမှု (၃): Props မှ Destructure လုပ်ယူခြင်း
    childAgeMonths, 
    childGender 
}) => {
    // ပြောင်းလဲမှု (၄): Guidance အတွက် State အသစ် ထည့်သွင်းပါ။
    const [analysis, setAnalysis] = useState<string>('');
    const [guidance, setGuidance] = useState<string>('');
    const [analyzing, setAnalyzing] = useState(false);
    const t = (key: any) => getTranslation(language, key);

    // ပြောင်းလဲမှု (၅): handleAnalyze function ကို ပြင်ဆင်ခြင်း (Analysis & Guidance ခေါ်ဆိုခြင်း)
    const handleAnalyze = async () => {
        if (!data || data.length === 0 || childAgeMonths === 0) return;
        
        setAnalyzing(true);
        setAnalysis('');
        setGuidance('');
        
        try {
            // 1. Analysis Summary ကို ခေါ်ဆိုခြင်း (Title + Summary Sentence)
            const summaryResult = await analyzeGrowthData(
                data, 
                language, 
                childAgeMonths, 
                childGender
            );
            setAnalysis(summaryResult);
            
            // 2. Summary ကို အခြေခံ၍ Guidance ကို ခေါ်ဆိုခြင်း (Actionable List)
            const guidanceResult = await generateGuidance(
                data, 
                language, 
                childAgeMonths, 
                childGender,
                summaryResult // Summary ကို Guidance function သို့ ပို့ပေး
            );
            setGuidance(guidanceResult);

        } catch (error) {
            console.error("Analysis or Guidance failed:", error);
            setAnalysis(t('analysis_error')); // သင့်တွင် error message အတွက် translation key ရှိရပါမည်။
        }
        setAnalyzing(false);
    };

    // Analysis output ကို Title နှင့် Summary စာကြောင်း ခွဲထုတ်ခြင်း
    const analysisLines = analysis ? analysis.split('\n').filter(line => line.trim() !== '') : [];
    const analysisTitle = analysisLines[0] || '';
    const analysisSummarySentence = analysisLines.slice(1).join(' ') || '';

    // Guidance output ကို List အဖြစ် ခွဲထုတ်ခြင်း (နံပါတ်စဉ်ပါသော List အဖြစ် မျှော်လင့်ထားသည်)
    const guidanceList = guidance ? guidance.split('\n').filter(line => line.trim() !== '') : [];

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            {/* ... Chart Header နှင့် Button Code များ ... */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center">
                    <span className="w-2 h-6 bg-primary rounded-full mr-2"></span>
                    {t('growth_tracker')}
                </h3>
                
                <button 
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center"
                >
                    {analyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin"/> : <Sparkles className="w-3 h-3 mr-1"/>}
                    {analyzing ? t('analyzing') : t('analyze_btn')}
                </button>
            </div>
            
            {/* ... Chart Code များ ... */}
            <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        {/* ... Chart elements: CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line (height), Line (weight) ... */}
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                        <XAxis dataKey="month" label={{ value: t('months_label'), position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} />
                        <YAxis stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#1e293b' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="height" name={`${t('height_label')} (cm)`} stroke="#FF9AA2" strokeWidth={3} dot={{ r: 4, fill: '#FF9AA2', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="weight" name={`${t('weight_label')} (kg)`} stroke="#C7CEEA" strokeWidth={3} dot={{ r: 4, fill: '#C7CEEA', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ပြောင်းလဲမှု (၆): Analysis Summary ကို Title ဖြင့် ပြသခြင်း */}
            {analysis && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-700/50 rounded-xl animate-fade-in border border-indigo-100 dark:border-slate-600">
                    <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {analysisTitle || t('ai_analysis')} {/* Title ကို ပြသသည် */}
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-slate-300 leading-relaxed">
                        {analysisSummarySentence} {/* Summary Sentence ကို ပြသသည် */}
                    </p>
                </div>
            )}

            {/* ပြောင်းလဲမှု (၇): Guidance/Next Steps ကို ပြသခြင်း */}
            {guidance && guidanceList.length > 0 && (
                 <div className="mt-4 p-4 bg-green-50 dark:bg-slate-700/50 rounded-xl animate-fade-in border border-green-100 dark:border-slate-600">
                    <h4 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2 flex items-center">
                        <ListChecks className="w-3.5 h-3.5 mr-1.5" />
                        {t('next_steps_title')} {/* "Next Steps" သို့မဟုတ် "လုပ်ဆောင်ရန်အဆင့်များ" အတွက် translation key */}
                    </h4>
                    <ul className="list-inside space-y-1 text-xs text-green-700 dark:text-slate-300">
                        {guidanceList.map((item, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-green-600 dark:text-green-400 mr-2 flex-shrink-0">•</span>
                                <span className="leading-relaxed">{item.replace(/^\d+\.\s*/, '')}</span> {/* နံပါတ်စဉ်များကို ဖယ်ထုတ်၍ ပြသသည် */}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-4">
                {t('disclaimer')}
            </p>
        </div>
    );
};
