import React from 'react';
import { ServerStatus } from '../types';
import { CheckCircle2, XCircle, Loader2, HelpCircle, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: ServerStatus;
  variant?: 'full' | 'icon';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'full' }) => {
  if (variant === 'icon') {
    switch (status) {
      case ServerStatus.Operational:
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-label="Operational" />;
      case ServerStatus.Unreachable:
        return <XCircle className="w-5 h-5 text-rose-500" aria-label="Unreachable" />;
      case ServerStatus.Caution:
        return <AlertTriangle className="w-5 h-5 text-orange-500" aria-label="Caution" />;
      case ServerStatus.Checking:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" aria-label="Checking" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-400" aria-label="Unknown" />;
    }
  }

  switch (status) {
    case ServerStatus.Operational:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Operational
        </span>
      );
    case ServerStatus.Unreachable:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
          <XCircle className="w-3 h-3 mr-1" />
          Unreachable
        </span>
      );
    case ServerStatus.Caution:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Caution
        </span>
      );
    case ServerStatus.Checking:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Checking...
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
          <HelpCircle className="w-3 h-3 mr-1" />
          Unknown
        </span>
      );
  }
};