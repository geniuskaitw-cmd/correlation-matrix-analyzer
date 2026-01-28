import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataConfig } from './components/DataConfig';
import { CorrelationMatrix } from './components/CorrelationMatrix';
import { ParsedData, VariableData, Matrix } from './types';
import { generateCorrelationMatrix } from './utils/statistics';
import { BarChart3, RefreshCw } from 'lucide-react';

function App() {
  const [step, setStep] = useState<'upload' | 'config' | 'result'>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [matrix, setMatrix] = useState<Matrix | null>(null);

  const handleDataLoaded = (data: ParsedData, name: string) => {
    setParsedData(data);
    setFileName(name);
    setStep('config');
  };

  const handleAnalyze = (variables: VariableData[]) => {
    // Perform calculation
    const result = generateCorrelationMatrix(variables);
    setMatrix(result);
    setStep('result');
  };

  const handleReset = () => {
    setParsedData(null);
    setFileName("");
    setMatrix(null);
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              相關係數分析器
            </h1>
          </div>
          
          {step !== 'upload' && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
            >
              <RefreshCw className="w-4 h-4" />
              重新開始
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Step Indicator (Optional visual cue) */}
        <div className="flex items-center justify-center mb-10 text-sm font-medium text-slate-400">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : 'text-slate-600'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'upload' ? 'bg-blue-100' : 'bg-slate-200'}`}>1</span>
            上傳檔案
          </div>
          <div className="w-12 h-px bg-slate-300 mx-4"></div>
          <div className={`flex items-center gap-2 ${step === 'config' ? 'text-blue-600' : step === 'result' ? 'text-slate-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'config' ? 'bg-blue-100' : 'bg-slate-200'}`}>2</span>
            選擇欄位
          </div>
          <div className="w-12 h-px bg-slate-300 mx-4"></div>
          <div className={`flex items-center gap-2 ${step === 'result' ? 'text-blue-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'result' ? 'bg-blue-100' : 'bg-slate-200'}`}>3</span>
            分析結果
          </div>
        </div>

        {/* Views */}
        <div className="transition-all duration-500 ease-in-out">
          {step === 'upload' && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-800 mb-4">輕鬆探索數據間的關聯</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  上傳您的 Excel 或 CSV 報表，自動計算各指標（如營收、人數、押注量）之間的相關係數矩陣。
                </p>
              </div>
              <FileUpload onDataLoaded={handleDataLoaded} />
              
              <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  { title: '拖曳上傳', desc: '支援 .xlsx, .xls 與 .csv 格式', icon: '📂' },
                  { title: '設定變數', desc: '指定哪一欄是名稱，自動抓取數值', icon: '⚙️' },
                  { title: '視覺化圖表', desc: '以熱圖快速識別正負相關性', icon: '📊' },
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center">
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'config' && parsedData && (
            <DataConfig 
              rawData={parsedData} 
              onAnalyze={handleAnalyze} 
              onReset={handleReset}
            />
          )}

          {step === 'result' && matrix && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  分析報告：<span className="text-blue-600">{fileName}</span>
                </h2>
              </div>
              <CorrelationMatrix matrix={matrix} />
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <strong>解讀指南：</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>接近 <span className="font-bold text-red-600">+1.0</span>：強烈正相關（兩者同步增長）。</li>
                  <li>接近 <span className="font-bold text-blue-600">-1.0</span>：強烈負相關（一增一減）。</li>
                  <li>接近 <span className="font-bold text-slate-600">0</span>：無明顯線性關係。</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;