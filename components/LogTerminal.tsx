
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';

interface LogTerminalProps {
  logs: string[];
  type: 'flash' | 'thinking';
  streamText?: string; 
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, type, streamText }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, streamText]);

  const isThinking = type === 'thinking';
  const hasStream = !!streamText;

  return (
    <div className="flex flex-col h-full bg-[#0D0D0D] rounded-[2rem] border border-white/5 overflow-hidden font-mono text-[10px] shadow-inner">
      
      {/* Console Header */}
      <div className="bg-white/[0.03] px-5 py-2.5 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${hasStream ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''} ${isThinking ? 'bg-[#D0BCFF] text-[#D0BCFF]' : 'bg-[#8AB4F8] text-[#8AB4F8]'}`}></div>
            <span className={`font-black uppercase tracking-[0.2em] ${isThinking ? 'text-[#D0BCFF]' : 'text-[#8AB4F8]'}`}>
                {hasStream ? (isThinking ? 'Pro Reasoning Stream' : 'Flash Reasoning Stream') : (isThinking ? 'CoT Reasoning' : 'Event Log')}
            </span>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white/5"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/5"></div>
        </div>
      </div>

      {/* Console Body */}
      <div 
        ref={scrollRef} 
        className="flex-1 p-5 overflow-y-auto space-y-2 custom-scrollbar"
      >
        {streamText ? (
           <div className={`whitespace-pre-wrap leading-relaxed ${isThinking ? 'text-[#D0BCFF]/70 italic' : 'text-[#8AB4F8]/70 italic'}`}>
             {streamText.replace(/<[^>]*>?/gm, '')}
             <span className={`inline-block w-1.5 h-3 ml-1 animate-blink ${isThinking ? 'bg-[#D0BCFF]' : 'bg-[#8AB4F8]'}`}></span>
           </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-white/10 shrink-0 select-none">
                {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={type === 'flash' ? 'text-[#8AB4F8]/80' : 'text-[#D0BCFF]/80'}>
                {log}
              </span>
            </div>
          ))
        )}
        
        {logs.length === 0 && !streamText && (
          <div className="text-white/10 italic flex items-center gap-2 h-full justify-center">
             IDLE_STANDBY
          </div>
        )}
      </div>
    </div>
  );
};
