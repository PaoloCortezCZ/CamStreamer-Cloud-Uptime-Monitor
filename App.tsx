import React, { useState } from 'react';
import { SERVER_DATA } from './constants';
import { ServerCard } from './components/ServerCard';
import { WorldMap } from './components/WorldMap';
import { AssistantWidget } from './components/AssistantWidget';
import { ConsoleLog } from './components/ConsoleLog';
import { ServerDetailModal } from './components/ServerDetailModal';
import { useServerMonitor } from './hooks/useServerMonitor';
import { generateReport } from './utils/pdfGenerator';
import { Activity, RefreshCw, LayoutDashboard, Globe, Terminal, FileText } from 'lucide-react';
import { ServerGroup, Region } from './types';

export default function App() {
  const { statuses, histories, latencies, logs, isChecking, checkAll, getGroupStatus } = useServerMonitor(SERVER_DATA);
  const [selectedRegion, setSelectedRegion] = useState<ServerGroup | null>(null);

  // Group EU and US for the dashboard display
  const euGroup = SERVER_DATA.find(g => g.region === Region.EU);
  const usGroup = SERVER_DATA.find(g => g.region === Region.US);
  const jpGroup = SERVER_DATA.find(g => g.region === Region.JP);
  const axisGroup = SERVER_DATA.find(g => g.region === Region.AXIS);

  const westernGroups = [euGroup, usGroup].filter((g): g is ServerGroup => !!g);

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden">
      {/* Header - Fixed Height */}
      <header className="flex-none bg-white border-b border-slate-200 z-40 backdrop-blur-md bg-white/90">
        <div className="w-full max-w-[160rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
                <Activity className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">CamStreamer Cloud</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Live Infrastructure Status</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-sm font-medium">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Live Monitoring
            </div>
            
            <button
                onClick={() => generateReport(SERVER_DATA, statuses, latencies, histories)}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2"
                aria-label="Export PDF"
                title="Export Status Report (A4)"
            >
                <FileText className="w-5 h-5" />
                <span className="hidden md:inline text-xs font-semibold">Export PDF</span>
            </button>

            <button 
                onClick={checkAll}
                className={`p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all ${isChecking ? 'animate-spin' : ''}`}
                aria-label="Refresh All"
                title="Refresh Status"
            >
                <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Flex Grow to fill remaining height */}
      <main className="flex-1 min-h-0 w-full max-w-[160rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
        {/* Main Grid Layout - Changed to split 1/2 (left) and 1/2 (right) on large screens (xl) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
            
            {/* Left Column: Map & Logs - 1/2 width */}
            <section className="flex flex-col h-full min-h-0 gap-4 xl:col-span-1">
                {/* Map Section */}
                <div className="flex-[4] flex flex-col min-h-0">
                    <div className="flex-none flex items-center justify-between px-1 mb-2">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">Global Connectivity Map</h2>
                        </div>
                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Real-time
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-0 bg-white rounded-2xl p-1 shadow-sm border border-slate-200 relative">
                         <WorldMap 
                            serverGroups={SERVER_DATA} 
                            getGroupStatus={getGroupStatus} 
                            onMarkerClick={setSelectedRegion}
                        />
                    </div>
                </div>

                {/* Console Log Section */}
                <div className="flex-[8] flex flex-col min-h-0">
                    <div className="flex-none flex items-center gap-2 mb-2 px-1">
                        <Terminal className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">Live Network Console</h2>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ConsoleLog logs={logs} />
                    </div>
                </div>
            </section>

            {/* Right Column: Server Cards - 1/2 width */}
            <section className="flex flex-col h-full min-h-0 xl:col-span-1">
                <div className="flex-none flex items-center gap-2 mb-2 px-1">
                    <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800">Regional Server Details</h2>
                </div>
                
                {/* Scrollable Card Area */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-1">
                    <div className="grid grid-cols-1 gap-3 pb-2">
                        {/* Merged Western Regions Card (EU + US) */}
                        {westernGroups.length > 0 && (
                            <ServerCard 
                                groups={westernGroups} 
                                title="Western Regions"
                                statuses={statuses}
                                latencies={latencies}
                                histories={histories}
                                layoutMode="grid"
                                variant="compact"
                            />
                        )}

                        {/* Japan Card */}
                        {jpGroup && (
                            <ServerCard 
                                groups={[jpGroup]}
                                statuses={statuses}
                                latencies={latencies}
                                histories={histories}
                                layoutMode="grid"
                                variant="compact"
                            />
                        )}

                        {/* Axis Card */}
                        {axisGroup && (
                            <ServerCard 
                                groups={[axisGroup]}
                                statuses={statuses}
                                latencies={latencies}
                                histories={histories}
                                layoutMode="grid"
                                variant="compact"
                            />
                        )}
                    </div>
                    
                    {/* Footer embedded in scrollable area */}
                    <div className="text-center py-4 border-t border-slate-200/50 mt-2">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                            CamStreamer Cloud • System Operational
                        </p>
                    </div>
                </div>
            </section>

        </div>
      </main>
      
      {/* Modals & Overlays */}
      <ServerDetailModal 
        isOpen={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        group={selectedRegion}
        statuses={statuses}
        latencies={latencies}
        histories={histories}
      />
      
      <AssistantWidget />
    </div>
  );
}