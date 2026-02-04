
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateInputData } from './constants';
import { InputData, ProcessedResult, ModelResolution, MergedProfile, CustomerRecord } from './types';
import { mergeWithFlash, mergeWithProStream, consolidateResults, summarizeTranscript } from './services/geminiService';
import { DataCard } from './components/DataCard';
import { LogTerminal } from './components/LogTerminal';
import { 
  Zap, Play, RotateCw, Database, MessageSquare, 
  Layers, Brain, ChevronRight, Timer, BarChart3, 
  Trash2, XCircle, Filter, SortAsc, SortDesc, ChevronDown, ChevronUp,
  Cpu, AlertCircle, RefreshCcw, Loader2, Sparkles, ShieldCheck,
  Download, Plus, X, FileJson, FileText, Info
} from 'lucide-react';

const STORAGE_KEY = 'resolution_lab_state_v1';
const MODEL_CONFIG_KEY = 'resolution_lab_model_config';

type ProcessingMode = 'Flash' | 'Pro' | 'Both';

const App: React.FC = () => {
  const [queue, setQueue] = useState<InputData[]>([]);
  const [history, setHistory] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ProcessingMode>('Both');
  const [showManualModal, setShowManualModal] = useState(false);
  
  // Manual Input State
  const [manualName, setManualName] = useState('John Doe');
  const [manualEmail, setManualEmail] = useState('john@example.com');
  const [manualTranscript, setManualTranscript] = useState('I need to update my email to john.doe@newfirm.com');

  // Filter & Sort State
  const [filterTier, setFilterTier] = useState<string>('All');
  const [sortField, setSortField] = useState<'name' | 'id' | 'timestamp'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Expansion State for History
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const queueRef = useRef<InputData[]>([]);
  const isAtBottomRef = useRef(true);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedMode = localStorage.getItem(MODEL_CONFIG_KEY) as ProcessingMode;

    if (savedMode) setSelectedMode(savedMode);

    if (saved) {
      try {
        const { queue: savedQueue, history: savedHistory } = JSON.parse(saved);
        setQueue(savedQueue);
        setHistory(savedHistory);
        queueRef.current = savedQueue;
      } catch (e) {
        console.error("Failed to load state", e);
      }
    } else {
      const initialData = generateInputData(5);
      setQueue(initialData);
      queueRef.current = initialData;
    }
  }, []);

  // Save State & Mode to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ queue, history }));
  }, [queue, history]);

  useEffect(() => {
    localStorage.setItem(MODEL_CONFIG_KEY, selectedMode);
  }, [selectedMode]);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollY, innerHeight } = window;
      const { scrollHeight } = document.documentElement;
      isAtBottomRef.current = scrollHeight - (scrollY + innerHeight) < 150;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && history.length > 0) {
      setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 200);
    }
  }, [history]);

  const addToQueue = () => {
    const newData = generateInputData(5);
    const updatedQueue = [...queue, ...newData];
    setQueue(updatedQueue);
    queueRef.current = updatedQueue;
  };

  const addManualToQueue = () => {
    const id = Math.random().toString(36).substring(7).toUpperCase();
    const customerRecord: CustomerRecord = {
      customer_id: `MAN-${id}`,
      name: manualName,
      email: manualEmail,
      phone: null,
      current_tier: 'Silver',
      last_updated: new Date().toISOString().split('T')[0]
    };
    const newItem: InputData = {
      id,
      customerRecord,
      chatTranscript: manualTranscript,
      timestamp: Date.now()
    };
    const updatedQueue = [...queue, newItem];
    setQueue(updatedQueue);
    queueRef.current = updatedQueue;
    setShowManualModal(false);
  };

  const clearQueue = () => {
    setQueue([]);
    queueRef.current = [];
  };

  const clearHistory = () => {
    setHistory([]);
    setExpandedIds(new Set());
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const exportData = (format: 'json' | 'csv', historyId?: string) => {
    const dataToExport = historyId 
      ? history.filter(h => h.id === historyId)
      : history;
    
    if (dataToExport.length === 0) return;

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      const content = JSON.stringify(dataToExport, null, 2);
      blob = new Blob([content], { type: 'application/json' });
      filename = `resolution_lab_export_${historyId || 'all'}.json`;
    } else {
      // CSV Export (Flattening basic fields)
      const headers = ['ID', 'Customer', 'Sentiment', 'Intent', 'Confidence', 'Tier'];
      const rows = dataToExport.map(h => {
        const out = h.consolidated?.output || h.pro.output || h.flash.output;
        return [
          h.id,
          out?.name || h.input.customerRecord.name,
          out?.latest_sentiment || 'N/A',
          out?.identified_intent || 'N/A',
          out?.confidence_score || 0,
          out?.current_tier || 'N/A'
        ].join(',');
      });
      const content = [headers.join(','), ...rows].join('\n');
      blob = new Blob([content], { type: 'text/csv' });
      filename = `resolution_lab_export_${historyId || 'all'}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Main processing logic for a single item
   */
  const executeItemProcessing = async (item: InputData, mode: ProcessingMode) => {
    let flashRes: MergedProfile | null = null;
    let proRes: MergedProfile | null = null;

    // Trigger Summary Generation
    summarizeTranscript(item.chatTranscript).then(summary => {
      setHistory(prev => prev.map(h => h.id === item.id ? { ...h, summary } : h));
    });

    const flashPromise = (mode === 'Flash' || mode === 'Both') ? (async () => {
      const flashStart = performance.now();
      await mergeWithFlash(
        item,
        (text) => {
          setHistory(prev => prev.map(h => h.id === item.id ? {
            ...h,
            flash: { ...h.flash, thinkingText: text }
          } : h));
        },
        (json) => {
          flashRes = json;
          const duration = performance.now() - flashStart;
          setHistory(prev => prev.map(h => h.id === item.id ? {
            ...h,
            flash: { ...h.flash, output: json, durationMs: duration, status: 'completed', logs: ['Flash: Rapid Merge Complete.'] }
          } : h));
        },
        (err) => {
          setHistory(prev => prev.map(h => h.id === item.id ? {
            ...h,
            flash: { ...h.flash, status: 'error', logs: [err] }
          } : h));
        }
      );
    })() : Promise.resolve();

    const proPromise = (mode === 'Pro' || mode === 'Both') ? (async () => {
      const proStart = performance.now();
      await mergeWithProStream(
        item,
        (text) => {
          setHistory(prev => prev.map(h => h.id === item.id ? {
            ...h,
            pro: { ...h.pro, thinkingText: text }
          } : h));
        },
        (json) => {
          proRes = json;
          const duration = performance.now() - proStart;
          setHistory(prev => prev.map(h => h.id === item.id ? {
            ...h,
            pro: { ...h.pro, output: json, durationMs: duration, status: 'completed', logs: ['Pro: Deep reasoning complete.'] }
          } : h));
        },
        (err) => {
          setHistory(prev => prev.map(h => h.id === item.id ? {
            ...h,
            pro: { ...h.pro, status: 'error', logs: [err] }
          } : h));
        }
      );
    })() : Promise.resolve();

    await Promise.all([flashPromise, proPromise]);

    // Handle Consolidation
    if (mode === 'Both' && flashRes && proRes) {
      setHistory(prev => prev.map(h => h.id === item.id ? {
        ...h,
        consolidated: { output: null, logs: ['Initiating synthesis...'], durationMs: 0, status: 'processing' }
      } : h));

      const conStart = performance.now();
      try {
        const finalJson = await consolidateResults(item, flashRes, proRes);
        const conDuration = performance.now() - conStart;
        setHistory(prev => prev.map(h => h.id === item.id ? {
          ...h,
          consolidated: { 
            output: finalJson, 
            logs: ['Consolidation complete: Golden Record established.'], 
            durationMs: conDuration, 
            status: 'completed' 
          }
        } : h));
      } catch (err) {
        setHistory(prev => prev.map(h => h.id === item.id ? {
          ...h,
          consolidated: { 
            output: null, 
            logs: [`Consolidation Error: ${err instanceof Error ? err.message : 'Arbiter failed.'}`], 
            durationMs: 0, 
            status: 'error' 
          }
        } : h));
      }
    }
  };

  const handleRetry = async (id: string) => {
    const itemEntry = history.find(h => h.id === id);
    if (!itemEntry) return;

    // Reset status to processing for selected models
    setHistory(prev => prev.map(h => h.id === id ? {
      ...h,
      flash: (selectedMode === 'Flash' || selectedMode === 'Both') 
        ? { ...h.flash, status: 'processing', logs: [], thinkingText: '' } 
        : h.flash,
      pro: (selectedMode === 'Pro' || selectedMode === 'Both') 
        ? { ...h.pro, status: 'processing', logs: [], thinkingText: '' } 
        : h.pro,
      consolidated: undefined
    } : h));

    await executeItemProcessing(itemEntry.input, selectedMode);
  };

  const processQueue = async () => {
    if (isProcessing || queueRef.current.length === 0) return;
    setIsProcessing(true);

    const processNext = async () => {
      if (queueRef.current.length === 0) {
        setIsProcessing(false);
        return;
      }

      const item = queueRef.current.shift()!;
      setQueue([...queueRef.current]);

      const initialRes = (status: 'pending' | 'processing'): ModelResolution => ({ 
        output: null, logs: [], durationMs: 0, status, thinkingText: '' 
      });

      const newEntry: ProcessedResult = {
        id: item.id,
        input: item,
        flash: initialRes(selectedMode === 'Pro' ? 'pending' : 'processing'),
        pro: initialRes(selectedMode === 'Flash' ? 'pending' : 'processing')
      };

      setHistory(prev => [...prev, newEntry]);
      await executeItemProcessing(item, selectedMode);

      if (queueRef.current.length > 0) {
        setTimeout(processNext, 1500); 
      } else {
        setIsProcessing(false);
      }
    };

    processNext();
  };

  const filteredQueue = useMemo(() => {
    return queue
      .filter(item => filterTier === 'All' || item.customerRecord.current_tier === filterTier)
      .sort((a, b) => {
        let valA, valB;
        if (sortField === 'name') {
          valA = a.customerRecord.name.toLowerCase();
          valB = b.customerRecord.name.toLowerCase();
        } else if (sortField === 'id') {
          valA = a.id;
          valB = b.id;
        } else {
          valA = a.timestamp;
          valB = b.timestamp;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [queue, filterTier, sortField, sortOrder]);

  const tiers = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum'];

  const modes: { id: ProcessingMode; icon: any; color: string }[] = [
    { id: 'Flash', icon: Zap, color: 'text-[#8AB4F8]' },
    { id: 'Pro', icon: Brain, color: 'text-[#D0BCFF]' },
    { id: 'Both', icon: Cpu, color: 'text-white' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E3E3E3] font-sans selection:bg-[#8AB4F8]/30">
      
      {/* Manual Input Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111111] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl p-8 relative">
            <button 
              onClick={() => setShowManualModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Plus className="text-[#8AB4F8]" /> Manual Item Entry
            </h2>
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-white/30 mb-2 block">Customer Name</label>
                 <input 
                  type="text" 
                  value={manualName} 
                  onChange={e => setManualName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8AB4F8]/40 transition-colors"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-white/30 mb-2 block">Email Address</label>
                 <input 
                  type="email" 
                  value={manualEmail} 
                  onChange={e => setManualEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8AB4F8]/40 transition-colors"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-white/30 mb-2 block">Chat Transcript</label>
                 <textarea 
                  rows={4}
                  value={manualTranscript} 
                  onChange={e => setManualTranscript(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8AB4F8]/40 transition-colors resize-none"
                 />
               </div>
               <button 
                onClick={addManualToQueue}
                className="w-full bg-[#8AB4F8] text-[#001D35] font-bold py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-[#8AB4F8]/10"
               >
                 Add to Processing Queue
               </button>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-gradient-to-br from-[#8AB4F8] to-[#D0BCFF] p-2.5 rounded-xl shadow-lg shadow-[#8AB4F8]/20">
              <Layers className="text-[#001D35]" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Identity Resolution Lab
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8AB4F8] font-bold">
                Resolution Engine Configuration
              </p>
            </div>
          </div>

          <div className="relative flex items-center bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 h-12 min-w-[320px]">
            <div 
              className="absolute h-[calc(100%-12px)] top-1.5 rounded-xl bg-white/10 shadow-lg border border-white/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: `calc(${100 / modes.length}% - 8px)`,
                left: `calc(${(modes.findIndex(m => m.id === selectedMode) * 100) / modes.length}% + 4px)`,
              }}
            />
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`relative flex-1 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 z-10 ${
                  selectedMode === mode.id ? 'text-white' : 'text-white/30 hover:text-white/50'
                }`}
              >
                <mode.icon size={14} className={selectedMode === mode.id ? mode.color : 'text-current'} />
                {mode.id}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button 
                onClick={clearHistory} 
                title="Clear History"
                className="p-2.5 rounded-full hover:bg-white/5 text-white/40 transition-colors"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => exportData('json')}
                title="Export All JSON"
                className="p-2.5 rounded-full hover:bg-white/5 text-white/40 transition-colors"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={clearQueue} 
                title="Clear Queue"
                className="p-2.5 rounded-full hover:bg-white/5 text-red-400/60 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowManualModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 text-sm font-medium hover:bg-white/5 transition-all"
              >
                <Plus size={16} />
                Manual
              </button>
              <button 
                onClick={addToQueue} 
                className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 text-sm font-medium hover:bg-white/5 transition-all"
              >
                <RotateCw size={16} />
                Bulk Inject
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {isProcessing && (
                <div className="flex items-center gap-2 pr-1 animate-in fade-in slide-in-from-right-2 duration-500">
                  <div className="relative flex items-center justify-center">
                    <Loader2 size={14} className="text-[#8AB4F8] animate-spin" />
                    <div className="absolute w-1.5 h-1.5 bg-[#8AB4F8] rounded-full animate-ping opacity-20"></div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#8AB4F8]/60 animate-pulse">Running</span>
                </div>
              )}
              <button 
                onClick={processQueue}
                disabled={isProcessing || queue.length === 0}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-full text-sm font-bold transition-all ${
                  isProcessing || queue.length === 0 
                  ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                  : 'bg-[#8AB4F8] text-[#001D35] hover:scale-105 shadow-xl shadow-[#8AB4F8]/20'
                }`}
              >
                <Play size={16} fill="currentColor" />
                {isProcessing ? 'Resolving...' : 'Start Battle'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Queue & Metrics */}
        <aside className="lg:col-span-3 flex flex-col gap-6 lg:sticky lg:top-28 lg:h-[calc(100vh-140px)]">
          <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-6 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Database size={14} /> Incoming Stream
              </h3>
              <span className="bg-[#8AB4F8]/10 text-[#8AB4F8] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#8AB4F8]/20">
                {filteredQueue.length} / {queue.length}
              </span>
            </div>

            {/* Controls Bar */}
            <div className="space-y-3 mb-6 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-white/20" />
                <select 
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="flex-1 bg-transparent text-[10px] font-bold text-white/60 focus:outline-none cursor-pointer"
                >
                  {tiers.map(t => <option key={t} value={t} className="bg-[#111111]">{t} Tier</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-white/5 rounded transition-colors"
                >
                  {sortOrder === 'asc' ? <SortAsc size={12} className="text-[#8AB4F8]" /> : <SortDesc size={12} className="text-[#8AB4F8]" />}
                </button>
                <select 
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="flex-1 bg-transparent text-[10px] font-bold text-white/60 focus:outline-none cursor-pointer"
                >
                  <option value="timestamp" className="bg-[#111111]">Sort by Time</option>
                  <option value="name" className="bg-[#111111]">Sort by Name</option>
                  <option value="id" className="bg-[#111111]">Sort by ID</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {filteredQueue.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-[10px] text-white/10 uppercase font-black tracking-widest text-center px-4">
                  Queue Empty or Filtered
                </div>
              ) : (
                filteredQueue.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#8AB4F8]/20 transition-all group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-white/40">{item.id}</span>
                      <span className="text-[10px] text-white/20">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">{item.customerRecord.name}</div>
                      <span className="text-[8px] uppercase font-bold text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                        {item.customerRecord.current_tier}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/5 rounded-[2rem] p-6">
             <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
               <BarChart3 size={14} /> Efficiency Gain
             </h3>
             <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Flash Avg:</span>
                  <span className="text-[#8AB4F8] font-mono">~350ms</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#8AB4F8] h-full w-[20%]"></div>
                </div>
                <div className="flex justify-between text-xs mt-4">
                  <span className="text-white/40">Pro Avg:</span>
                  <span className="text-[#D0BCFF] font-mono">~4500ms</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#D0BCFF] h-full w-[85%]"></div>
                </div>
             </div>
          </div>
        </aside>

        {/* Right: Processing Stage */}
        <section className="lg:col-span-9 space-y-12 pb-32">
          
          {history.length === 0 ? (
            <div className="h-[70vh] flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/10 rounded-[3rem]">
              <Brain size={64} className="mb-6 animate-pulse" />
              <p className="text-2xl font-light">Laboratory Awaiting Data</p>
              <p className="text-sm mt-2">Initialize battle to see Flash vs Thinking performance.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {history.map((res, idx) => {
                const isLatest = idx === history.length - 1;
                const isExpanded = expandedIds.has(res.id);

                // Grid layout logic based on which models processed
                const showFlash = res.flash.status !== 'pending';
                const showPro = res.pro.status !== 'pending';

                return (
                  <div key={res.id} className={`transition-all duration-700 ${isLatest ? 'opacity-100 scale-100' : 'opacity-60 grayscale-[0.3]'}`}>
                    
                    <div 
                      onClick={() => toggleExpand(res.id)}
                      className="flex items-center gap-6 mb-8 px-4 cursor-pointer group hover:bg-white/[0.02] py-2 rounded-2xl transition-all"
                    >
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-[#8AB4F8]" />
                        <h4 className="text-xs font-black tracking-[0.3em] uppercase text-white/60">
                          {res.input.customerRecord.name} — {res.id}
                        </h4>
                        {isExpanded ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                      {/* Left: Input Detail */}
                      <div className="xl:col-span-3 space-y-4">
                         <div className="p-5 rounded-[2rem] bg-white/[0.03] border border-white/5 relative overflow-hidden group">
                           <div className="flex justify-between items-center mb-3">
                              <p className="text-[11px] font-bold text-[#8AB4F8] uppercase">Live Transcript</p>
                              {res.summary && (
                                <div className="group/summary relative">
                                  <Info size={14} className="text-white/20 cursor-help" />
                                  <div className="absolute left-full ml-2 top-0 w-48 bg-black border border-white/10 p-2 rounded-lg hidden group-hover/summary:block z-50 text-[10px] text-white/60 shadow-2xl">
                                    {res.summary}
                                  </div>
                                </div>
                              )}
                           </div>
                           <p className="text-sm leading-relaxed text-white/80">"{res.input.chatTranscript}"</p>
                           {isExpanded && res.summary && (
                             <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-1">
                               <p className="text-[10px] font-bold text-white/20 uppercase mb-1">AI Summary</p>
                               <p className="text-xs text-white/40 italic">{res.summary}</p>
                             </div>
                           )}
                         </div>
                         
                         {isExpanded && (
                            <div className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/5 animate-in slide-in-from-top-2 duration-300">
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-[11px] font-bold text-white/30 uppercase">Raw Payload</p>
                                <div className="flex gap-2">
                                  <button onClick={() => exportData('json', res.id)} title="Export JSON"><FileJson size={14} className="text-white/20 hover:text-white/60" /></button>
                                  <button onClick={() => exportData('csv', res.id)} title="Export CSV"><FileText size={14} className="text-white/20 hover:text-white/60" /></button>
                                </div>
                              </div>
                              <pre className="text-[9px] font-mono text-white/40 overflow-hidden break-all whitespace-pre-wrap">
                                {JSON.stringify(res.input.customerRecord, null, 1)}
                              </pre>
                            </div>
                         )}
                      </div>

                      {/* Model Display Logic */}
                      <div className={`${showFlash && showPro ? 'xl:col-span-4' : 'xl:col-span-9'} space-y-4 ${!showFlash ? 'hidden' : ''}`}>
                        <div className="flex justify-between items-end mb-1 px-2">
                           <div className="flex items-center gap-2">
                             <Zap size={16} className="text-[#8AB4F8]" />
                             <span className="text-[10px] font-black uppercase text-[#8AB4F8]">Flash-3-Speed</span>
                           </div>
                           <div className="flex items-center gap-1 text-[10px] font-mono text-white/40">
                             <Timer size={12} /> {res.flash.durationMs > 0 ? `${res.flash.durationMs.toFixed(0)}ms` : '---'}
                           </div>
                        </div>
                        
                        {res.flash.status === 'error' ? (
                          <div className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex flex-col items-center gap-4 text-center">
                             <AlertCircle className="text-red-500" size={24} />
                             <p className="text-xs text-red-500/80 font-medium">Processing Error in Flash Model</p>
                             <p className="text-[10px] text-red-400/50 italic px-4">"{res.flash.logs[0]}"</p>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleRetry(res.id); }}
                               className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold hover:bg-red-600 transition-colors"
                             >
                               <RefreshCcw size={12} /> Retry Resolution
                             </button>
                          </div>
                        ) : (
                          <DataCard data={res.flash.output} loading={res.flash.status === 'processing'} />
                        )}

                        <div className="h-32">
                             <LogTerminal 
                                logs={res.flash.logs} 
                                type="flash" 
                                streamText={res.flash.thinkingText} 
                              />
                        </div>
                      </div>

                      <div className={`${showFlash && showPro ? 'xl:col-span-5' : 'xl:col-span-9'} space-y-4 ${!showPro ? 'hidden' : ''}`}>
                        <div className="flex justify-between items-end mb-1 px-2">
                           <div className="flex items-center gap-2">
                             <Brain size={16} className="text-[#D0BCFF]" />
                             <span className="text-[10px] font-black uppercase text-[#D0BCFF]">Pro-3-Thinking</span>
                           </div>
                           <div className="flex items-center gap-1 text-[10px] font-mono text-white/40">
                             <Timer size={12} /> {res.pro.durationMs > 0 ? `${res.pro.durationMs.toFixed(0)}ms` : '---'}
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                           {res.pro.status === 'error' ? (
                             <div className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex flex-col items-center gap-4 text-center">
                                <AlertCircle className="text-red-500" size={24} />
                                <p className="text-xs text-red-500/80 font-medium">Deep Thinking Interrupted</p>
                                <p className="text-[10px] text-red-400/50 italic px-4">"{res.pro.logs[0]}"</p>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRetry(res.id); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold hover:bg-red-600 transition-colors"
                                >
                                  <RefreshCcw size={12} /> Retry Logic Chain
                                </button>
                             </div>
                           ) : (
                             <DataCard data={res.pro.output} loading={res.pro.status === 'processing'} />
                           )}
                           
                           <div className="h-48">
                              <LogTerminal 
                                logs={res.pro.logs} 
                                type="thinking" 
                                streamText={res.pro.thinkingText} 
                              />
                           </div>
                           {(res.pro.output?.reasoning_insight || isExpanded) && (
                             <div className="p-4 rounded-2xl bg-[#D0BCFF]/5 border border-[#D0BCFF]/20 flex flex-col gap-3 animate-in fade-in duration-500">
                               {res.pro.output?.reasoning_insight && (
                                 <div className="flex gap-3">
                                   <div className="bg-[#D0BCFF] p-1.5 rounded-lg h-fit">
                                     <Brain size={14} className="text-[#4F378B]" />
                                   </div>
                                   <div>
                                     <p className="text-[10px] font-black text-[#D0BCFF] uppercase mb-1">Reasoning Insight</p>
                                     <p className="text-xs text-[#D0BCFF]/80 italic">"{res.pro.output.reasoning_insight}"</p>
                                   </div>
                                 </div>
                               )}
                               {isExpanded && (
                                 <div className="pt-2 border-t border-[#D0BCFF]/10">
                                    <p className="text-[9px] font-black text-white/20 uppercase mb-2">Extended Model Trace</p>
                                    <div className="text-[9px] font-mono text-[#D0BCFF]/40 bg-black/20 p-2 rounded-lg">
                                       RESOLUTION_ID: {res.id}<br/>
                                       TRACE_MODE: HYBRID_DEEP_CHAIN<br/>
                                       MEMORY_TOKENS: {res.pro.thinkingText?.length || 0}
                                    </div>
                                 </div>
                               )}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Consolidated / Golden Record Section */}
                    {res.consolidated && (
                      <div className="mt-8 xl:ml-[25%] xl:w-[75%] animate-in slide-in-from-bottom-4 fade-in duration-1000">
                         <div className="flex items-center justify-between mb-4 px-2">
                           <div className="flex items-center gap-3">
                              <ShieldCheck size={18} className="text-[#A8DAB5]" />
                              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#A8DAB5]">Golden Record Synthesis</span>
                              <div className="h-px w-24 bg-gradient-to-r from-[#A8DAB5]/20 to-transparent"></div>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => exportData('json', res.id)} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 flex items-center gap-2 border border-white/5 transition-colors">
                                <FileJson size={12} /> JSON
                             </button>
                             <button onClick={() => exportData('csv', res.id)} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 flex items-center gap-2 border border-white/5 transition-colors">
                                <FileText size={12} /> CSV
                             </button>
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gradient-to-br from-[#161616] to-[#0D0D0D] p-6 rounded-[2.5rem] border border-[#A8DAB5]/20 shadow-2xl shadow-[#A8DAB5]/5">
                            <div className="md:col-span-8">
                               <DataCard data={res.consolidated.output} loading={res.consolidated.status === 'processing'} />
                            </div>
                            <div className="md:col-span-4 flex flex-col gap-4">
                               <div className="flex-1 bg-black/40 rounded-[1.5rem] border border-white/5 p-4 font-mono text-[10px] overflow-hidden">
                                  <div className="text-[#A8DAB5]/60 mb-2 uppercase font-black tracking-widest border-b border-white/5 pb-2">Synthesis Logs</div>
                                  <div className="space-y-1 text-white/40">
                                    {res.consolidated.logs.map((log, i) => (
                                      <div key={i} className="flex gap-2">
                                        <span className="text-[#A8DAB5] shrink-0">›</span>
                                        <span>{log}</span>
                                      </div>
                                    ))}
                                    {res.consolidated.status === 'processing' && (
                                      <div className="flex gap-2 animate-pulse">
                                        <span className="text-[#A8DAB5] shrink-0">›</span>
                                        <span>Arbiter weighting inputs...</span>
                                      </div>
                                    )}
                                  </div>
                               </div>

                               {/* Confidence Gauge Component */}
                               <div className="p-5 rounded-[1.5rem] bg-[#A8DAB5]/5 border border-[#A8DAB5]/10 flex flex-col items-center gap-4">
                                  <div className="relative w-24 h-24">
                                     <svg className="w-full h-full transform -rotate-90">
                                       <circle
                                         cx="48"
                                         cy="48"
                                         r="40"
                                         stroke="currentColor"
                                         strokeWidth="6"
                                         fill="transparent"
                                         className="text-white/5"
                                       />
                                       <circle
                                         cx="48"
                                         cy="48"
                                         r="40"
                                         stroke="currentColor"
                                         strokeWidth="6"
                                         fill="transparent"
                                         strokeDasharray={251.2}
                                         strokeDashoffset={251.2 - (251.2 * (res.consolidated.output?.confidence_score || 0))}
                                         className="text-[#A8DAB5] transition-all duration-1000 ease-out"
                                         strokeLinecap="round"
                                       />
                                     </svg>
                                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-black text-white leading-none">
                                          {Math.round((res.consolidated.output?.confidence_score || 0) * 100)}%
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#A8DAB5]/60">Trust</span>
                                     </div>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Confidence Score</p>
                                    <p className="text-[9px] text-[#A8DAB5]/60 italic mt-1 leading-tight">Verified across multiple heuristics</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blink 1s infinite; }
        .animate-in { animation-fill-mode: forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-top-1 { from { transform: translateY(-0.25rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-top-2 { from { transform: translateY(-0.5rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-bottom-2 { from { transform: translateY(0.5rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-right-2 { from { transform: translateX(0.5rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .fade-in { animation: fade-in 0.5s ease-out; }
        .slide-in-from-top-1 { animation: slide-in-from-top-1 0.3s ease-out; }
        .slide-in-from-top-2 { animation: slide-in-from-top-2 0.4s ease-out; }
        .slide-in-from-bottom-2 { animation: slide-in-from-bottom-2 0.4s ease-out; }
        .slide-in-from-bottom-4 { animation: slide-in-from-bottom-4 1s cubic-bezier(0.16, 1, 0.3, 1); }
        .slide-in-from-right-2 { animation: slide-in-from-right-2 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
