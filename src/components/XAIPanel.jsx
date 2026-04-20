import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function XAIPanel({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto border-l border-slate-200 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur z-10">
              <div>
                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-100 mb-2 inline-block">System Audit</span>
                <h2 className="text-2xl font-headline font-black text-slate-900">Explainable AI (XAI) Trace</h2>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-10 flex-1">
               <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <span className="font-bold text-slate-800">Transparency Guarantee:</span> This audit trail demystifies the deterministic pipeline used to generate the final Risk, Liquidity, and Valuation matrices, ensuring institutional trust.
               </div>

               {/* DAG / Flow Map */}
               <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-indigo-100">
                 
                 {/* Step 1 */}
                 <div className="relative pl-12">
                   <div className="absolute left-0 top-1 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 text-indigo-600">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                   </div>
                   <h3 className="font-bold text-slate-900 mb-1">1. Location Intelligence Engine</h3>
                   <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-sm">
                     <p className="text-slate-600 mb-3">Establishes the base intrinsic value by mapping geospatial coordinates against statutory benchmarks and local activity.</p>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded">
                          <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Inputs</span>
                          <span className="font-mono text-xs text-slate-700">Komoot Spatial, Circle Rates</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                          <span className="block text-[10px] uppercase text-emerald-600 font-bold mb-1">Output Weight</span>
                          <span className="font-mono text-xs text-emerald-700 font-bold">Base Market Floor (+45%)</span>
                        </div>
                     </div>
                   </div>
                 </div>

                 {/* Step 2 */}
                 <div className="relative pl-12">
                   <div className="absolute left-0 top-1 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 text-indigo-600">
                      <span className="material-symbols-outlined text-sm">architecture</span>
                   </div>
                   <h3 className="font-bold text-slate-900 mb-1">2. Hardware-Accelerated Vision Pipeline</h3>
                   <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-sm">
                     <p className="text-slate-600 mb-3">A zero-shot <span className="font-mono bg-slate-100 px-1 rounded text-slate-800">google/owlvit-base-patch32</span> transformer running natively on CUDA PyTorch dynamically audits structural integrity bounding boxes.</p>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded">
                           <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Hardware</span>
                           <span className="font-mono text-xs text-slate-700">NVIDIA Blackwell GPU</span>
                        </div>
                        <div className="bg-rose-50 p-2 rounded border border-rose-100">
                           <span className="block text-[10px] uppercase text-rose-600 font-bold mb-1">Degradation Penalty</span>
                           <span className="font-mono text-xs text-rose-700 font-bold">Detected Fractures (-12%)</span>
                        </div>
                     </div>
                   </div>
                 </div>

                 {/* Step 3 */}
                 <div className="relative pl-12">
                   <div className="absolute left-0 top-1 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 text-indigo-600">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                   </div>
                   <h3 className="font-bold text-slate-900 mb-1">3. Market Dynamics & Liquidity Modeler</h3>
                   <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-sm">
                     <p className="text-slate-600 mb-3">Calculates the **Distress Sale Value** and **Resale Potential Index** by applying feature-engineered liquidity discounts based on asset sub-type and market fungibility.</p>
                     <div className="bg-slate-900 text-indigo-300 p-4 rounded-lg font-mono text-xs block overflow-x-auto whitespace-pre leading-relaxed border border-indigo-900/50">
  {`Logic Constraints:
  Distress Value = Market Value × Liquidity Discount
  
  Applied Heuristics: 
  - Standard Config (e.g. 2BHK) : Velocity Multiplier
  - Niche Asset Type            : Liquidity Penalty
  - Freehold Title              : ↑ LTV Eligibility`}
                     </div>
                   </div>
                 </div>

               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
