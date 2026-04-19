import React, { useEffect, useState, useRef } from 'react';

const LOG_MESSAGES = [
  { agent: 'Coordinator', msg: 'Initializing PropScore Multi-Agent Engine v2.4...', delay: 0 },
  { agent: 'Geospatial Agent', msg: 'Querying OpenStreetMap Node for {location}...', delay: 400 },
  { agent: 'Geospatial Agent', msg: 'Found 14 infrastructure anchors within 500m radius. Indexing proximity score.', delay: 1200 },
  { agent: 'Market Agent', msg: 'Accessing Circle Rate Database. Base set to ₹15,000/sqft.', delay: 1800 },
  { agent: 'Vision Agent', msg: 'Unpacking field verification images. Initiating CNN structural scan.', delay: 2500, conditional: true },
  { agent: 'Vision Agent', msg: 'No visible structural compromise detected. Finishes identified as Standard.', delay: 3600, conditional: true },
  { agent: 'Legal Agent', msg: 'Cross-verifying title status. No active encumbrances logged.', delay: 4100 },
  { agent: 'Risk Agent', msg: 'Synthesizing inputs. Calculating 1-year distress probability.', delay: 5000 },
  { agent: 'Coordinator', msg: 'Consensus reached. Finalizing PropScore ledger.', delay: 6000 }
];

export default function AgentTerminal({ isActive, locationName = "Target", hasImages = false, externalLog = null, blockComplete = false, onComplete }) {
  const [logs, setLogs] = useState([]);
  const containerRef = useRef(null);
  
  const isBlockedRef = useRef(blockComplete);
  useEffect(() => {
     isBlockedRef.current = blockComplete;
  }, [blockComplete]);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      setLogs([]);
      return;
    }

    let timeouts = [];
    
    // Filter conditionals
    const activeLogs = LOG_MESSAGES.map(l => ({ ...l, msg: l.msg.replace('{location}', locationName) }))
      .filter(l => !l.conditional || hasImages);

    activeLogs.forEach((log, index) => {
      const isLast = index === activeLogs.length - 1;
      const t = setTimeout(() => {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          agent: log.agent,
          msg: log.msg,
          id: index
        }]);
        if (isLast && onCompleteRef.current) {
          // Delay completion if blocked by an external action (like a huge model download)
          const attemptCompletion = () => {
             if (!isBlockedRef.current) {
                setTimeout(onCompleteRef.current, 800);
             } else {
                setTimeout(attemptCompletion, 1000);
             }
          };
          attemptCompletion();
        }
      }, log.delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [isActive, locationName, hasImages]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isActive && logs.length === 0) return null;

  return (
    <div className="bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 w-full max-w-3xl mx-auto flex flex-col font-mono text-sm relative z-50">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>
        <p className="text-slate-400 text-xs font-semibold tracking-wider">PROPSCORE TERMINAL :: AGENTIC_SWARM_ACTIVE</p>
      </div>
      <div ref={containerRef} className="p-4 h-64 overflow-y-auto w-full text-left space-y-2 relative scrollbar-hide scroll-smooth">
        {logs.map((log) => (
          <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-slate-500">[{log.timestamp}]</span>{' '}
            <span className={`font-bold ${
              log.agent === 'Vision Agent' ? 'text-pink-400' :
              log.agent === 'Legal Agent' ? 'text-blue-400' :
              log.agent === 'Geospatial Agent' ? 'text-emerald-400' :
              log.agent === 'Market Agent' ? 'text-amber-400' :
              log.agent === 'Coordinator' ? 'text-white' : 'text-purple-400'
            }`}>[{log.agent}]</span>{' '}
            <span className="text-slate-300">{log.msg}</span>
          </div>
        ))}
        {externalLog && (
          <div className="animate-in fade-in duration-300">
            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>{' '}
            <span className="font-bold text-pink-400">[Vision Agent]</span>{' '}
            <span className="text-slate-300">{externalLog}</span>
          </div>
        )}
        {isActive && (
          <div className="mt-2 text-indigo-400 flex items-center gap-2">
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
