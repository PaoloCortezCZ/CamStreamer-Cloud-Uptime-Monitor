import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ServerGroup, ServerStatus, HistoryPoint, Region } from '../types';

export const generateReport = (
  serverGroups: ServerGroup[],
  statuses: Record<string, ServerStatus>,
  latencies: Record<string, number>,
  histories: Record<string, HistoryPoint[]>
) => {
  const doc = new jsPDF();
  const now = new Date();

  // --- Header ---
  doc.setFontSize(18);
  doc.text("CamStreamer Cloud Status Report", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleString()}`, 14, 26);
  doc.text("Scope: Global Infrastructure", 14, 31);

  // --- 1. Current Status Summary ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("1. Current System Status", 14, 45);

  const currentStatusData: any[] = [];
  
  serverGroups.forEach(group => {
    group.servers.forEach(server => {
      const status = statuses[server.ip] || ServerStatus.Unknown;
      const latency = latencies[server.ip] ? `${latencies[server.ip]}ms` : '-';
      
      currentStatusData.push([
        group.region,
        server.ip,
        status,
        latency
      ]);
    });
  });

  autoTable(doc, {
    startY: 50,
    head: [['Region', 'Server IP', 'Status', 'Latency']],
    body: currentStatusData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    styles: { fontSize: 9 },
    columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 }
    },
    didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
            const raw = data.cell.raw as string;
            if (raw === ServerStatus.Operational) data.cell.styles.textColor = [16, 185, 129]; // Green
            else if (raw === ServerStatus.Unreachable) data.cell.styles.textColor = [225, 29, 72]; // Red
            else if (raw === ServerStatus.Caution) data.cell.styles.textColor = [245, 158, 11]; // Orange
        }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || 100;

  // --- 2. Regional Performance (Average Latency) ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("2. Regional Performance", 14, finalY + 15);

  const regionPerformanceData: any[] = [];
  
  serverGroups.forEach(group => {
    let totalLatency = 0;
    let count = 0;
    
    group.servers.forEach(server => {
      const lat = latencies[server.ip];
      if (lat !== undefined) {
        totalLatency += lat;
        count++;
      }
    });
    
    const avgLatency = count > 0 ? Math.round(totalLatency / count) : 0;
    const latencyDisplay = count > 0 ? `${avgLatency}ms` : 'N/A';
    
    regionPerformanceData.push([
        group.region,
        latencyDisplay,
        `${count}/${group.servers.length} Reporting`
    ]);
  });

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Region', 'Avg. Latency', 'Data Points']],
    body: regionPerformanceData,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105] }, // Slate-600
    styles: { fontSize: 10 },
  });

  finalY = (doc as any).lastAutoTable.finalY || 150;

  // --- 3. Incident Log & Projections ---
  // Calculate outages from history
  const outageData: any[] = [];
  let totalIncidentCount = 0;
  let oldestTimestamp = Date.now();
  
  serverGroups.forEach(group => {
    group.servers.forEach(server => {
        const history = histories[server.ip] || [];
        if (history.length === 0) return;

        // Find oldest timestamp across all servers to determine monitoring window
        const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
        if (sortedHistory[0].timestamp < oldestTimestamp) {
            oldestTimestamp = sortedHistory[0].timestamp;
        }
        
        let currentIncident: { start: number, end: number, status: ServerStatus } | null = null;

        sortedHistory.forEach((point, index) => {
            const isDown = point.status === ServerStatus.Unreachable || point.status === ServerStatus.Caution;
            
            if (isDown) {
                if (!currentIncident) {
                    // Start new incident
                    currentIncident = { start: point.timestamp, end: point.timestamp, status: point.status };
                    totalIncidentCount++;
                } else if (currentIncident.status === point.status) {
                    // Extend current incident
                    currentIncident.end = point.timestamp;
                } else {
                    // Status changed (e.g., Caution -> Unreachable), push old, start new
                    outageData.push([
                        new Date(currentIncident.start).toLocaleTimeString(),
                        new Date(currentIncident.end).toLocaleTimeString(),
                        server.ip,
                        group.region.split('(')[0].trim(),
                        currentIncident.status
                    ]);
                    // Note: Changing status inside an outage doesn't count as a new "Lost Connection" event for the projection
                    currentIncident = { start: point.timestamp, end: point.timestamp, status: point.status };
                }
            } else {
                if (currentIncident) {
                    // Incident ended
                    outageData.push([
                        new Date(currentIncident.start).toLocaleTimeString(),
                        new Date(currentIncident.end).toLocaleTimeString(),
                        server.ip,
                        group.region.split('(')[0].trim(),
                        currentIncident.status
                    ]);
                    currentIncident = null;
                }
            }
            
            // Handle ongoing incident at the end of the list
            if (index === sortedHistory.length - 1 && currentIncident) {
                 outageData.push([
                    new Date(currentIncident.start).toLocaleTimeString(),
                    "Ongoing",
                    server.ip,
                    group.region.split('(')[0].trim(),
                    currentIncident.status
                ]);
            }
        });
    });
  });

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("3. Incident Log (Last 60 Minutes)", 14, finalY + 15);

  if (outageData.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("No outages or warnings detected in the monitored period.", 14, finalY + 25);
      finalY += 30; // Adjust for next section
  } else {
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Start Time', 'End Time', 'Server IP', 'Region', 'Type']],
        body: outageData,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72] }, // Red header for incidents
        styles: { fontSize: 9 },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                 const raw = data.cell.raw as string;
                 if (raw === ServerStatus.Unreachable) {
                     data.cell.styles.fontStyle = 'bold';
                     data.cell.styles.textColor = [225, 29, 72];
                 } else if (raw === ServerStatus.Caution) {
                     data.cell.styles.textColor = [245, 158, 11];
                 }
            }
        }
      });
      finalY = (doc as any).lastAutoTable.finalY;
  }

  // --- 4. Projected Stability ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("4. Stability Projections", 14, finalY + 15);

  // Calculate monitoring duration in minutes
  const nowTs = Date.now();
  const monitorDurationMinutes = Math.max((nowTs - oldestTimestamp) / (1000 * 60), 1); // Avoid div by zero, min 1 minute
  
  // Projection: (Incidents / Minutes) * 1440 minutes per day
  const projectedOutages = Math.round((totalIncidentCount / monitorDurationMinutes) * 1440);
  const outageRate = (totalIncidentCount / monitorDurationMinutes).toFixed(2);

  const projectionData = [
      ['Monitored Duration', `${Math.round(monitorDurationMinutes)} minutes`],
      ['Total Incidents Detected', `${totalIncidentCount}`],
      ['Incident Rate', `${outageRate} per minute`],
      ['Projected Connections Lost (24h)', `${projectedOutages} (Approx.)`]
  ];

  autoTable(doc, {
      startY: finalY + 20,
      head: [['Metric', 'Value']],
      body: projectionData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 80 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 3) {
             // Highlight the projection row
             data.cell.styles.fontStyle = 'bold';
             data.cell.styles.textColor = [79, 70, 229];
        }
      }
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("CamStreamer Cloud Monitor • Automated Report", 14, 290);

  doc.save(`CamStreamer_Status_Report_${now.toISOString().split('T')[0]}.pdf`);
};