import React, { useState } from 'react';
import { Matrix } from '../types';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Download, ZoomIn, ZoomOut, FileSpreadsheet, FileText } from 'lucide-react';

interface CorrelationMatrixProps {
  matrix: Matrix;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ matrix }) => {
  const { variables, grid } = matrix;
  const [hoverCell, setHoverCell] = useState<{ r: number, c: number } | null>(null);
  const [cellSize, setCellSize] = useState(80); // Default cell size in pixels

  // Color scale setup
  // 1 = Deep Red, 0 = White, -1 = Deep Blue
  const getColor = (value: number) => {
      const color = d3.scaleLinear<string>()
        .domain([-1, -0.5, 0, 0.5, 1])
        .range(["#2563eb", "#93c5fd", "#ffffff", "#fca5a5", "#dc2626"]); 
      return color(value);
  };

  const getTextColor = (value: number) => {
    return Math.abs(value) > 0.5 ? 'white' : '#1e293b';
  };

  const handleExport = async (type: 'csv' | 'xlsx') => {
    if (type === 'csv') {
      // CSV does not support colors, use simple XLSX utility
      const headerRow = ['變數', ...variables];
      const dataRows = variables.map((v, i) => [v, ...grid[i]]);
      const allData = [headerRow, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `correlation_matrix_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // XLSX with styles using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Correlation Matrix');

      // Add Headers
      const headerRow = sheet.addRow(['', ...variables]);
      headerRow.font = { bold: true };
      
      // Add Data and Styles
      variables.forEach((rowVar, rIdx) => {
        const rowValues = [rowVar, ...grid[rIdx]];
        const row = sheet.addRow(rowValues);

        // Styling cells
        grid[rIdx].forEach((val, cIdx) => {
          // cIdx + 2 because: column 1 is the variable name, column 2 starts data
          const cell = row.getCell(cIdx + 2);
          
          if (rIdx === cIdx) {
             // Diagonal (Self)
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          } else {
             // Calculate Color
             // D3 often returns "rgb(r,g,b)" so we must convert to Hex
             const rawColor = getColor(val);
             const d3Color = d3.color(rawColor);
             let argbColor = 'FFFFFFFF'; // Default white

             if (d3Color) {
                // formatHex() returns #RRGGBB, we need FFRRGGBB for ExcelJS
                argbColor = 'FF' + d3Color.formatHex().substring(1).toUpperCase();
             }
             
             cell.fill = {
               type: 'pattern',
               pattern: 'solid',
               fgColor: { argb: argbColor }
             };

             // Text Color (White for dark backgrounds)
             if (Math.abs(val) > 0.5) {
               cell.font = { color: { argb: 'FFFFFFFF' } };
             }
          }
          // Set number format
          cell.numFmt = '0.00';
        });
      });

      // Write buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `correlation_matrix_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[85vh]">
      
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          相關係數矩陣熱圖
        </h3>

        <div className="flex items-center gap-6">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
            <ZoomOut className="w-4 h-4 text-slate-500" />
            <input 
              type="range" 
              min="40" 
              max="150" 
              value={cellSize} 
              onChange={(e) => setCellSize(Number(e.target.value))}
              className="w-32 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <ZoomIn className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-mono w-8 text-right">{cellSize}px</span>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors shadow-sm"
              title="匯出保留顏色的 Excel 報表"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel (含顏色)
            </button>
            <button 
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700 transition-colors shadow-sm"
              title="匯出 CSV (純文字)"
            >
              <FileText className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg relative bg-slate-50">
        <div 
          className="grid"
          style={{
            // First col is variable width (auto), others are fixed by cellSize
            gridTemplateColumns: `auto repeat(${variables.length}, ${cellSize}px)`,
          }}
        >
          {/* --- Header Row --- */}
          
          {/* Top-Left Corner (Sticky) */}
          <div className="sticky top-0 left-0 z-30 bg-white border-b border-r border-slate-200 p-2 flex items-center justify-center shadow-sm">
             <span className="text-xs font-bold text-slate-400 italic whitespace-nowrap">變數</span>
          </div>

          {/* Column Headers (Sticky Top) */}
          {variables.map((v, i) => (
            <div 
              key={`h-${i}`} 
              className="sticky top-0 z-20 bg-white border-b border-r border-slate-100 p-1 flex items-center justify-center text-xs font-semibold text-slate-600 text-center break-words leading-tight shadow-sm"
              style={{ width: cellSize, height: 50 }} // Fixed header height
            >
              <div className="line-clamp-2" title={v}>{v}</div>
            </div>
          ))}

          {/* --- Data Rows --- */}
          {variables.map((rowVar, rIdx) => (
            <React.Fragment key={`row-${rIdx}`}>
              
              {/* Row Header (Sticky Left) */}
              <div className="sticky left-0 z-20 bg-white border-b border-r border-slate-200 px-3 py-1 flex items-center justify-end text-xs font-semibold text-slate-600 text-right shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)]">
                {/* Removed fixed min-width, added whitespace-nowrap to keep it single line if preferred, or allow wrap if needed. 
                    Using whitespace-nowrap ensures it fits content tightly but expands if content is long. */}
                <span className="whitespace-nowrap" title={rowVar}>{rowVar}</span>
              </div>

              {/* Data Cells */}
              {grid[rIdx].map((value, cIdx) => {
                const isHovered = hoverCell?.r === rIdx && hoverCell?.c === cIdx;
                const isRelatedHover = hoverCell?.r === cIdx && hoverCell?.c === rIdx; 
                const isSelf = rIdx === cIdx;
                
                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    onMouseEnter={() => setHoverCell({ r: rIdx, c: cIdx })}
                    onMouseLeave={() => setHoverCell(null)}
                    className={`
                      relative flex items-center justify-center cursor-default border-b border-r border-slate-50
                      ${isHovered ? 'z-10 ring-2 ring-slate-800 shadow-lg' : ''}
                      ${isRelatedHover ? 'ring-2 ring-slate-300 opacity-90' : ''}
                    `}
                    style={{ 
                      width: cellSize, 
                      height: cellSize,
                      backgroundColor: isSelf ? '#f8fafc' : getColor(value) 
                    }}
                  >
                    {!isSelf && (
                      <span 
                        className={`font-bold transition-opacity select-none ${cellSize < 50 ? 'text-[10px]' : 'text-sm'}`}
                        style={{ color: getTextColor(value) }}
                      >
                        {cellSize > 35 ? value.toFixed(2) : ''}
                      </span>
                    )}
                    {isSelf && <span className="text-slate-200 text-xs">-</span>}
                    
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs p-3 rounded shadow-xl whitespace-nowrap pointer-events-none z-50">
                        <div className="font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">相關性分析</div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-left">
                           <span className="text-slate-400">變數 1:</span> <span>{rowVar}</span>
                           <span className="text-slate-400">變數 2:</span> <span>{variables[cIdx]}</span>
                           <span className="text-slate-400">係數 r:</span> <span className="font-mono text-yellow-400">{value.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="font-medium">負相關 (-1)</span>
          <div className="h-4 w-48 rounded-full overflow-hidden flex shadow-inner">
            <div className="flex-1 bg-[#2563eb]"></div>
            <div className="flex-1 bg-[#93c5fd]"></div>
            <div className="flex-1 bg-white"></div>
            <div className="flex-1 bg-[#fca5a5]"></div>
            <div className="flex-1 bg-[#dc2626]"></div>
          </div>
          <span className="font-medium">正相關 (+1)</span>
        </div>
        
        <div className="text-xs text-slate-400">
          CSV 格式為純文字無法保存顏色，若需色彩請選擇 Excel
        </div>
      </div>
    </div>
  );
};