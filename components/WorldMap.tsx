import React, { useEffect, useState, useRef } from 'react';
import { ServerGroup, ServerStatus } from '../types';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface WorldMapProps {
  serverGroups: ServerGroup[];
  getGroupStatus: (group: ServerGroup) => ServerStatus;
  onMarkerClick?: (group: ServerGroup) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({ serverGroups, getGroupStatus, onMarkerClick }) => {
  const [time, setTime] = useState(new Date());
  const [hoveredGroup, setHoveredGroup] = useState<{ group: ServerGroup, status: ServerStatus, rect: DOMRect } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => setTime(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  const mapWidth = 1000;
  const mapHeight = 500;

  // Projection helper: Equirectangular
  const project = (lat: number, lng: number) => {
    const x = (lng + 180) * (mapWidth / 360);
    const y = (90 - lat) * (mapHeight / 180);
    return { x, y };
  };

  // Calculate Sun Position
  const getSunPosition = () => {
    const now = time;
    // Seasonality (Declination)
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

    // Sun Longitude
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const decimalHour = utcHours + utcMinutes / 60;
    const sunLong = (12 - decimalHour) * 15;
    
    let sunX = (sunLong + 180) * (mapWidth / 360);
    sunX = ((sunX % mapWidth) + mapWidth) % mapWidth;
    const sunY = (90 - declination) * (mapHeight / 180);

    return { x: sunX, y: sunY };
  };

  const { x: sunX, y: sunY } = getSunPosition();
  
  // Wrap positions for seamless rendering
  const sunPositions = [
      { x: sunX, y: sunY },
      { x: sunX - mapWidth, y: sunY },
      { x: sunX + mapWidth, y: sunY }
  ];

  const handleMouseEnter = (e: React.MouseEvent, group: ServerGroup, status: ServerStatus) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredGroup({ group, status, rect });
  };

  const handleMarkerClick = (e: React.MouseEvent, group: ServerGroup) => {
    e.stopPropagation();
    if (onMarkerClick) {
        onMarkerClick(group);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 rounded-xl overflow-hidden relative group select-none flex flex-col">
        
        {/* Header Overlay */}
        <div className="absolute top-4 left-6 z-10 pointer-events-none">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <span className="text-[10px] font-mono text-white/90 font-bold tracking-widest uppercase">Live Satellite Feed</span>
            </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-full bg-[#000510]">
            {/* 
                viewBox: 0 0 1000 250
                Crops the map to the Northern Hemisphere (Equator).
                Original height was 500 (South Pole).
            */}
            <svg 
                viewBox={`0 0 ${mapWidth} 250`} 
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
                onClick={() => setHoveredGroup(null)}
            >
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    
                    <mask id="dayNightMask">
                        <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="white" />
                        {sunPositions.map((pos, i) => (
                             <circle 
                                key={i}
                                cx={pos.x} 
                                cy={pos.y} 
                                r={mapWidth * 0.4} 
                                fill="black" 
                                filter="url(#blurMask)"
                            />
                        ))}
                    </mask>

                    <filter id="blurMask">
                        <feGaussianBlur stdDeviation="40" />
                    </filter>
                    
                    <radialGradient id="sunGlint">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6"/>
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                    </radialGradient>
                    
                    <filter id="enhanceImage">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.4" intercept="0"/>
                            <feFuncG type="linear" slope="1.4" intercept="0"/>
                            <feFuncB type="linear" slope="1.5" intercept="0"/>
                        </feComponentTransfer>
                        <feColorMatrix type="saturate" values="1.4"/>
                    </filter>
                </defs>

                {/* Base Image: NASA Blue Marble Next Generation + Bathymetry + Topography */}
                <image 
                    href="https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Blue_Marble_Next_Generation_%2B_topography_%2B_bathymetry.jpg/1024px-Blue_Marble_Next_Generation_%2B_topography_%2B_bathymetry.jpg"
                    x="0" 
                    y="0" 
                    width={mapWidth} 
                    height={mapHeight}
                    preserveAspectRatio="none"
                    filter="url(#enhanceImage)"
                />

                {/* Night Shadow Overlay */}
                <rect 
                    width={mapWidth} 
                    height={mapHeight} 
                    fill="#020408" 
                    opacity="0.85" 
                    mask="url(#dayNightMask)" 
                    style={{ pointerEvents: 'none', mixBlendMode: 'multiply' }}
                />
                
                {/* Sun Reflection */}
                {sunPositions.map((pos, i) => (
                    <circle key={i} cx={pos.x} cy={pos.y} r="100" fill="url(#sunGlint)" style={{ mixBlendMode: 'screen' }} pointerEvents="none" />
                ))}

                {/* Grid Lines */}
                <line x1="0" y1={mapHeight/2} x2={mapWidth} y2={mapHeight/2} stroke="white" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.1" />

                {/* Server Markers */}
                {serverGroups.map((group) => {
                    if (!group.coordinates) return null;
                    const { x, y } = project(group.coordinates.lat, group.coordinates.lng);
                    const status = getGroupStatus(group);
                    
                    // Explicitly cast to ServerStatus to avoid TS errors
                    const isCaution = status === ServerStatus.Caution;

                    return (
                        <g 
                            key={group.region} 
                            className="cursor-pointer group/marker hover:brightness-110 transition-all"
                            onMouseEnter={(e) => handleMouseEnter(e, group, status)}
                            onMouseLeave={() => setHoveredGroup(null)}
                            onClick={(e) => handleMarkerClick(e, group)}
                        >
                            {/* Pulse Animation for Operational */}
                            {status === ServerStatus.Operational && (
                                <circle cx={x} cy={y} r="8" fill="none" stroke="#34d399" strokeWidth="1.5" opacity="0.5">
                                    <animate attributeName="r" from="8" to="32" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                                </circle>
                            )}

                            {/* Dynamic Icon Group */}
                            <g transform={`translate(${x - 12}, ${y - 12})`}>
                                {status === ServerStatus.Operational && (
                                     <g filter="url(#glow)">
                                        <circle cx="12" cy="12" r="10" fill="#059669" stroke="white" strokeWidth="2" />
                                        <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                     </g>
                                )}
                                {status === ServerStatus.Unreachable && (
                                     <g filter="url(#glow)">
                                        <circle cx="12" cy="12" r="10" fill="#dc2626" stroke="white" strokeWidth="2" />
                                        <path d="M15 9L9 15M9 9L15 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                     </g>
                                )}
                                {isCaution && (
                                     <g filter="url(#glow)">
                                        <circle cx="12" cy="12" r="10" fill="#f97316" stroke="white" strokeWidth="2" />
                                        <path d="M12 7L12 13M12 16L12.01 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                     </g>
                                )}
                                {status === ServerStatus.Checking && (
                                    <g>
                                        <circle cx="12" cy="12" r="10" fill="#1e293b" fillOpacity="0.8" stroke="white" strokeWidth="2" />
                                        <circle cx="12" cy="12" r="7" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 12" fill="none">
                                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                    </g>
                                )}
                                {(status !== ServerStatus.Operational && status !== ServerStatus.Unreachable && !isCaution && status !== ServerStatus.Checking) && (
                                     <circle cx="12" cy="12" r="8" fill="#64748b" stroke="white" strokeWidth="2" />
                                )}
                            </g>
                        </g>
                    );
                })}
            </svg>

            {/* Footer Overlay - Unified Alignment */}
            <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-white/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></span> 
                        <span className="font-mono text-[10px] font-bold tracking-widest">UTC {time.toISOString().split('T')[1].split('.')[0]}</span>
                    </div>
                </div>
                
                {/* Timezone Clocks */}
                <div className="flex items-center gap-8">
                    {serverGroups.slice(0, 3).map(group => {
                         const tz = group.region.includes('EU') ? 'Europe/Prague' : 
                                   group.region.includes('Japan') ? 'Asia/Tokyo' : 
                                   'America/Denver';
                         const localTime = new Date().toLocaleTimeString('en-US', { 
                            timeZone: tz,
                            hour: '2-digit', minute: '2-digit', hour12: false 
                        });
                        
                        return (
                            <div key={group.region} className="text-right group cursor-default">
                                <div className="text-[9px] text-emerald-400/80 uppercase font-bold tracking-wider mb-0.5 group-hover:text-emerald-300 transition-colors">{group.region.split('(')[0]}</div>
                                <div className="text-xs font-mono text-white font-bold tracking-wide">{localTime}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        
        {/* Fixed Tooltip (Portal-like behavior) */}
        {hoveredGroup && (
            <div 
                className="fixed z-50 min-w-[200px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl p-3 text-left pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
                style={{
                    left: hoveredGroup.rect.left + hoveredGroup.rect.width / 2,
                    top: hoveredGroup.rect.top,
                    transform: 'translate(-50%, -125%)'
                }}
            >
                <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                     <span className="text-xs font-bold text-slate-100">{hoveredGroup.group.region.split('(')[0].trim()}</span>
                     {hoveredGroup.status === ServerStatus.Operational && <span className="text-[10px] text-emerald-400 font-bold tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> LIVE</span>}
                     {hoveredGroup.status === ServerStatus.Unreachable && <span className="text-[10px] text-rose-400 font-bold tracking-wider flex items-center gap-1"><XCircle className="w-3 h-3"/> DOWN</span>}
                     {hoveredGroup.status === ServerStatus.Caution && <span className="text-[10px] text-orange-400 font-bold tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> CAUTION</span>}
                     {hoveredGroup.status === ServerStatus.Checking && <span className="text-[10px] text-blue-400 font-bold tracking-wider flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> CHK</span>}
                </div>
                
                <div className="space-y-1.5">
                     <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Monitored Endpoints</div>
                     <div className="text-[10px] text-slate-400 italic mb-1">Click for detailed history</div>
                     {hoveredGroup.group.servers.slice(0, 3).map((s, i) => (
                         <div key={i} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                hoveredGroup.status === ServerStatus.Operational ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 
                                hoveredGroup.status === ServerStatus.Unreachable ? 'bg-rose-500' : 
                                hoveredGroup.status === ServerStatus.Caution ? 'bg-orange-500' : 'bg-slate-500'
                            }`}></div>
                            <span className="text-[10px] font-mono text-slate-300 tracking-tight">{s.ip}</span>
                         </div>
                     ))}
                     {hoveredGroup.group.servers.length > 3 && (
                         <div className="text-[9px] text-slate-500 pl-3.5">
                             + {hoveredGroup.group.servers.length - 3} more...
                         </div>
                     )}
                </div>
                
                {/* Arrow */}
                <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95"></div>
            </div>
        )}
    </div>
  );
};