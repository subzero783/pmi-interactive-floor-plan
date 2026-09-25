import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  toggleStatusIndicators,
  toggleLabels,
  setActiveCategory,
  zoomIn,
  zoomOut,
  resetZoomAndPan,
  setPrintModalOpen,
} from '../store/floorPlanSlice.js';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Activity,
  Tag,
  Layers,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const dispatch = useDispatch();
  const { showStatusIndicators, showLabels, activeCategory, zoomLevel } = useSelector(
    (state: RootState) => state.floorPlan
  );
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const categories = [
    { id: 'ALL', label: 'All Areas' },
    { id: 'PRODUCTION', label: 'Machine Shop' },
    { id: 'FINISHING', label: 'Powdercoat & Hardware' },
    { id: 'WELDING', label: 'Welding & Robots' },
    { id: 'PRESS_BRAKE', label: 'Press Brake Area' },
    { id: 'ASSEMBLY', label: 'Assembly & Storage' },
    { id: 'OFFICE', label: 'Offices' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 shadow-lg px-4 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Company Title & Branding */}
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white font-black px-3 py-1.5 rounded-lg text-lg tracking-wider shadow-md border border-blue-400">
            PMI
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Pacific Maritime Industries Corp.
              <span className="text-xs font-normal text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-600/50 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Floor Plan
              </span>
            </h1>
            <p className="text-xs text-slate-400">Interactive Shopfloor Facility & Status Monitor</p>
          </div>
        </div>

        {/* Highlight Department Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Highlight:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => dispatch(setActiveCategory(cat.id))}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 ring-2 ring-blue-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Action Controls (Status, Labels, Zoom, Print) */}
        <div className="flex items-center space-x-2">
          {/* Status Toggle Button */}
          <button
            onClick={() => dispatch(toggleStatusIndicators())}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showStatusIndicators
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Status LED indicators on production machines"
          >
            <Activity className={`w-4 h-4 ${showStatusIndicators ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>Status</span>
          </button>

          {/* Labels Toggle Button */}
          <button
            onClick={() => dispatch(toggleLabels())}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showLabels
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 hover:bg-amber-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Department and Machine Labels"
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Labels</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => dispatch(zoomOut())}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-slate-300 min-w-[3.2rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => dispatch(zoomIn())}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => dispatch(resetZoomAndPan())}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md border-l border-slate-700 ml-0.5 transition-colors"
              title="Reset Zoom & Position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print View Button */}
          <button
            onClick={() => dispatch(setPrintModalOpen(true))}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all border border-indigo-400/40"
            title="Print active view of floor plan"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          {/* Auth status indicator */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-1.5 bg-slate-800 text-emerald-400 px-2.5 py-1.5 rounded-lg text-xs border border-slate-700">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-200">{user.name}</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
