import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import { setPrintModalOpen } from '../store/floorPlanSlice.js';
import { X, Printer } from 'lucide-react';

export const PrintViewModal: React.FC = () => {
  const dispatch = useDispatch();
  const { isPrintModalOpen, machines, departments } = useSelector(
    (state: RootState) => state.floorPlan
  );

  if (!isPrintModalOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const runningCount = machines.filter((m) => m.status === 'RUNNING').length;
  const idleCount = machines.filter((m) => m.status === 'IDLE').length;
  const maintenanceCount = machines.filter((m) => m.status === 'MAINTENANCE').length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 text-slate-100 shadow-2xl flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Print Floor Plan View</h2>
              <p className="text-xs text-slate-400">Pacific Maritime Industries Corp - Shopfloor Snapshot</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(setPrintModalOpen(false))}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Print Summary Details */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Facility Operational Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="bg-emerald-950/60 border border-emerald-800/50 p-3 rounded-lg flex items-center justify-between">
              <span className="text-emerald-300 font-semibold">Green (Running)</span>
              <span className="text-lg font-black text-emerald-400">{runningCount}</span>
            </div>
            <div className="bg-amber-950/60 border border-amber-800/50 p-3 rounded-lg flex items-center justify-between">
              <span className="text-amber-300 font-semibold">Yellow (Idle)</span>
              <span className="text-lg font-black text-amber-400">{idleCount}</span>
            </div>
            <div className="bg-red-950/60 border border-red-800/50 p-3 rounded-lg flex items-center justify-between">
              <span className="text-red-300 font-semibold">Red (Maintenance)</span>
              <span className="text-lg font-black text-red-400">{maintenanceCount}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Total Departments: <strong className="text-slate-200">{departments.length}</strong> | Total Monitored Machines: <strong className="text-slate-200">{machines.length}</strong>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={() => dispatch(setPrintModalOpen(false))}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Confirm & Print View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
