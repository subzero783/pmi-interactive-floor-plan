import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  selectMachine,
  selectDepartment,
  updateMachineStatus,
  MachineStatus,
} from '../store/floorPlanSlice.js';
import { X, Activity, CheckCircle, AlertTriangle, XCircle, Clock, MapPin, Wrench } from 'lucide-react';

export const MachineDetailDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const { machines, departments, selectedMachineId, selectedDepartmentId } = useSelector(
    (state: RootState) => state.floorPlan
  );

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);
  const selectedDepartment = departments.find(
    (d) => d.id === selectedDepartmentId || d.id === selectedMachine?.departmentId
  );

  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedMachine && !selectedDepartment) return null;

  const handleStatusChange = async (newStatus: MachineStatus) => {
    if (!selectedMachine) return;
    setIsSubmitting(true);

    try {
      // Dispatch Redux state update immediately
      dispatch(
        updateMachineStatus({
          machineId: selectedMachine.id,
          status: newStatus,
          message: statusMsg || selectedMachine.statusMessage || undefined,
        })
      );

      // Call API backend to persist machine status change
      await fetch(`http://localhost:5000/api/machines/${selectedMachine.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          statusMessage: statusMsg || selectedMachine.statusMessage,
        }),
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="fixed right-4 top-20 bottom-6 w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-30 p-6 flex flex-col justify-between text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">
              {selectedMachine ? selectedMachine.name : selectedDepartment?.name}
            </h2>
          </div>
          <button
            onClick={() => {
              dispatch(selectMachine(null));
              dispatch(selectDepartment(null));
            }}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Machine Status Badge & Department info */}
        {selectedMachine && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Current Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center space-x-1.5 ${
                  selectedMachine.status === 'RUNNING'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : selectedMachine.status === 'IDLE'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    : 'bg-red-950 text-red-300 border border-red-500/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedMachine.status === 'RUNNING'
                      ? 'bg-emerald-400 animate-pulse'
                      : selectedMachine.status === 'IDLE'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                ></span>
                <span>
                  {selectedMachine.status === 'RUNNING'
                    ? 'Green (Operational)'
                    : selectedMachine.status === 'IDLE'
                    ? 'Yellow (Idle)'
                    : 'Red (Maintenance)'}
                </span>
              </span>
            </div>

            {/* Department Location */}
            <div className="flex items-center text-xs text-slate-300 space-x-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-400">Department: </span>
                <span className="font-bold text-slate-200">{selectedDepartment?.name || 'Shopfloor'}</span>
              </div>
            </div>

            {/* Status Description / Note */}
            {selectedMachine.statusMessage && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs">
                <span className="font-semibold text-slate-400 block mb-1">Status Message:</span>
                <p className="text-slate-200 italic">"{selectedMachine.statusMessage}"</p>
              </div>
            )}

            {/* OPERATOR STATUS TOGGLE BUTTONS */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" /> Operator Status Toggle
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusChange('RUNNING')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedMachine.status === 'RUNNING'
                      ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 mb-1" />
                  <span>Green</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusChange('IDLE')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedMachine.status === 'IDLE'
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 mb-1" />
                  <span>Yellow</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusChange('MAINTENANCE')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedMachine.status === 'MAINTENANCE'
                      ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-red-400 mb-1" />
                  <span>Red</span>
                </button>
              </div>

              {/* Status Message input */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Optional status note..."
                  value={statusMsg}
                  onChange={(e) => setStatusMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Department details if department selected */}
        {!selectedMachine && selectedDepartment && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-300 leading-relaxed">{selectedDepartment.description}</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-semibold text-slate-400 block mb-2">Category:</span>
              <span className="bg-blue-950 text-blue-300 px-2.5 py-1 rounded-md font-mono border border-blue-800">
                {selectedDepartment.category}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last Updated: Just now</span>
        </span>
        <span className="text-slate-500">Pacific Maritime Corp</span>
      </div>
    </aside>
  );
};
