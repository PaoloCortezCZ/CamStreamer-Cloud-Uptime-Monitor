import React, { useMemo } from 'react';
import { ServerGroup, ServerStatus, HistoryPoint } from '../types';
import { StatusBadge } from './StatusBadge';
import { UptimeHistory } from './UptimeHistory';
import { Globe, Network, Activity } from 'lucide-react';

interface ServerCardProps {
  groups: ServerGroup[]; // Changed from single group to array
  title?: string; // Optional override for the card title
  statuses: Record<string, ServerStatus>;
  latencies: Record<string, number>;
  histories: Record<string, HistoryPoint[]>;
  className?: string;
  layoutMode?: 'list' | 'grid';
  variant?: 'default' | 'compact';
}

export const ServerCard: React.FC<ServerCardProps> = ({ 
    groups, 
    title, 
    statuses, 
    latencies, 
    histories, 
    className,
    layoutMode = 'list',
    variant = 'default'
}) => {
  
  const overallStatus = useMemo(() => {
    // Flatten all servers from all groups
    const allServers = groups.flatMap(g => g.servers);
    const s = allServers.map(server => statuses[server.ip]);
    
    if (s.length === 0) return ServerStatus.Checking;
    if (s.some(status => status === ServerStatus.Checking)) return ServerStatus.Checking;
    if (s.some(status => status === ServerStatus.Unreachable)) return ServerStatus.Unreachable;
    if (s.some(status => status === ServerStatus.Caution)) return ServerStatus.Caution;
    if (s.every(status => status === ServerStatus.Operational)) return ServerStatus.Operational;
    return ServerStatus.Unknown;
  }, [groups, statuses]);

  // Determine Card Title: Use prop, or single group region, or "Combined"
  const cardTitle = title || (groups.length === 1 ? groups[0].region : 'Combined Regions');

  // Helper to calculate average latency for a set of servers
  const getAvgLatency = (servers: any[]) => {
    const validLatencies = servers
        .filter(s => statuses[s.ip] === ServerStatus.Operational && latencies[s.ip] !== undefined && latencies[s.ip] > 0)
        .map(s => latencies[s.ip]);
    
    if (validLatencies.length === 0) return null;
    return Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length);
  };

  const overallAvgLatency = useMemo(() => {
     const allServers = groups.flatMap(g => g.servers);
     return getAvgLatency(allServers);
  }, [groups, latencies, statuses]);

  const lastChecked = useMemo(() => {
      const allTimestamps = groups.flatMap(g => g.servers).map(s => {
          const h = histories[s.ip];
          return h && h.length > 0 ? h[h.length - 1].timestamp : 0;
      });
      const maxTime = Math.max(...allTimestamps, 0);
      return maxTime > 0 ? new Date(maxTime) : null;
  }, [groups, histories]);

  // Priority map for sorting: Unreachable (0) > Caution (1) > Checking (2) > Operational (3) > Unknown (4)
  const statusPriority: Record<ServerStatus, number> = {
    [ServerStatus.Unreachable]: 0,
    [ServerStatus.Caution]: 1,
    [ServerStatus.Checking]: 2,
    [ServerStatus.Operational]: 3,
    [ServerStatus.Unknown]: 4,
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group/card ${className}`}>
      {/* Card Header */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white border border-slate-100 rounded-lg shadow-sm text-indigo-600 flex-shrink-0">
                <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-sm leading-tight truncate" title={cardTitle}>{cardTitle}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Region Status</p>
                    {lastChecked && (
                        <>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight" title={`Last checked at ${lastChecked.toLocaleTimeString()}`}>
                                {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
            {/* Show Overall Average for Single Group Cards */}
            {groups.length === 1 && overallAvgLatency !== null && (
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm" title="Regional Average Latency">
                    <Activity className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-mono font-medium text-slate-600">Avg. {overallAvgLatency}ms</span>
                </div>
            )}
            {/* If compact, we might show a smaller status badge or just rely on the content, but keeping header standard for now */}
            <StatusBadge status={overallStatus} />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-0">
        <div className="divide-y divide-slate-50">
            {groups.map((group, groupIndex) => {
                const groupAvgLatency = getAvgLatency(group.servers);

                // Sort servers within the group
                const sortedServers = [...group.servers].sort((a, b) => {
                    const statusA = statuses[a.ip] || ServerStatus.Unknown;
                    const statusB = statuses[b.ip] || ServerStatus.Unknown;
                    // Sort ascending based on priority value (0 is highest priority)
                    return statusPriority[statusA] - statusPriority[statusB];
                });
                
                // Determine container class for the list of servers
                let containerClass = "divide-y divide-slate-50";
                if (layoutMode === 'grid') {
                    if (variant === 'compact') {
                        // 3 Columns max as requested, with smart wrapping for smaller screens
                        // Use grid-cols-1 on xs, 2 on sm, 3 on lg/xl/2xl
                        containerClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3";
                    } else {
                        // Standard grid for detailed cards
                        containerClass = "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 p-3";
                    }
                }

                return (
                <div key={group.region}>
                    {/* Sub-header if multiple groups are merged */}
                    {groups.length > 1 && (
                        <div className="px-5 py-2 bg-slate-50/30 border-b border-slate-50 flex items-center justify-between gap-2">
                             <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{group.region}</span>
                             </div>
                             {groupAvgLatency !== null && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded shadow-sm" title={`${group.region} Average Latency`}>
                                    <Activity className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-mono font-medium text-slate-600">{groupAvgLatency}ms avg</span>
                                </div>
                             )}
                        </div>
                    )}

                    {/* Servers List */}
                    <div className={containerClass}>
                        {sortedServers.map((server) => {
                            const status = statuses[server.ip] || ServerStatus.Checking;
                            const latency = latencies[server.ip];
                            
                            const isUnreachable = status === ServerStatus.Unreachable;
                            const isCaution = status === ServerStatus.Caution;

                            // Determine item styling based on layout mode and status
                            let itemClass = "";
                            
                            if (layoutMode === 'grid') {
                                if (isUnreachable) {
                                     itemClass = "bg-rose-50 rounded-lg border border-rose-200 shadow-[0_0_0_1px_rgba(225,29,72,0.1)] hover:shadow-md transition-all";
                                } else if (isCaution) {
                                     itemClass = "bg-orange-50 rounded-lg border border-orange-200 shadow-[0_0_0_1px_rgba(249,115,22,0.1)] hover:shadow-md transition-all";
                                } else {
                                     itemClass = "bg-slate-50/50 rounded-lg border border-slate-100 hover:bg-white hover:shadow-sm transition-all";
                                }
                                // Padding handled in render below for compact/default
                            } else {
                                // List Mode
                                if (isUnreachable) {
                                     itemClass = "bg-rose-50/40 hover:bg-rose-50/60 transition-colors";
                                } else if (isCaution) {
                                     itemClass = "bg-orange-50/40 hover:bg-orange-50/60 transition-colors";
                                } else {
                                     itemClass = "hover:bg-slate-50/80 transition-colors";
                                }
                            }

                            if (variant === 'compact') {
                                return (
                                    <div key={server.ip} className={`${itemClass} relative overflow-hidden flex flex-col group/item`}>
                                        <div className="flex items-center justify-between p-2 px-2.5 flex-1">
                                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                                <Network className={`w-3.5 h-3.5 flex-shrink-0 ${isUnreachable ? 'text-rose-400' : isCaution ? 'text-orange-400' : 'text-slate-300'}`} />
                                                <span 
                                                    className={`font-mono text-[13px] font-semibold tracking-tight truncate min-w-0 ${isUnreachable ? 'text-rose-700' : isCaution ? 'text-orange-700' : 'text-slate-700'}`}
                                                    title={server.ip}
                                                >
                                                    {server.ip}
                                                </span>
                                                {server.isRange && (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide flex-shrink-0
                                                        ${isUnreachable ? 'bg-rose-100 text-rose-600 border-rose-200' : 
                                                          isCaution ? 'bg-orange-100 text-orange-600 border-orange-200' : 
                                                          'bg-slate-100 text-slate-500 border-slate-200'}`
                                                    }>
                                                        CIDR
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 pl-1">
                                                {status === ServerStatus.Operational && latency !== undefined && (
                                                     <span className="text-[11px] font-mono text-slate-500 font-medium">{Math.round(latency)}ms</span>
                                                )}
                                                <StatusBadge status={status} variant="icon" />
                                            </div>
                                        </div>
                                        {/* Timeline Bar as bottom border */}
                                        <div className="h-1 w-full flex-none opacity-80 group-hover/item:opacity-100 transition-opacity">
                                            <UptimeHistory history={histories[server.ip] || []} />
                                        </div>
                                    </div>
                                );
                            }

                            // Default Variant (Detailed with History)
                            return (
                                <div key={server.ip} className={`${itemClass} ${layoutMode === 'grid' ? 'p-3' : 'px-5 py-2.5'}`}>
                                    {/* Top Row: IP & Status */}
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                            <Network className={`w-3.5 h-3.5 flex-shrink-0 ${isUnreachable ? 'text-rose-400' : isCaution ? 'text-orange-400' : 'text-slate-300'}`} />
                                            <span 
                                                className={`font-mono text-[13px] font-semibold tracking-tight truncate min-w-0 ${isUnreachable ? 'text-rose-700' : isCaution ? 'text-orange-700' : 'text-slate-700'}`}
                                                title={server.ip}
                                            >
                                                {server.ip}
                                            </span>
                                            {server.isRange && (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide flex-shrink-0
                                                    ${isUnreachable ? 'bg-rose-100 text-rose-600 border-rose-200' : 
                                                      isCaution ? 'bg-orange-100 text-orange-600 border-orange-200' : 
                                                      'bg-slate-100 text-slate-500 border-slate-200'}`
                                                }>
                                                    CIDR
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 transform scale-95 origin-right flex items-center gap-2">
                                             {status === ServerStatus.Operational && latency !== undefined && (
                                                 <div className="flex items-center gap-1.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title="Average Response Time">
                                                    <Activity className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[10px] font-mono text-slate-500 font-medium">
                                                        {Math.round(latency)}ms
                                                    </span>
                                                 </div>
                                             )}
                                             <StatusBadge status={status} />
                                        </div>
                                    </div>
                                    
                                    {/* Bottom Row: History Visualization */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className={`text-[9px] font-semibold uppercase tracking-widest ${isUnreachable ? 'text-rose-400' : isCaution ? 'text-orange-400' : 'text-slate-400'}`}>
                                                60m Activity
                                            </span>
                                        </div>
                                        <div className={`relative h-1.5 w-full rounded-sm overflow-hidden ${isUnreachable ? 'bg-rose-100/50' : isCaution ? 'bg-orange-100/50' : 'bg-slate-100/50'}`}>
                                             <UptimeHistory history={histories[server.ip] || []} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )})}
        </div>
      </div>
    </div>
  );
};