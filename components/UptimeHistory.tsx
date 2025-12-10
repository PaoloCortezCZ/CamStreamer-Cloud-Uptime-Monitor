import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ServerStatus, HistoryPoint } from '../types';

interface UptimeHistoryProps {
  history: HistoryPoint[];
}

export const UptimeHistory: React.FC<UptimeHistoryProps> = ({ history }) => {
  const MAX_SLOTS = 60;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; subText: string; status: ServerStatus } | null>(null);

  // Helper to determine if a status is considered "Down" (Caution or Unreachable)
  const isDown = (s: ServerStatus) => s === ServerStatus.Unreachable || s === ServerStatus.Caution;

  const slots = Array(MAX_SLOTS).fill(null).map((_, i) => {
    // historyIndex matches the actual index in the 'history' prop array
    const historyIndex = i - (MAX_SLOTS - history.length);
    return {
        point: historyIndex >= 0 ? history[historyIndex] : null,
        index: historyIndex
    };
  });

  const handleMouseEnter = (e: React.MouseEvent, point: HistoryPoint | null, historyIndex: number) => {
    if (!point) {
        setTooltip(null);
        return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute:'2-digit', second: '2-digit' };
    const pointTimeStr = new Date(point.timestamp).toLocaleTimeString([], timeFormat);
    
    let text = '';
    let subText = '';

    if (isDown(point.status)) {
        // Calculate contiguous block of downtime (Caution + Unreachable)
        // Find Start Index
        let start = historyIndex;
        while(start > 0 && isDown(history[start - 1].status)) {
            start--;
        }
        
        // Find End Index
        let end = historyIndex;
        while(end < history.length - 1 && isDown(history[end + 1].status)) {
            end++;
        }

        const startTimeStr = new Date(history[start].timestamp).toLocaleTimeString([], timeFormat);
        const endTimeStr = new Date(history[end].timestamp).toLocaleTimeString([], timeFormat);
        
        // If start and end are the same, just show one time, otherwise show range
        const timeRange = start !== end ? `${startTimeStr} - ${endTimeStr}` : startTimeStr;

        if (point.status === ServerStatus.Caution) {
            text = `⚠️ First Alert (Caution)`;
            subText = timeRange;
        } else {
            text = `⚠️ Outage Detected`;
            subText = timeRange;
        }
    } else {
        // Operational or Checking
        if (point.status === ServerStatus.Operational) {
             text = `Operational`;
        } else {
             text = point.status;
        }
        subText = pointTimeStr;
    }

    setTooltip({ 
        x: rect.left + rect.width / 2, 
        y: rect.top, 
        text, 
        subText,
        status: point.status 
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <>
      <div 
        className="flex items-end gap-[1px] h-full w-full cursor-crosshair" 
        aria-label="1-hour uptime history" 
        onMouseLeave={handleMouseLeave}
      >
        {slots.map((slot, i) => {
          const { point, index } = slot;
          let colorClass = 'bg-slate-200'; // Darker empty state for visibility
          let height = '100%';

          if (point) {
              if (point.status === ServerStatus.Unreachable) colorClass = 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.6)] z-10';
              else if (point.status === ServerStatus.Operational) colorClass = 'bg-emerald-400';
              else if (point.status === ServerStatus.Caution) colorClass = 'bg-orange-400';
              else if (point.status === ServerStatus.Checking) colorClass = 'bg-blue-300 animate-pulse';
              else colorClass = 'bg-slate-300';
          }

          return (
            <div
              key={i}
              className={`flex-1 rounded-[0.5px] transition-all duration-300 ${colorClass} ${point ? 'hover:opacity-100 opacity-90' : 'opacity-40'}`}
              style={{ height }}
              onMouseEnter={(e) => handleMouseEnter(e, point, index)}
            />
          );
        })}
      </div>
      
      {/* Tooltip Portal */}
      {tooltip && createPortal(
        <div 
            className={`fixed z-[9999] px-3 py-2 text-white rounded shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-150 min-w-[120px] text-center
                ${tooltip.status === ServerStatus.Unreachable ? 'bg-rose-600' : 
                  tooltip.status === ServerStatus.Caution ? 'bg-orange-600' : 'bg-slate-800'}
            `}
            style={{ 
                left: tooltip.x, 
                top: tooltip.y - 6,
            }}
        >
            <div className="text-[11px] font-bold whitespace-nowrap">{tooltip.text}</div>
            <div className="text-[9px] font-mono opacity-90 border-t border-white/20 mt-1 pt-1 whitespace-nowrap">{tooltip.subText}</div>
            
            <div 
                className={`absolute left-1/2 -bottom-1 transform -translate-x-1/2 w-2 h-2 rotate-45 
                    ${tooltip.status === ServerStatus.Unreachable ? 'bg-rose-600' : 
                      tooltip.status === ServerStatus.Caution ? 'bg-orange-600' : 'bg-slate-800'}
                `}
            ></div>
        </div>,
        document.body
      )}
    </>
  );
};