import React from 'react';
import { X } from 'lucide-react';
import { ServerGroup, ServerStatus, HistoryPoint } from '../types';
import { ServerCard } from './ServerCard';

interface ServerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ServerGroup | null;
  statuses: Record<string, ServerStatus>;
  latencies: Record<string, number>;
  histories: Record<string, HistoryPoint[]>;
}

export const ServerDetailModal: React.FC<ServerDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  group, 
  statuses, 
  latencies,
  histories 
}) => {
  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all animate-in zoom-in-95 slide-in-from-bottom-5">
        <button 
            onClick={onClose}
            className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-500 hover:text-slate-800 hover:scale-110 transition-all z-10"
        >
            <X className="w-5 h-5" />
        </button>

        <div className="overflow-hidden rounded-2xl">
            {/* Reuse ServerCard logic but with full styling */}
            <ServerCard 
                groups={[group]} 
                statuses={statuses} 
                latencies={latencies}
                histories={histories} 
                className="border-none shadow-none rounded-none"
            />
        </div>
      </div>
    </div>
  );
};