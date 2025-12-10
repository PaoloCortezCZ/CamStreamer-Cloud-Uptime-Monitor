import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LogEntry } from '../types';
import { Terminal, CheckCircle2, AlertTriangle, XCircle, ChevronRight, ArrowUp, ArrowDown, Filter } from 'lucide-react';

interface ConsoleLogProps {
  logs: LogEntry[];
}

type LogFilter = 'all' | 'error' | 'warning' | 'success' | 'info';
type SortOrder = 'asc' | 'desc';

export const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs }) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: Newest First
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter and Sort Logs
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // 1. Filter
    if (filter !== 'all') {
      result = result.filter(log => log.type === filter);
    }

    // 2. Sort
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' 
        ? timeA - timeB // Oldest First (Chronological)
        : timeB - timeA; // Newest First (Reverse Chronological)
    });

    return result;
  }, [logs, filter, sortOrder]);

  // Auto-scroll logic
  useEffect(() => {
    if (sortOrder === 'asc') {
      // If Chronological (Oldest -> Newest), scroll to bottom to see latest
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If Reverse (Newest -> Oldest), scroll to top to see latest
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [processedLogs, sortOrder]);

  return (
    <div className="h-full flex flex-col bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden font-mono text-xs">
      {/* Header with Controls */}
      <div className="flex-none flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold tracking-tight text-[10px] uppercase">System Events</span>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Sort Toggle */}
            <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                title={sortOrder === 'asc' ? "Sort: Oldest First" : "Sort: Newest First"}
            >
                {sortOrder === 'asc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
            </button>

            {/* Filter Dropdown */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-1.5 pointer-events-none">
                    <Filter className="w-3 h-3 text-slate-500" />
                </div>
                <select 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as LogFilter)}
                    className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-1 pl-6 pr-6 cursor-pointer outline-none transition-all"
                >
                    <option value="all">All Events</option>
                    <option value="error">Errors</option>
                    <option value="warning">Warnings</option>
                    <option value="success">Success</option>
                    <option value="info">Info</option>
                </select>
                {/* Custom Arrow for Select */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-slate-500">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
            </div>
        </div>
      </div>
      
      {/* Logs List */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar scroll-smooth"
      >
        {processedLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 italic gap-2 opacity-50">
                <Filter className="w-6 h-6" />
                <span>No logs match current filter</span>
            </div>
        )}
        
        {processedLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-slate-600 flex-shrink-0 select-none text-[10px] pt-0.5 font-mono">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
            
            <div className="flex items-start gap-1.5 min-w-0 break-words leading-tight">
                <span className="mt-0.5 flex-shrink-0">
                    {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {log.type === 'error' && <XCircle className="w-3 h-3 text-rose-500" />}
                    {log.type === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    {log.type === 'info' && <ChevronRight className="w-3 h-3 text-blue-500" />}
                </span>
                
                <span className={`
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'error' ? 'text-rose-400 font-semibold' : ''}
                    ${log.type === 'warning' ? 'text-amber-400' : ''}
                    ${log.type === 'info' ? 'text-slate-300' : ''}
                `}>
                    {log.message}
                </span>
            </div>
          </div>
        ))}
        
        {/* Anchor for auto-scroll when sorting ascending */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};