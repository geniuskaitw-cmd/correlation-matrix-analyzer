import React, { useState, useMemo, useEffect } from 'react';
import { ParsedData, VariableData } from '../types';
import { ArrowRight, Settings2, Info, CheckSquare, Square, Loader2 } from 'lucide-react';

interface DataConfigProps {
  rawData: ParsedData;
  onAnalyze: (variables: VariableData[]) => void;
  onReset: () => void;
  isAnalyzing?: boolean;
}

type DataOrientation = 'columns' | 'rows';

export const DataConfig: React.FC<DataConfigProps> = ({ rawData, onAnalyze, onReset, isAnalyzing = false }) => {
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
    
    return stringCount > 0 && stringCount >= numberCount;
  }, [rows]);

  const [hasHeaderRow, setHasHeaderRow] = useState(detectHeaderRow);
  
  // Data orientation: 'columns' = each column is a variable, 'rows' = each row is a variable
  const [orientation, setOrientation] = useState<DataOrientation>('columns');

  // Calculate headers based on settings
  const { headers, dataRows } = useMemo(() => {
    if (hasHeaderRow && rows.length > 0) {
      return {
        headers: rows[0].map((h: unknown) => String(h ?? '')),
        dataRows: rows.slice(1)
      };
    }
    const maxCols = Math.max(...rows.slice(0, 10).map(r => r.length), 0);
    return {
      headers: Array.from({ length: maxCols }, (_, i) => `欄位 ${String.fromCharCode(65 + i)}`),
      dataRows: rows
    };
  }, [rows, hasHeaderRow]);

  // Selected items (columns or rows depending on orientation)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Auto-select numeric columns/rows when orientation or data changes
  useEffect(() => {
    const newSelected = new Set<number>();
    
    if (orientation === 'columns') {
      // Select columns with numeric data
      headers.forEach((_, colIdx) => {
        let numericCount = 0;
        const checkRows = dataRows.slice(0, 20);
        checkRows.forEach(row => {
          const cell = row[colIdx];
          if (typeof cell === 'number' || (typeof cell === 'string' && !isNaN(parseFloat(cell)))) {
            numericCount++;
          }
        });
        if (checkRows.length > 0 && numericCount > checkRows.length * 0.3) {
          newSelected.add(colIdx);
        }
      });
    } else {
      // Select rows with numeric data (skip first column which is usually the label)
      dataRows.forEach((row, rowIdx) => {
        let numericCount = 0;
        row.slice(1).forEach((cell: unknown) => {
          if (typeof cell === 'number' || (typeof cell === 'string' && !isNaN(parseFloat(String(cell))))) {
            numericCount++;
          }
        });
        if (row.length > 1 && numericCount > (row.length - 1) * 0.3) {
          newSelected.add(rowIdx);
        }
      });
    }
    
    setSelectedItems(newSelected);
  }, [orientation, headers, dataRows]);

  const toggleItem = (idx: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (orientation === 'columns') {
      setSelectedItems(new Set(headers.map((_, i) => i)));
    } else {
      setSelectedItems(new Set(dataRows.map((_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const getColLetter = (i: number) => String.fromCharCode(65 + i);

  const handleAnalyze = () => {
    if (selectedItems.size < 2) {
      alert("請至少選擇 2 個項目進行分析");
      return;
    }

    const variables: VariableData[] = [];
    
    if (orientation === 'columns') {
      // Each selected COLUMN becomes a variable
      // Values are from each row in that column
      selectedItems.forEach(colIdx => {
        const values: number[] = [];
        
        dataRows.forEach(row => {
          const cell = row[colIdx];
          if (typeof cell === 'number') {
            values.push(cell);
          } else if (typeof cell === 'string') {
            const parsed = parseFloat(cell);
            values.push(isNaN(parsed) ? NaN : parsed);
          } else {
            values.push(NaN);
          }
        });

        const validCount = values.filter(v => !isNaN(v)).length;
        if (validCount >= 2) {
          variables.push({
            name: headers[colIdx] || `欄位 ${getColLetter(colIdx)}`,
            values: values
          });
        }
      });
    } else {
      // Each selected ROW becomes a variable
      // Values are from each column in that row (skip first column as it's the label)
      selectedItems.forEach(rowIdx => {
        const row = dataRows[rowIdx];
        if (!row) return;
        
        const label = String(row[0] ?? `列 ${rowIdx + 1}`);
        const values: number[] = [];
        
        // Start from column 1 (skip label column)
        for (let colIdx = 1; colIdx < row.length; colIdx++) {
          const cell = row[colIdx];
          if (typeof cell === 'number') {
            values.push(cell);
          } else if (typeof cell === 'string') {
            const parsed = parseFloat(cell);
            values.push(isNaN(parsed) ? NaN : parsed);
          } else {
            values.push(NaN);
          }
        }

        const validCount = values.filter(v => !isNaN(v)).length;
        if (validCount >= 2) {
          variables.push({
            name: label,
            values: values
          });
        }
      });
    }

    if (variables.length < 2) {
      alert("選擇的項目中，有效數值資料不足。請確認至少有 2 個項目包含數值。");
      return;
    }

    onAnalyze(variables);
  };

  const maxCols = Math.min(headers.length, 12);

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
              選擇資料方向，並勾選要分析的{orientation === 'columns' ? '欄位' : '列'}。
            </p>
          </div>
          <button 
            onClick={onReset}
            className="text-sm text-slate-500 hover:text-red-500 underline decoration-slate-300"
          >
            重新上傳
          </button>
        </div>

        {/* Settings Row */}
        <div className="mb-4 flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-lg">
          {/* Header Row Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHeaderRow}
              onChange={(e) => setHasHeaderRow(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">第一列是標題</span>
          </label>

          <div className="w-px h-6 bg-slate-300" />

          {/* Orientation Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">資料方向：</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              <button
                onClick={() => setOrientation('columns')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  orientation === 'columns' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                每欄一個變數
              </button>
              <button
                onClick={() => setOrientation('rows')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-300 ${
                  orientation === 'rows' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                每列一個變數
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-3 flex items-center gap-2">
          <button onClick={selectAll} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
            全選
          </button>
          <button onClick={deselectAll} className="text-xs px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">
            取消全選
          </button>
          <span className="text-xs text-slate-400 ml-2">
            已選擇 {selectedItems.size} 個{orientation === 'columns' ? '欄位' : '列'}
          </span>
        </div>

        {/* Data Preview Table */}
        <div className="overflow-auto border rounded-lg border-slate-200 max-h-[400px]" style={{ scrollbarWidth: 'auto', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                {/* Row selector column (only for row orientation) */}
                {orientation === 'rows' && (
                  <th className="px-2 py-3 w-8 text-center bg-slate-50 sticky left-0 z-10">
                    <span className="text-slate-400">選</span>
                  </th>
                )}
                <th className="px-3 py-3 w-10 text-center font-mono text-slate-400 bg-slate-50 sticky left-0 z-10">#</th>
                {headers.slice(0, maxCols).map((header, colIdx) => {
                  const isSelected = orientation === 'columns' && selectedItems.has(colIdx);
                  return (
                    <th 
                      key={colIdx} 
                      onClick={() => orientation === 'columns' && toggleItem(colIdx)}
                      className={`
                        px-3 py-2 transition-colors border-l border-slate-200 select-none min-w-[80px]
                        ${orientation === 'columns' ? 'cursor-pointer' : ''}
                        ${isSelected ? 'bg-blue-50 text-blue-700' : orientation === 'columns' ? 'hover:bg-slate-100 text-slate-500' : 'text-slate-500'}
                      `}
                    >
                      <div className="flex items-center gap-1">
                        {orientation === 'columns' && (
                          isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                          )
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] text-slate-400">{getColLetter(colIdx)}</span>
                          <span className="text-xs truncate max-w-[70px]" title={header}>
                            {header || '-'}
                          </span>
                        </div>
                      </div>
                    </th>
                  );
                })}
                {headers.length > maxCols && (
                  <th className="px-3 py-2 text-center text-slate-400 text-xs">
                    +{headers.length - maxCols}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataRows.slice(0, previewLimit).map((row, rowIdx) => {
                const isRowSelected = orientation === 'rows' && selectedItems.has(rowIdx);
                return (
                  <tr 
                    key={rowIdx} 
                    onClick={() => orientation === 'rows' && toggleItem(rowIdx)}
                    className={`
                      border-b border-slate-100 last:border-0 
                      ${orientation === 'rows' ? 'cursor-pointer' : ''}
                      ${isRowSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}
                    `}
                  >
                    {orientation === 'rows' && (
                      <td className="px-2 py-2 text-center bg-slate-50 sticky left-0 z-10">
                        {isRowSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-center font-mono text-xs text-slate-400 bg-slate-50 border-r border-slate-200 sticky left-0 z-10">
                      {rowIdx + 1}
                    </td>
                    {headers.slice(0, maxCols).map((_, colIdx) => {
                      const cellValue = row[colIdx];
                      const isColSelected = orientation === 'columns' && selectedItems.has(colIdx);
                      
                      return (
                        <td 
                          key={colIdx} 
                          className={`
                            px-3 py-2 truncate max-w-[100px] border-r border-slate-100 last:border-0
                            ${isColSelected ? 'bg-blue-50/30' : ''}
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
                );
              })}
              {dataRows.length > previewLimit && (
                <tr>
                  <td colSpan={maxCols + (orientation === 'rows' ? 3 : 2)} className="px-4 py-2 text-center text-xs text-slate-400 bg-slate-50">
                    ... 共 {dataRows.length} 筆，顯示前 {previewLimit} 筆 ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info & Action */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 px-3 py-2 rounded-lg">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              {selectedItems.size >= 2 
                ? `將分析 ${selectedItems.size} 個變數的相關性` 
                : `請至少選擇 2 個${orientation === 'columns' ? '欄位' : '列'}`}
            </span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={selectedItems.size < 2 || isAnalyzing}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
              ${selectedItems.size >= 2 && !isAnalyzing
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                開始分析
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
