
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { MergedProfile } from '../types';
import { CheckCircle2, TrendingUp, User, Activity } from 'lucide-react';

interface DataCardProps {
  data: MergedProfile | null;
  loading: boolean;
}

export const DataCard: React.FC<DataCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="w-full bg-white/[0.02] rounded-[2rem] p-12 border border-white/5 flex flex-col items-center justify-center min-h-[340px] gap-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8AB4F8]/5 to-transparent animate-pulse"></div>
        <div className="relative">
           <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-[#8AB4F8] animate-spin"></div>
           <Activity className="absolute inset-0 m-auto text-[#8AB4F8]/30 animate-pulse" size={20} />
        </div>
        <div className="text-center space-y-1">
           <p className="text-xs font-black tracking-widest text-[#8AB4F8] uppercase">Synthesizing</p>
           <p className="text-[10px] text-white/30 italic">Processing high-dimensional data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full bg-white/[0.01] rounded-[2rem] p-12 border border-white/5 border-dashed flex items-center justify-center min-h-[340px]">
        <div className="text-center opacity-20">
            <User size={32} className="mx-auto mb-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Awaiting Identity</span>
        </div>
      </div>
    );
  }

  const isUpdated = (field: string) => data.updates_applied.some(f => f.toLowerCase().includes(field.toLowerCase()));

  return (
    <div className="w-full bg-[#161616] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-700 hover:border-white/10 group">
      
      {/* Header */}
      <div className="bg-white/[0.03] px-6 py-3.5 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isUpdated('') ? 'bg-[#A8DAB5] shadow-[0_0_8px_#A8DAB5]' : 'bg-white/20'}`}></div>
            <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">Identity Verified</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-mono text-white/30">CONF:</span>
           <span className="text-[10px] font-bold text-[#8AB4F8]">{(data.confidence_score * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Primary Info */}
        <div className="space-y-4">
            <div className="relative">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Full Name</label>
                <div className={`text-lg font-semibold tracking-tight ${isUpdated('name') ? 'text-[#A8DAB5]' : 'text-white/90'}`}>
                    {data.name}
                </div>
                {isUpdated('name') && <div className="absolute top-0 right-0 text-[8px] bg-[#A8DAB5]/20 text-[#A8DAB5] px-1.5 py-0.5 rounded uppercase font-bold">Patched</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Contact Email</label>
                  <div className={`text-[11px] font-mono truncate ${isUpdated('email') ? 'text-[#A8DAB5]' : 'text-white/50'}`}>
                    {data.email}
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Phone Record</label>
                  <div className={`text-[11px] font-mono ${isUpdated('phone') ? 'text-[#A8DAB5]' : 'text-white/50'}`}>
                    {data.phone || 'None'}
                  </div>
               </div>
            </div>
        </div>

        {/* Intelligence Row */}
        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
           <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/30 uppercase">Sentiment</span>
              <span className={`text-[10px] font-bold ${data.latest_sentiment === 'Positive' ? 'text-[#A8DAB5]' : data.latest_sentiment === 'Negative' ? 'text-red-400' : 'text-blue-300'}`}>
                {data.latest_sentiment}
              </span>
           </div>
           <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/30 uppercase">Intent</span>
              <span className="text-[10px] font-bold text-[#D0BCFF]">{data.identified_intent}</span>
           </div>
           <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/30 uppercase">Tier</span>
              <span className="text-[10px] font-bold text-white/80">{data.current_tier}</span>
           </div>
        </div>

        {/* Change Indicator */}
        {data.updates_applied.length > 0 ? (
          <div className="bg-[#A8DAB5]/5 p-3 rounded-2xl border border-[#A8DAB5]/20 flex items-center gap-3">
             <div className="bg-[#A8DAB5] p-1 rounded-md">
                <TrendingUp size={12} className="text-[#003816]" />
             </div>
             <div className="text-[10px] text-[#A8DAB5]/80 font-medium leading-tight">
               Resolved {data.updates_applied.length} delta{data.updates_applied.length > 1 ? 's' : ''} from transcript.
             </div>
          </div>
        ) : (
          <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
             <div className="bg-white/10 p-1 rounded-md">
                <CheckCircle2 size={12} className="text-white/40" />
             </div>
             <div className="text-[10px] text-white/40 font-medium">
               Verified: No state changes required.
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
