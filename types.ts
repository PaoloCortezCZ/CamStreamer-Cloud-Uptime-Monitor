export enum Region {
  EU = 'EU (Prague)',
  JP = 'Japan (Tokyo)',
  US = 'USA (Denver)',
  AXIS = 'AXIS Dispatchers',
}

export enum ServerStatus {
  Unknown = 'Unknown',
  Checking = 'Checking',
  Operational = 'Operational',
  Unreachable = 'Unreachable',
  Caution = 'Caution',
}

export interface ServerNode {
  ip: string;
  label?: string;
  isRange?: boolean;
}

export interface ServerGroup {
  region: Region;
  servers: ServerNode[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface FirewallRule {
  port: number;
  protocol: 'TCP' | 'UDP';
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface HistoryPoint {
  timestamp: number;
  status: ServerStatus;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}