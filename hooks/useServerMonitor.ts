import { useState, useCallback, useEffect, useRef } from 'react';
import { ServerGroup, ServerStatus, HistoryPoint, LogEntry } from '../types';
import { checkServerConnectivity } from '../services/networkService';

interface UseServerMonitorReturn {
  statuses: Record<string, ServerStatus>;
  histories: Record<string, HistoryPoint[]>;
  latencies: Record<string, number>;
  logs: LogEntry[];
  isChecking: boolean;
  checkAll: () => Promise<void>;
  getGroupStatus: (group: ServerGroup) => ServerStatus;
}

export const useServerMonitor = (groups: ServerGroup[]): UseServerMonitorReturn => {
  const [statuses, setStatuses] = useState<Record<string, ServerStatus>>({});
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  
  // Track consecutive failures to prevent false alarms
  const failureCounts = useRef<Record<string, number>>({});

  // Initialize with empty history (real data only)
  const [histories, setHistories] = useState<Record<string, HistoryPoint[]>>(() => {
    const initial: Record<string, HistoryPoint[]> = {};
    groups.forEach(group => {
      group.servers.forEach(s => {
        initial[s.ip] = [];
      });
    });
    return initial;
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [isChecking, setIsChecking] = useState(false);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => {
        const entry: LogEntry = {
            id: Date.now().toString() + Math.random().toString().slice(2),
            timestamp: new Date(),
            message,
            type
        };
        // Keep last 50 logs
        return [entry, ...prev].slice(0, 50);
    });
  }, []);

  const checkAll = useCallback(async () => {
    setIsChecking(true);
    // addLog('Initiating global server check...', 'info');
    
    const checks: Promise<void>[] = [];

    groups.forEach(group => {
        group.servers.forEach(server => {
            const p = checkServerConnectivity(server.ip, server.isRange || false).then(({ status: rawStatus, latency }) => {
                let finalStatus = rawStatus;

                // --- False Alarm Mitigation Logic ---
                if (rawStatus === ServerStatus.Unreachable) {
                    const count = (failureCounts.current[server.ip] || 0) + 1;
                    failureCounts.current[server.ip] = count;

                    if (count < 2) {
                        // First failure: Mark as Caution (Warning)
                        finalStatus = ServerStatus.Caution;
                        addLog(`Potential issue detected on ${server.ip} (${group.region})`, 'warning');
                    } else if (count === 2) {
                        // Second failure: Confirm Outage
                        addLog(`Connection lost to ${server.ip} (${group.region})`, 'error');
                    }
                } else {
                    // Reset failure count on success
                    if ((failureCounts.current[server.ip] || 0) >= 2) {
                        addLog(`Connection restored to ${server.ip} (${group.region})`, 'success');
                    } else if ((failureCounts.current[server.ip] || 0) === 1) {
                         // Recovered from Caution
                         // Optional: addLog(`Stability restored on ${server.ip}`, 'info');
                    }
                    failureCounts.current[server.ip] = 0;
                }
                // ------------------------------------

                setStatuses(prev => ({ ...prev, [server.ip]: finalStatus }));
                
                // Update Latency: Use Weighted Moving Average to smooth values
                setLatencies(prev => {
                    const currentAvg = prev[server.ip];
                    // If we have previous history, weight it 60% and new sample 40%
                    const newAvg = currentAvg ? Math.round((currentAvg * 0.6) + (latency * 0.4)) : latency;
                    return { ...prev, [server.ip]: newAvg };
                });
                
                setHistories(prev => {
                    const currentHistory = prev[server.ip] ? [...prev[server.ip]] : [];
                    
                    // Keep last 60 points (1 hour at 1 min interval)
                    if (currentHistory.length >= 60) currentHistory.shift();
                    
                    currentHistory.push({
                        timestamp: Date.now(),
                        status: finalStatus // Log the sanitized status to history
                    });
                    return { ...prev, [server.ip]: currentHistory };
                });
            });
            checks.push(p);
        });
    });

    await Promise.all(checks);
    setIsChecking(false);
  }, [groups, addLog]); 

  // Initial check and Interval
  useEffect(() => {
    checkAll(); // Run immediately on mount
    
    const intervalId = setInterval(() => {
      checkAll();
    }, 60000); // Run every 60 seconds

    return () => clearInterval(intervalId);
  }, [checkAll]);

  const getGroupStatus = (group: ServerGroup): ServerStatus => {
    const groupStatuses = group.servers.map(s => statuses[s.ip]);
    
    if (groupStatuses.length === 0) return ServerStatus.Checking;
    
    if (groupStatuses.some(s => s === ServerStatus.Checking)) return ServerStatus.Checking;
    // Priority: Unreachable > Caution > Operational
    if (groupStatuses.some(s => s === ServerStatus.Unreachable)) return ServerStatus.Unreachable;
    if (groupStatuses.some(s => s === ServerStatus.Caution)) return ServerStatus.Caution;
    if (groupStatuses.every(s => s === ServerStatus.Operational)) return ServerStatus.Operational;
    
    return ServerStatus.Operational; 
  };

  return {
    statuses,
    histories,
    latencies,
    logs,
    isChecking,
    checkAll,
    getGroupStatus
  };
};