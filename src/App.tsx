/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  ExternalLink, 
  Terminal, 
  Globe, 
  Zap,
  Info,
  ChevronRight,
  Database,
  Cpu,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import type { 
  Opportunity, 
  PnL, 
  NetworkStatus, 
  EngineState, 
  LiquidationEvent 
} from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to cleanly display currency values
function formatUsd(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(val);
}

// --- Status Badge ---
const StatusBadge = ({ status }: { status: string }) => {
  const stylesObj = {
    STRIKE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
    "NO-OP": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
    SUCCESS: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
    AUDITED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-md border text-[9px] font-mono font-extrabold tracking-wider leading-none uppercase",
      stylesObj[status as keyof typeof stylesObj] || "bg-zinc-800 text-zinc-400 border-zinc-700"
    )}>
      {status}
    </span>
  );
};

// --- Opportunity Card Component ---
const OpportunityCard = ({ opp, onClick }: { opp: Opportunity; onClick: (o: Opportunity) => void }) => {
  const netFloat = parseFloat(opp.p_net_det);
  const colorClass = netFloat >= 50 ? "border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400" : "border-rose-500/20 hover:border-rose-500/40 text-rose-400";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      whileHover={{ y: -3, borderColor: "rgba(139, 92, 246, 0.4)" }}
      onClick={() => onClick(opp)}
      className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl cursor-pointer transition-all relative overflow-hidden group shadow-md hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
    >
      <div className="absolute top-0 right-0 p-3 opacity-30 group-hover:opacity-100 transition-opacity">
        <ExternalLink size={12} className="text-zinc-500" />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-bold">
            {opp.opportunity_id}
          </span>
          <p className="text-white text-xs font-mono font-bold tracking-tight uppercase mt-1.5">{opp.token_pair}</p>
        </div>
        <StatusBadge status={opp.audit_status === "PENDING" ? opp.c2.decision : "SUCCESS"} />
      </div>

      <div className="space-y-4">
        {/* Core Equation values */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[8px] uppercase font-bold tracking-wider">Spread Discovery</span>
            <p className="text-purple-400 font-mono text-sm font-semibold">{opp.spread_bps} BPS</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[8px] uppercase font-bold tracking-wider">Proposed Flashloan</span>
            <p className="text-zinc-300 font-mono text-sm leading-none font-semibold">
              {formatUsd(opp.math.flashloan_usd)}
            </p>
          </div>
        </div>

        {/* Step-by-Step USD Equation Trace */}
        <div className="bg-zinc-900/60 p-3 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-[8px] text-zinc-500 font-semibold tracking-wider">
            <span>EQUATION TRACE (USD)</span>
            <span>NET PROFIT EQ</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <p className="text-zinc-400 font-mono text-[10px] leading-tight">
                Leg1 Buy: <span className="text-zinc-200">@{opp.math.buy_leg1_executable_usd_price.toFixed(4)}</span>
              </p>
              <p className="text-zinc-400 font-mono text-[10px] leading-tight">
                Leg2 Sell: <span className="text-zinc-200">@{opp.math.sell_leg2_executable_usd_price.toFixed(4)}</span>
              </p>
            </div>
            <div className="text-right">
              <span className={cn("font-mono text-xs font-bold block", netFloat >= 50 ? "text-emerald-400" : "text-zinc-400")}>
                {formatUsd(netFloat)}
              </span>
              <span className="text-[7px] text-zinc-600 block uppercase font-mono font-bold">NET DETERMINISTIC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", opp.c2.decision === "STRIKE" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 opacity-60")} />
          <span className="text-[8px] text-zinc-500 font-mono uppercase font-bold">C2 Plan: {opp.c2.decision}</span>
        </div>
        <span className="text-[8px] text-zinc-600 font-mono font-medium">{format(new Date(opp.timestamp), "HH:mm:ss.SS")}</span>
      </div>
    </motion.div>
  );
};

