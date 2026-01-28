import React, { useState, useMemo } from 'react';
import { ParsedData, VariableData } from '../types';
import { ArrowRight, Settings2, Info, CheckSquare, Square } from 'lucide-react';

interface DataConfigProps {
  rawData: ParsedData;
  onAnalyze: (variables: VariableData[]) => void;
  onReset: () => void;
}

export const DataConfig: React.FC<DataConfigProps> = ({ rawData, onAnalyze, onReset }) => {
  const rows = rawData.rows;
  const [previewLimit] = useState(8);

  // Detect if first row looks like a header (mostly strings, no numbers)
  const detectHeaderRow = useMemo(() => {
    if (rows.length === 0) return false;
    const firstRow = rows[0];
    let stringCount = 0;
    let numberCount = 0;
    
    firstRow.forEach((cell: unknown) => {
      if (cell === null || cell === undefined) return;
      if (typeof cell === 'string' && isNaN(parseFloat(cell))) {
        stringCount++;
      } else if (typeof cell === 'number' || !isNaN(parseFloat(String(cell)))) {
        numberCount++;
      }
    });
    
    // If more than 60% are strings, likely a header
    return stringCount > 0 && stringCount >= numberCount;
  }, [rows]);

  const [hasHeaderRow, setHasHeaderRow] = useState(detectHeaderRow);
  
  // Calculate headers and data rows based on header setting
  const { headers, dataRows } = useMemo(() => {
    if (hasHeaderRow && rows.length > 0) {
      return {
        headers: rows[0].map((h: unknown) => String(h ?? '')),
        dataRows: rows.slice(1)
      };
    }
    // Generate column letters as headers
    const maxCols = Math.max(...rows.slice(0, 10).map(r => r.length));
    return {
      headers: Array.from({ length: maxCols }, (_, i) => `欄位 ${String.fromCharCode(65 + i)}`),
      dataRows: rows
    };
  }, [rows, hasHeaderRow]);

  // Selected columns for analysis (by index)
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(() => {
    // Default: select all columns that have numeric data
    const numericCols = new Set<number>();
    const checkRows = (hasHeaderRow ? rows.slice(1) : rows).slice(0, 20);
    
    headers.forEach((_, colIdx) => {
      let numericCount = 0;
      checkRows.forEach(row => {
        const cell = row[colIdx];
        if (typeof cell === 'number' || (typeof cell === 'string' && !isNaN(parseFloat(cell)))) {
          numericCount++;
        }
      });
      // If more than 30% of sampled rows have numeric values, include this column
      if (numericCount > checkRows.length * 0.3) {
        numericCols.add(colIdx);
      }
    });
    
    return numericCols;
  });

  const toggleColumn = (colIdx: number) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(colIdx)) {
        next.delete(colIdx);
      } else {
        next.add(colIdx);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedColumns(new Set(headers.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedColumns(new Set());
  };

  const getColLetter = (i: number) => String.fromCharCode(65 + i);

  const handleAnalyze = () => {
    if (selectedColumns.size < 2) {
      alert("請至少選擇 2 個欄位進行分析");
      return;
    }

    const variables: VariableData[] = [];
    
    // Each selected column becomes a variable
    selectedColumns.forEach(colIdx => {
      const values: number[] = [];
      
      dataRows.forEach(row => {
        const cell = row[colIdx];
        if (typeof cell === 'number') {
          values.push(cell);
        } else if (typeof cell === 'string') {
          const parsed = parseFloat(cell);
          if (!isNaN(parsed)) values.push(parsed);
          else values.push(NaN); // Placeholder to maintain alignment
        } else {
          values.push(NaN); // Placeholder
        }
      });

      // Only add if we have at least 2 valid data points
      const validCount = values.filter(v => !isNaN(v)).length;
      if (validCount >= 2) {
        variables.push({
          name: headers[colIdx] || `欄位 ${getColLetter(colIdx)}`,
          values: values
        });
      }
    });

    if (variables.length < 2) {
      alert("選擇的欄位中，有效數值資料不足。請確認至少有 2 個欄位包含數值。");
      return;
    }

    onAnalyze(variables);
  };

  const maxCols = Math.min(headers.length, 15);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              設定資料結構
            </h2>
            <p className="text-slate-500 mt-1">
              勾選要進行相關性分析的欄位，每個欄位會被視為一個變數。
            </p>
          </div>
          <button 
            onClick={onReset}
            className="text-sm text-slate-500 hover:text-red-500 underline decoration-slate-300"
          >
            重新上傳
          </button>
        </div>

        {/* Header Row Toggle */}
        <div className="mb-4 flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHeaderRow}
              onChange={(e) => setHasHeaderRow(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">第一列是標題列</span>
          </label>
          <span className="text-xs text-slate-400">
            {hasHeaderRow ? `(已偵測到 ${headers.filter(h => h).length} 個欄位標題)` : '(將使用欄位代號 A, B, C...)'}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={selectAll}
            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            全選
          </button>
          <button
            onClick={deselectAll}
            className="text-xs px-2 py-1 text-slate-500 hover:bg-slate-100 rounded"
          >
            取消全選
          </button>
          <span className="text-xs text-slate-400 ml-2">
            已選擇 {selectedColumns.size} 個欄位
          </span>
        </div>

        {/* Data Preview Table */}
        <div className="overflow-x-auto border rounded-lg border-slate-200">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center font-mono text-slate-400 sticky left-0 bg-slate-50">#</th>
                {headers.slice(0, maxCols).map((header, colIdx) => {
                  const isSelected = selectedColumns.has(colIdx);
                  return (
                    <th 
                      key={colIdx} 
                      onClick={() => toggleColumn(colIdx)}
                      className={`
                        px-3 py-2 cursor-pointer transition-colors border-l border-slate-200 select-none min-w-[100px]
                        ${isSelected 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-slate-100 text-slate-500'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-400">{getColLetter(colIdx)}</span>
                          <span className="text-xs truncate max-w-[80px]" title={header}>
                            {header || '-'}
                          </span>
                        </div>
                      </div>
                    </th>
                  );
                })}
                {headers.length > maxCols && (
                  <th className="px-3 py-2 text-center text-slate-400 text-xs">
                    +{headers.length - maxCols} 欄
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataRows.slice(0, previewLimit).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-400 bg-slate-50 border-r border-slate-200 sticky left-0">
                    {rowIdx + 1}
                  </td>
                  {headers.slice(0, maxCols).map((_, colIdx) => {
                    const cellValue = row[colIdx];
                    const isSelected = selectedColumns.has(colIdx);
                    
                    return (
                      <td 
                        key={colIdx} 
                        className={`
                          px-3 py-2 truncate max-w-[120px] border-r border-slate-100 last:border-0
                          ${isSelected ? 'bg-blue-50/30' : ''}
                        `}
                        title={String(cellValue ?? '')}
                      >
                        {cellValue !== null && cellValue !== undefined 
                          ? String(cellValue) 
                          : <span className="text-slate-300 italic">-</span>
                        }
                      </td>
                    );
                  })}
                  {headers.length > maxCols && (
                    <td className="px-3 py-2 text-center text-slate-300">...</td>
                  )}
                </tr>
              ))}
              {dataRows.length > previewLimit && (
                <tr>
                  <td colSpan={maxCols + 2} className="px-4 py-2 text-center text-xs text-slate-400 bg-slate-50">
                    ... 共 {dataRows.length} 筆資料，僅顯示前 {previewLimit} 筆預覽 ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 px-3 py-2 rounded-lg">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              {selectedColumns.size >= 2 
                ? `將分析 ${selectedColumns.size} 個變數之間的相關性` 
                : '請至少選擇 2 個欄位'}
            </span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={selectedColumns.size < 2}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
              ${selectedColumns.size >= 2
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            開始分析計算
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