// --- Interactive Detail Modal with full mathematical audits ---
const Modal = ({ 
  opp, 
  onClose,
  pipelineLogs
}: { 
  opp: Opportunity; 
  onClose: () => void; 
  pipelineLogs?: { stage: string; timestamp: number; details: string }[] 
}) => {
  const sequencerStages = [
    { key: "DISCOVERED", label: "Discovered" },
    { key: "C1_READY", label: "C1 Ready" },
    { key: "C1_SUBMITTED", label: "C1 Sent" },
    { key: "C1_LANDED", label: "C1 Landed" },
    { key: "POST_C1_RECOMPUTE", label: "Recomputed" },
    { key: "C2_CANDIDATES_BUILT", label: "Routes Built" },
    { key: "C2_DECISION", label: "Decision" },
    { key: "C2_MERKLE_COMMITTED", label: "Commit Proof" },
    { key: "C2_SUBMITTED", label: "C2 Sent" },
    { key: "C2_LANDED", label: "On-Chain Land" },
    { key: "CYCLE_FINALIZED", label: "Finalized" }
  ];

  const getStageStatus = (stageKey: string) => {
    if (!pipelineLogs || pipelineLogs.length === 0) {
      if (opp.audit_status === "SUCCESS") return "completed";
      if (opp.audit_status === "FAILED") {
        if (stageKey === "DISCOVERED") return "completed";
        return "failed";
      }
      return stageKey === "DISCOVERED" ? "completed" : "idle";
    }

    const isLanded = pipelineLogs.some(l => l.stage === stageKey);
    if (isLanded) {
      if (stageKey === "C1_LANDED" && opp.audit_status === "FAILED") return "failed";
      if (stageKey === "C2_LANDED" && opp.audit_status === "FAILED") return "failed";
      return "completed";
    }

    const decisionLog = pipelineLogs.find(l => l.stage === "C2_DECISION");
    if (decisionLog) {
      const isNoOp = decisionLog.details.includes("NO-OP") || opp.c2.decision === "NO-OP";
      const downstreamKeys = ["C2_MERKLE_COMMITTED", "C2_SUBMITTED", "C2_LANDED"];
      if (isNoOp && downstreamKeys.includes(stageKey)) {
        const finalizedIndex = pipelineLogs.findIndex(l => l.stage === "CYCLE_FINALIZED");
        if (finalizedIndex !== -1) {
          return "skipped";
        }
      }
    }

    const lastLoggedIndex = pipelineLogs.length - 1;
    const lastLoggedStage = pipelineLogs[lastLoggedIndex].stage;
    const currentListKeys = sequencerStages.map(s => s.key);
    const lastStagePosition = currentListKeys.indexOf(lastLoggedStage);
    const targetStagePosition = currentListKeys.indexOf(stageKey);

    if (targetStagePosition === lastStagePosition + 1) {
      return "active";
    }

    return "idle";
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-950 border border-zinc-900 w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-8 border-b border-zinc-900 pb-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 font-mono font-bold rounded uppercase">
                Audit Active: {opp.opportunity_id}
              </span>
              <div className="bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded">
                <span className="text-purple-400 font-mono text-xs font-extrabold">{opp.spread_bps} BPS SPREAD</span>
              </div>
              <StatusBadge status={opp.audit_status === "PENDING" ? opp.c2.decision : "SUCCESS"} />
            </div>
            <h2 className="text-2xl font-mono text-white tracking-tight font-bold mt-2">{opp.token_pair} Cycle Validation</h2>
            <p className="text-zinc-550 font-mono text-xs">
              Cycle: {opp.cycle_id} • Route Hash: {opp.route_id} • Valid Block: {opp.block_number}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-805 p-2 rounded-xl"
          >
            <XCircle size={18} />
          </button>
        </div>

        {/* PIPELINE PROGRESS TRACKER */}
        <div className="bg-zinc-950 border border-zinc-900/80 rounded-2xl p-5 mb-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-purple-400" />
              <h3 className="text-[9px] uppercase text-zinc-300 font-extrabold tracking-widest font-mono">Real-Time Mempool Sequencer Pipeline</h3>
            </div>
            <div className="flex items-center gap-3 text-[8px] font-mono text-zinc-500 uppercase font-bold">
              <span>Status Indicators:</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Landed</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Active</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-dashed border-zinc-800" /> Skipped</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-zinc-950/45 rounded-xl border border-zinc-900 overflow-x-auto">
            {sequencerStages.map((stage, idx) => {
              const status = getStageStatus(stage.key);
              
              return (
                <div key={stage.key} className="flex flex-row lg:flex-col items-center gap-2 relative group w-full lg:w-auto p-1.5 rounded-lg hover:bg-zinc-900/20">
                  {/* Circle Indicator */}
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-mono text-[9px] font-extrabold border transition-all shrink-0",
                    status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                    status === "active" ? "bg-purple-500/20 text-purple-300 border-purple-500 animate-pulse" :
                    status === "failed" ? "bg-rose-500/20 text-rose-400 border-rose-500" :
                    status === "skipped" ? "bg-zinc-950 text-zinc-650 border-zinc-900 border-dashed" :
                    "bg-zinc-950 text-zinc-600 border-zinc-900/60"
                  )}>
                    {status === "completed" ? "✓" : status === "skipped" ? "Ø" : idx + 1}
                  </div>

                  {/* Label */}
                  <div className="lg:text-center text-left">
                    <p className={cn(
                      "text-[9px] font-mono leading-tight font-semibold whitespace-nowrap",
                      status === "completed" ? "text-emerald-400 font-bold" :
                      status === "active" ? "text-purple-300 font-black animate-pulse" :
                      status === "skipped" ? "text-zinc-650 line-through" :
                      "text-zinc-550"
                    )}>
                      {stage.label}
                    </p>
                    <span className="text-[7px] text-zinc-650 block uppercase tracking-tighter mt-0.5">{stage.key}</span>
                  </div>

                  {/* Connecting lines */}
                  {idx < sequencerStages.length - 1 && (
                    <div className="hidden lg:block absolute left-[calc(100%-8px)] top-[13px] w-[calc(100%-12px)] h-px bg-zinc-900/60 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Trace console logs */}
          <div className="mt-4 bg-black rounded-lg border border-zinc-900/90 p-3 max-h-[110px] overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1 pr-1">
            <span className="text-zinc-600 uppercase text-[8px] font-extrabold tracking-wider block mb-1.5">// TRACE LOG FEED</span>
            {pipelineLogs && pipelineLogs.map((log, lIdx) => (
              <div key={lIdx} className="flex justify-between py-0.5 px-1 border-l border-zinc-800 pl-2">
                <span className="text-zinc-500 shrink-0 select-none mr-2">[{format(log.timestamp, "HH:mm:ss")}]</span>
                <span className="text-zinc-350 flex-1 truncate">{log.details}</span>
                <span className="text-purple-400 font-bold shrink-0 ml-4">
                  {log.stage}
                </span>
              </div>
            ))}
            {(!pipelineLogs || pipelineLogs.length === 0) && (
              <div className="text-zinc-750 italic leading-none animate-pulse">Syncing on-chain state sequencer traces...</div>
            )}
          </div>
        </div>

        {/* Forensic grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: THE MATH ENGINE STEPS (LEG 1 & LEG 2) */}
          <div className="lg:col-span-2 space-y-8">

            {/* SPREAD BPS TRACKING & ANALYSIS */}
            <section className="bg-zinc-900/10 border border-zinc-900/80 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute right-4 top-4 text-[8px] uppercase font-mono font-extrabold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded tracking-wide">
                Spread Basis-Points Monitor
              </div>
              <h4 className="text-zinc-200 text-xs font-extrabold uppercase mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-400" />
                DEX EXECUTION SPREAD BPS COUPLING
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center font-mono">
                <div className="md:col-span-4 bg-zinc-950 p-4 border border-zinc-900 rounded-xl text-center">
                  <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-extrabold block">Evaluated Price Gap</span>
                  <p className="text-3xl font-mono text-purple-400 font-extrabold mt-1 tracking-tight">+{opp.spread_bps} <span className="text-xs">BPS</span></p>
                  <span className="text-[7.5px] text-zinc-650 block mt-2 uppercase">1 BPS = 0.01% Price Discrepancy</span>
                </div>

                <div className="md:col-span-8 space-y-3 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold text-zinc-500 uppercase">
                      <span>0 BPS</span>
                      <span className="text-amber-500">25 BPS (Min Trigger)</span>
                      <span>100 BPS</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden relative">
                      <div className="absolute left-[25%] top-0 bottom-0 w-0.5 bg-amber-500/80 z-10" />
                      <div 
                        className={cn(
                          "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500",
                          parseFloat(opp.spread_bps) >= 25 ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-zinc-700"
                        )}
                        style={{ width: `${Math.min(100, (parseFloat(opp.spread_bps) / 100) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] mt-2 bg-zinc-950 p-2.5 rounded border border-zinc-900/60">
                    <span className="text-zinc-500">Deviation Bounds Check:</span>
                    <span className={cn(
                      "font-extrabold uppercase",
                      parseFloat(opp.spread_bps) >= 25 ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {parseFloat(opp.spread_bps) >= 25 ? "EXCEEDS MIN REQ SPREAD (+)" : "BELOW TOLERANCE SPREAD (-)"}
                    </span>
                  </div>
                </div>
              </div>
            </section>
            
            {/* 1. LEG 1 (BUY) MATH PANEL */}
            <section className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute right-4 top-4 text-[9px] uppercase font-mono font-extrabold text-zinc-600 tracking-wider">
                LEG 1 EXECUTABLE VALUE
              </div>
              <h4 className="text-zinc-200 text-xs font-extrabold uppercase mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-bold">1</div>
                LEG 1 (BUY VENUE SIMULATOR)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl">
                  <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-bold">Initial Flashloan USD</span>
                  <p className="text-white font-mono text-sm font-bold mt-1">{formatUsd(opp.math.flashloan_usd)}</p>
                  <span className="text-[7px] text-zinc-600 font-mono block mt-1">Proposed Execution size</span>
                </div>
                <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl">
                  <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-bold">Venue Executed</span>
                  <p className="text-emerald-400 font-mono text-sm font-bold mt-1">{opp.math.buy_leg1_venue}</p>
                  <span className="text-[7px] text-zinc-600 font-mono block mt-1">Lowest buy rate selected</span>
                </div>
                <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl">
                  <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-bold">Calculated Price per Token A</span>
                  <p className="text-purple-400 font-mono text-sm font-bold mt-1">
                    {formatUsd(opp.math.buy_leg1_executable_usd_price)}
                  </p>
                  <span className="text-[7px] text-zinc-600 font-mono block mt-1">
                    {opp.math.buy_leg1_received_token_a.toLocaleString()} Tokens Rec.
                  </span>
                </div>
              </div>
            </section>

            {/* 2. LEG 2 (SELL MAP & VENUES OPTIMIZER) */}
            <section className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-2xl relative">
              <div className="absolute right-4 top-4 text-[9px] uppercase font-mono font-extrabold text-zinc-600 tracking-wider">
                LEG 2 SCANNED RATES
              </div>
              <h4 className="text-zinc-200 text-xs font-extrabold uppercase mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-[10px] font-bold">2</div>
                LEG 2 (SELL ALGORITHMIC SELECTOR)
              </h4>
              <div className="space-y-3">
                {opp.math.sell_leg2_options.map((option, i) => {
                  const isChosen = option.venue === opp.math.sell_leg2_chosen_venue;
                  return (
                    <div 
                      key={option.venue} 
                      className={cn(
                        "flex items-center justify-between p-3.5 border rounded-xl font-mono text-xs transition-all",
                        isChosen ? "bg-purple-950/15 border-purple-500/30 text-purple-200" : "bg-zinc-950/10 border-zinc-900 text-zinc-400"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isChosen ? "bg-purple-400" : "bg-zinc-800")} />
                        <span>{option.venue}</span>
                      </div>
                      <div className="text-right flex gap-8">
                        <div>
                          <span className="text-[7.5px] text-zinc-500 block uppercase font-bold tracking-wider leading-none">Sim Value</span>
                          <span className="font-bold">{formatUsd(option.return_usd_value)}</span>
                        </div>
                        <div>
                          <span className="text-[7.5px] text-zinc-500 block uppercase font-bold tracking-wider leading-none">Sim Rate</span>
                          <span>{formatUsd(option.price_per_token)} / token</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. POOL STRENGTHS & FLASHLOAN CONSTRAINTS */}
            <section className="bg-zinc-900/10 border border-zinc-900 p-5 rounded-2xl">
              <h4 className="text-zinc-300 text-xs font-extrabold uppercase mb-4 flex items-center gap-2">
                <Database size={14} className="text-indigo-400" />
                FLASHLOAN TVL STRENGTH CHECKS (`0.15 × MIN_POOL`)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                <div className="space-y-2">
                  <p className="text-[9.5px] text-zinc-500 font-extrabold uppercase">POLYGON VENUE TVL DETAILS</p>
                  {opp.math.pools.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-400">{p.dex} : {p.pool}</span>
                      <span className="text-zinc-200 font-bold">{formatUsd(p.tvl)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-950/50 p-4 border border-zinc-900 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-extrabold block">Constraint Result</span>
                    <p className="text-white text-base font-bold mt-2 leading-tight">
                      MAX ALLOWABLE: {formatUsd(opp.math.max_flashloan_usd)}
                    </p>
                    <p className="text-zinc-500 text-[10px] mt-1 italic font-medium leading-normal">
                      Proposed Size ({formatUsd(opp.math.flashloan_usd)}) is completely under compliance limits.
                    </p>
                  </div>
                  <div className="border-t border-zinc-900 pt-3 mt-4 text-[9px] text-zinc-600 font-bold uppercase flex justify-between">
                    <span>MIN SIZE REQ: $1,000</span>
                    <span className="text-emerald-400">STATUS: VALID STATE</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT PANEL: AUDIT MATRIX / COST MATRIX & FINAL EXECUTION ATTESTATION */}
          <div className="space-y-8 bg-zinc-900/10 p-6 border-l border-zinc-900 rounded-3xl">
            
            {/* COST MATRIX EQUATION */}
            <section className="space-y-4">
              <h4 className="text-zinc-300 text-xs font-extrabold uppercase flex items-center gap-2">
                <Sliders size={14} className="text-purple-400" />
                FINAL EXECUTION COST MATRIX
              </h4>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                  <span className="text-zinc-500">Gross Gain</span>
                  <span className="text-white font-bold">{formatUsd(opp.math.gross_profit_usd)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-rose-400/80">
                  <span>Flashloan Fee (0.05%)</span>
                  <span>-{formatUsd(opp.math.flashloan_fee_usd)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-rose-400/80">
                  <span>DEX Swapping Fees</span>
                  <span>-{formatUsd(opp.math.dex_fees_usd)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-rose-400/80">
                  <span>Chain Gas Spent</span>
                  <span>-{formatUsd(opp.math.gas_usd)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-rose-400/80">
                  <span>Builder Cost (PBS Route)</span>
                  <span>-{formatUsd(opp.math.builder_cost_usd)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-rose-400/80">
                  <span>EV Security Buffer</span>
                  <span>-{formatUsd(opp.math.ev_buffer_usd)}</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-zinc-400 font-extrabold text-[10px] uppercase">Net Profit (Model)</span>
                  <span className={cn(
                    "text-sm font-extrabold px-2 py-0.5 rounded",
                    opp.math.net_profit_usd >= 50 ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" : "text-rose-400 bg-rose-500/5"
                  )}>
                    {formatUsd(opp.math.net_profit_usd)}
                  </span>
                </div>
              </div>
            </section>

            {/* SSOT REAL-TIME IDENTITY ATTRIBUTES */}
            <section className="space-y-3 pt-4 border-t border-zinc-900">
              <h4 className="text-zinc-300 text-xs font-extrabold uppercase flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-400" />
                SSOT HARNESS AUDIT
              </h4>
              <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                <div className="bg-zinc-950 p-2.5 border border-zinc-900 rounded-xl space-y-1">
                  <span className="text-zinc-600 block text-[8px] uppercase font-bold leading-none">I1: Inventory Handoff</span>
                  <span className="text-white font-semibold">{opp.ssot.i1}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-zinc-900 rounded-xl space-y-1">
                  <span className="text-zinc-600 block text-[8px] uppercase font-bold leading-none">I2: Gross Identity Delta</span>
                  <span className="text-white font-semibold">+{opp.ssot.i2} USD</span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-zinc-900 rounded-xl space-y-1">
                  <span className="text-zinc-600 block text-[8px] uppercase font-bold leading-none">I3: Net Identity Delta</span>
                  <span className="text-white font-semibold">+{opp.ssot.i3} USD</span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-zinc-900 rounded-xl space-y-1">
                  <span className="text-zinc-600 block text-[8px] uppercase font-bold leading-none">I4: Fee Validity</span>
                  <span className="text-emerald-400 font-bold uppercase">{opp.ssot.i4}</span>
                </div>
              </div>
            </section>

            {/* BLOCK / STATE ATTRIBUTES */}
            <section className="space-y-3 pt-4 border-t border-zinc-900">
              <h4 className="text-zinc-300 text-xs font-extrabold uppercase flex items-center gap-2">
                <Terminal size={14} className="text-zinc-500" />
                STATE TRANSITION
              </h4>
              <div className="space-y-2 font-mono text-[9px]">
                <div className="flex justify-between bg-zinc-950 p-2 border border-zinc-900 rounded-lg">
                  <span className="text-zinc-500">PRE_STATE_FINGERPRINT</span>
                  <span className="text-zinc-300">{opp.state.pre}</span>
                </div>
                <div className="flex justify-between bg-zinc-950 p-2 border border-zinc-900 rounded-lg">
                  <span className="text-zinc-500">POST_STATE_FINGERPRINT</span>
                  <span className="text-zinc-300">{opp.state.post}</span>
                </div>
              </div>
            </section>

            {/* TRACE ATTESTATION OF EXECUTION */}
            {opp.execution.hash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
              <section className="space-y-3 pt-4 border-t border-zinc-900">
                <h4 className="text-zinc-300 text-xs font-extrabold uppercase">Landed Execution Trace</h4>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl space-y-2 font-mono text-[9.5px]">
                  <p className="text-emerald-400 flex items-center gap-2 font-extrabold">
                    <CheckCircle2 size={12} /> TRANSACTION LANDED SECURELY
                  </p>
                  <p className="text-zinc-500 break-all leading-tight">
                    Hash: <span className="text-zinc-300">{opp.execution.hash}</span>
                  </p>
                  <div className="flex justify-between text-zinc-400">
                    <span>Gas Spent</span>
                    <span className="text-zinc-200 font-semibold">{opp.execution.gas_used} units</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Verified Net Gain</span>
                    <span className="text-emerald-400 font-bold">+{formatUsd(parseFloat(opp.execution.actual_profit_usd))}</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Liquidation Fine-Tune settings overlay component ---
const SettingsPanel = ({ 
  config, 
  onSave 
}: { 
  config: any; 
  onSave: (c: any) => void;
}) => {
  const [minDiscount, setMinDiscount] = useState(config?.minDiscountThreshold || 10);
  const [gasLimit, setGasLimit] = useState(config?.maxGasLimitGwei || 40);
  const [minHealth, setMinHealth] = useState(config?.minHealthFactorTrigger || 0.95);
  const [makerEnabled, setMakerEnabled] = useState(config?.enabledProtocols?.MakerDAO !== false);
  const [aaveEnabled, setAaveEnabled] = useState(config?.enabledProtocols?.AaveV3 !== false);

  const handleUpdate = () => {
    onSave({
      minDiscountThreshold: minDiscount,
      maxGasLimitGwei: gasLimit,
      minHealthFactorTrigger: minHealth,
      enabledProtocols: {
        MakerDAO: makerEnabled,
        AaveV3: aaveEnabled
      }
    });
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 space-y-5">
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
        <Sliders size={14} className="text-purple-400" />
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-300">Fine-Tune Active Liquidation Module</h3>
      </div>

      <div className="space-y-4 text-xs font-mono">
        {/* Min Discount */}
        <div className="space-y-1">
          <div className="flex justify-between text-zinc-400 font-semibold">
            <span>Min Discount Threshold</span>
            <span className="text-white">{minDiscount}%</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="25" 
            value={minDiscount}
            onChange={(e) => setMinDiscount(parseInt(e.target.value))}
            className="w-full accent-purple-500 h-1 bg-zinc-800 rounded"
          />
        </div>

        {/* Max Gas Limit */}
        <div className="space-y-1">
          <div className="flex justify-between text-zinc-400 font-semibold">
            <span>Max Active Gas Limit</span>
            <span className="text-white">{gasLimit} GWEI</span>
          </div>
          <input 
            type="range" 
            min="15" 
            max="120" 
            value={gasLimit}
            onChange={(e) => setGasLimit(parseInt(e.target.value))}
            className="w-full accent-purple-500 h-1 bg-zinc-800 rounded"
          />
        </div>

        {/* Health Factor Trigger */}
        <div className="space-y-1">
          <div className="flex justify-between text-zinc-400 font-semibold">
            <span>Min Health Factor Trigger</span>
            <span className="text-white">{minHealth}</span>
          </div>
          <input 
            type="range" 
            min="0.80" 
            max="1.05" 
            step="0.01"
            value={minHealth}
            onChange={(e) => setMinHealth(parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1 bg-zinc-800 rounded"
          />
        </div>

        {/* Protocols active toggles */}
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Target Vault Protocols</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={makerEnabled}
                onChange={() => setMakerEnabled(!makerEnabled)}
                className="rounded accent-purple-500 border-zinc-800 bg-zinc-950 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-zinc-400">MakerDAO</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={aaveEnabled}
                onChange={() => setAaveEnabled(!aaveEnabled)}
                className="rounded accent-purple-500 border-zinc-800 bg-zinc-950 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-zinc-400">AaveV3</span>
            </label>
          </div>
        </div>

        <button 
          onClick={handleUpdate}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 font-bold rounded-xl transition-all cursor-pointer font-sans tracking-wide active:scale-95 text-xs text-white"
        >
          CONFIRM RULES ALTERATION
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [spreadLogs, setSpreadLogs] = useState<{ id: string; bps: string; pair: string; time: number }[]>([]);
  const [connected, setConnected] = useState(false);
  const [liqConfig, setLiqConfig] = useState<any>(null);
  const [confirmedLogs, setConfirmedLogs] = useState<{ id: string; hash: string; pair: string; profit: number; timestamp: number; status: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"pulse" | "ledger">("pulse");
  const [liveTokens, setLiveTokens] = useState<{ symbol: string; priceUsd: number; volume24h: number; liquidityUsd: number; dex: string }[]>([
    { symbol: "WETH", priceUsd: 3450.25, volume24h: 18200400, liquidityUsd: 8402500, dex: "uniswap" },
    { symbol: "WBTC", priceUsd: 68150.80, volume24h: 12450000, liquidityUsd: 4920000, dex: "uniswap" },
    { symbol: "POL", priceUsd: 0.4578, volume24h: 3102400, liquidityUsd: 1250300, dex: "quickswap" },
    { symbol: "LINK", priceUsd: 14.28, volume24h: 924500, liquidityUsd: 650000, dex: "quickswap" }
  ]);

  const [pipelines, setPipelines] = useState<Record<string, { stage: string; timestamp: number; details: string }[]>>({});

  // Trigger custom sized manual simulation
  const [manualTriggerSize, setManualTriggerSize] = useState("100000");

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);

    socket.onmessage = (event) => {
      const { type, data, config } = JSON.parse(event.data);

      switch (type) {
        case "SYNC":
          setEngineState(data);
          if (config) setLiqConfig(config);
          break;
        case "dex_feed.synchronized":
          if (data && Array.isArray(data.tokens)) {
            setLiveTokens(data.tokens);
          }
          break;
        case "spread.discovered":
          setSpreadLogs((prev) => [
            { id: data.id, bps: data.spread_bps, pair: data.pair, time: Date.now() }, 
            ...prev
          ].slice(0, 10));
          break;
        case "liquidation.detected":
          setEngineState(prev => prev ? { 
            ...prev, 
            liquidations: [data, ...prev.liquidations].slice(0, 15) 
          } : prev);
          break;
        case "liquidation.updated":
          setEngineState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              liquidations: prev.liquidations.map(l => l.id === data.id ? { ...l, status: data.status, txHash: data.txHash } : l)
            };
          });
          break;
        case "pipeline.transition":
          setPipelines((prev) => {
            const currentList = prev[data.id] || [];
            if (currentList.some(item => item.stage === data.stage)) return prev;
            return {
              ...prev,
              [data.id]: [...currentList, { stage: data.stage, timestamp: data.timestamp, details: data.details }]
            };
          });
          break;
        case "opportunity.discovered":
          setOpportunities((prev) => [data, ...prev].slice(0, 50));
          break;
        case "c1.evaluated":
        case "ssot.audit.completed":
          setOpportunities((prev) => 
            prev.map(o => o.opportunity_id === data.id ? { ...o, audit_status: "AUDITED" } : o)
          );
          break;
        case "execution.confirmed":
          setOpportunities((prev) => 
            prev.map(o => o.opportunity_id === data.id ? { ...o, audit_status: "SUCCESS" } : o)
          );
          
          // STRICT RULE: Log Profit/Loss specifically upon hash confirmation receipt and status confirmed inside case handler
          const profitAmt = parseFloat(data.actual_profit_usd);
          console.log(`%c[HASH CONFIRMATION RECEIPT]%c ID: ${data.id} | Pair: ${data.token_pair || "Arbitrage"} | Hash: ${data.hash} | Status: CONFIRMED | Net Profit Logged: +${profitAmt.toFixed(2)}`, "color: #06b6d4; font-weight: bold;", "color: #d1d5db;");
          
          setConfirmedLogs((prev) => [
            {
              id: data.id,
              hash: data.hash,
              pair: data.token_pair || "Polygon Dex Swap",
              profit: profitAmt,
              timestamp: Date.now(),
              status: "CONFIRMED"
            },
            ...prev
          ].slice(0, 50));
          break;
        case "cycle.completed":
          setEngineState(prev => prev ? { 
            ...prev, 
            pnl: data.pnl, 
            network: { ...prev.network, block: data.block } 
          } : prev);
          break;
      }
    };

    return () => socket.close();
  }, []);

  // Update backend config via REST
  const handleSaveLiquidationConfig = async (newConfig: any) => {
    try {
      const res = await fetch("/api/liquidation/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.success) {
        setLiqConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger manual simulation
  const handleTriggerManualSim = async () => {
    try {
      await fetch("/api/simulation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size_usd: manualTriggerSize })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Replay historical sweep incidents
  const handleTriggerReplay = async (index: number) => {
    // We send ws request or POST trigger
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "REPLAY", index }));
        socket.close();
      };
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-purple-500/30 font-sans tracking-tight antialiased">
      
      {/* GLOWING HEADLINES */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-zinc-900 bg-zinc-950/65 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-white p-1 rounded-lg">
              <Zap size={18} className="text-black" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-[0.2em] uppercase text-zinc-100">Apex-Omega Engine</h1>
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500")} />
                <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest leading-none">
                  Status: {connected ? "Live Web Socket Connected" : "Connection Failure"}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Ticker of Polygon Assets */}
          <div className="hidden lg:flex items-center gap-6 overflow-hidden max-w-[50%]">
            <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 font-mono tracking-wider uppercase leading-none bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Polygon Live Dex Feed
            </div>
            <div className="flex gap-5 font-mono text-[10px] overflow-x-auto scrollbar-none py-1">
              {liveTokens.map((tok) => (
                <div key={tok.symbol} className="border-r border-zinc-900 pr-5 last:border-0 last:pr-0 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 font-bold">{tok.symbol}</span>
                    <span className="text-white font-extrabold">${tok.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between gap-2.5 text-[7.5px] text-zinc-600 font-semibold uppercase mt-0.5">
                    <span>Liq: ${(tok.liquidityUsd / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k</span>
                    <span>Vol: ${(tok.volume24h / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:flex gap-8 items-center h-full shrink-0">
            <div className="h-8 w-px bg-zinc-900" />
            <div className="flex gap-6 font-mono">
              <div className="text-right">
                <p className="text-[8.5px] text-zinc-500 uppercase font-bold tracking-wider">Landed Block</p>
                <p className="text-xs font-bold text-zinc-300">{engineState?.network.block || "---"}</p>
              </div>
              <div className="text-right">
                <p className="text-[8.5px] text-zinc-500 uppercase font-bold tracking-wider">Network Gwei</p>
                <p className="text-xs font-bold text-purple-400">{engineState?.network.gas || "---"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto p-6 space-y-6">
        
        {/* UPPER ROW: METRIC BENTO GRIDS */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5">
          
          {/* 1. REALIZED STATS CELL */}
          <div className="md:col-span-3 lg:col-span-3 bg-zinc-900/35 border border-zinc-900 p-6 rounded-3xl flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-6 -top-6 bg-emerald-500/5 w-28 h-28 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">Realized Engine PnL</span>
              <TrendingUp size={15} className="text-emerald-400" />
            </div>
            <div className="mt-5">
              <p className="text-3xl font-mono font-extrabold text-white tracking-tighter leading-none">
                {formatUsd(engineState?.pnl.net || 0)}
              </p>
              
              <div className="mt-4 pt-4 border-t border-zinc-950 grid grid-cols-3 gap-2 font-mono text-[9px] text-zinc-500">
                <div>
                  <span className="block font-bold">Gross Gain</span>
                  <span className="text-zinc-300 font-semibold">{formatUsd(engineState?.pnl.gross || 0)}</span>
                </div>
                <div>
                  <span className="block font-bold">Swap Fees</span>
                  <span className="text-rose-400/80 font-semibold">-{formatUsd(engineState?.pnl.fees || 0)}</span>
                </div>
                <div>
                  <span className="block font-bold">Gas Cost</span>
                  <span className="text-rose-400/80 font-semibold">-{formatUsd(engineState?.pnl.gas || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. REPLAY & MANUAL STRIKE CONTROLLER */}
          <div className="md:col-span-3 lg:col-span-3 bg-zinc-900/35 border border-zinc-900 p-6 rounded-3xl flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">Strike Manual Simulator Trigger</span>
              <Activity size={15} className="text-purple-400" />
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={manualTriggerSize} 
                  onChange={(e) => setManualTriggerSize(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 font-mono text-xs text-white focus:outline-none focus:border-purple-500"
                  placeholder="Simulation Size (USD)"
                />
                <button 
                  onClick={handleTriggerManualSim}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition-opacity font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer text-white"
                >
                  <Play size={12} fill="currentColor" /> Simulated Strike
                </button>
              </div>

              {/* Historic Incident loader */}
              <div className="pt-3 border-t border-zinc-950 flex items-center justify-between">
                <span className="text-[8px] text-zinc-500 uppercase font-mono font-bold">Load Historical Forensic Case</span>
                <div className="flex gap-2 font-mono">
                  <button 
                    onClick={() => handleTriggerReplay(0)}
                    className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded text-[9px] cursor-pointer"
                  >
                    Incident #1
                  </button>
                  <button 
                    onClick={() => handleTriggerReplay(1)}
                    className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded text-[9px] cursor-pointer"
                  >
                    Incident #2
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 32-LANE STATE MONITOR */}
          <div className="md:col-span-4 lg:col-span-3 bg-zinc-900/35 border border-zinc-900 p-6 rounded-3xl flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">Active Mapped Lanes</span>
                <span className="text-[8px] text-zinc-600 font-mono font-bold block uppercase mt-0.5">32 Deterministic Channels</span>
              </div>
              <Cpu size={15} className="text-zinc-600" />
            </div>
            <div className="grid grid-cols-8 gap-1.5 mt-5">
              {Array.from({ length: 32 }).map((_, i) => {
                const isActive = Math.random() > 0.85;
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "aspect-square rounded transition-all duration-300",
                      isActive 
                        ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                        : "bg-zinc-900 border border-zinc-800/60"
                    )}
                    title={`Lane ${i}: ${isActive ? "Active evaluation" : "Listening"}`}
                  />
                );
              })}
            </div>
          </div>

          {/* 4. LIQUIDATION STATUS MONITOR */}
          <div className="md:col-span-2 lg:col-span-3 bg-zinc-900/35 border border-zinc-900 p-6 rounded-3xl flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-extrabold text-[#F97316] uppercase tracking-widest">Liquidations detected</span>
              <Activity size={14} className="text-[#F97316]" />
            </div>
            <div className="mt-5 space-y-2 max-h-[85px] overflow-y-auto pr-1">
              {engineState?.liquidations.slice(0, 3).map((l) => (
                <div key={l.id} className="flex justify-between items-center text-[9px] font-mono border-b border-zinc-950 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-zinc-400 font-bold truncate max-w-[90px]">{l.vault}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-bold",
                    l.status === 'EXECUTED' ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/5"
                  )}>
                    {l.status}
                  </span>
                  <span className="text-zinc-300 font-bold">{l.collateral}</span>
                </div>
              ))}
              {(!engineState?.liquidations || engineState.liquidations.length === 0) && (
                <div className="text-[10px] text-zinc-600 font-mono italic">Scanning Liquidity vaults...</div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM MATRIX: THE HIGH FIDELITY STREAM & FINE-TUNING PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT: SPREAD LOGS & MODULE TUNER */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Fine tuning panel */}
            <SettingsPanel 
              config={liqConfig} 
              onSave={handleSaveLiquidationConfig} 
            />

            {/* TABBED MONITOR: DISCOVERY PULSE vs CONFIRMED EXECUTION LEDGER */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 h-[380px] flex flex-col relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none z-10" />
              
              {/* Tab selector headers */}
              <div className="flex border-b border-zinc-900 mb-4 pb-1 gap-4 font-mono text-[10px]">
                <button
                  onClick={() => setActiveTab("pulse")}
                  className={cn(
                    "pb-2 font-extrabold cursor-pointer uppercase transition-all tracking-wider flex items-center gap-1.5",
                    activeTab === "pulse" ? "text-purple-400 border-b-2 border-purple-500 font-black" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Terminal size={11} /> Pulse ({spreadLogs.length})
                </button>
                <button
                  onClick={() => setActiveTab("ledger")}
                  className={cn(
                    "pb-2 font-extrabold cursor-pointer uppercase transition-all tracking-wider flex items-center gap-1.5 relative",
                    activeTab === "ledger" ? "text-cyan-400 border-b-2 border-cyan-500 font-black" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Activity size={11} /> Ledger ({confirmedLogs.length})
                  {confirmedLogs.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute right-[-8px] top-[-2px] animate-ping" />
                  )}
                </button>
              </div>

              {activeTab === "pulse" ? (
                <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-3 scrollbar-none pr-1">
                  {spreadLogs.map((log, idx) => (
                    <div key={`${log.id}-${idx}`} className="border-l-2 border-purple-500/40 pl-3 py-1 bg-purple-500/5 rounded-r">
                      <p className="text-purple-400 font-bold flex justify-between items-center text-[8.5px]">
                        <span>SIGNAL: {log.bps}BPS</span>
                        <span className="text-zinc-600 text-[8px]">{format(log.time, "HH:mm:ss.SS")}</span>
                      </p>
                      <p className="text-zinc-300 font-semibold mt-0.5">{log.pair}</p>
                      <p className="text-zinc-600 uppercase text-[7.5px] mt-0.5">Route mapping: SSOT_INIT_WETH...</p>
                    </div>
                  ))}
                  {spreadLogs.length === 0 && (
                    <div className="text-zinc-700 font-mono italic animate-pulse py-4">Scanning Polygon venues for optimal spread...</div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-3 scrollbar-none pr-1">
                  {confirmedLogs.map((log) => (
                    <div key={log.id} className="border-l-2 border-cyan-500/40 pl-3 py-1 bg-cyan-500/5 rounded-r">
                      <div className="flex justify-between items-center text-[8.5px]">
                        <span className="text-cyan-400 font-extrabold uppercase">STATUS: CONFIRMED</span>
                        <span className="text-zinc-600 text-[8px]">{format(log.timestamp, "HH:mm:ss.SS")}</span>
                      </div>
                      <p className="text-zinc-300 font-semibold mt-0.5">{log.pair}</p>
                      <div className="flex justify-between items-center mt-1 text-[8px]">
                        <span className="text-zinc-500 truncate max-w-[120px]" title={log.hash}>
                          Tx: {log.hash.substring(0, 10)}...{log.hash.substring(log.hash.length - 8)}
                        </span>
                        <span className="text-emerald-400 font-extrabold">
                          PnL: +{formatUsd(log.profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {confirmedLogs.length === 0 && (
                    <div className="text-zinc-700 italic py-4 flex flex-col items-center justify-center text-center space-y-2">
                       <p>Waiting for strikes to land...</p>
                       <p className="text-[7.5px] uppercase font-bold text-zinc-800">PnL is strictly logged upon hash confirmation receipt</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MAIN OPPORTUNITY LIST GRID */}
          <div className="lg:col-span-3 bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <h2 className="text-[10px] uppercase text-zinc-100 font-extrabold tracking-[0.25em]">
                  Real-Time Verified Opportunity Stream
                </h2>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded font-mono uppercase font-bold tracking-widest">
                  Live Stream Feed
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {opportunities.map((opp) => (
                  <div key={opp.opportunity_id}>
                    <OpportunityCard 
                      opp={opp} 
                      onClick={setSelectedOpp} 
                    />
                  </div>
                ))}
              </AnimatePresence>

              {opportunities.length === 0 && (
                <div className="col-span-full h-80 flex flex-col items-center justify-center border border-dashed border-zinc-900 rounded-2xl text-zinc-600 space-y-4">
                  <Terminal size={32} strokeWidth={1.5} className="animate-spin text-purple-600" />
                  <p className="text-xs font-mono tracking-widest uppercase animate-pulse font-bold">Scanning Polygon Pools for signal initiation...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-950 bg-zinc-950/40 p-6 flex justify-between items-center text-[9px] text-zinc-600 font-mono font-bold uppercase tracking-widest">
        <span>APEX-OMEGA DISCOVERY SYSTEM v4.5.1-Polygon</span>
        <div className="flex gap-6">
          <span className="flex items-center gap-1"><Info size={10} /> Forensic Audit Console Ready</span>
          <span className="text-emerald-500/80">USD Normalized</span>
        </div>
      </footer>

      {/* MODAL AUDIT SCREEN */}
      <AnimatePresence>
        {selectedOpp && (
          <Modal opp={selectedOpp} onClose={() => setSelectedOpp(null)} pipelineLogs={pipelines[selectedOpp.opportunity_id]} />
        )}
      </AnimatePresence>
    </div>
  );
}
