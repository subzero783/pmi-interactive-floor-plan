import React, { useState, useRef, MouseEvent, WheelEvent, TouchEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  selectMachine,
  selectDepartment,
  updatePanOffset,
  setZoomLevel,
  Machine,
  Department,
} from '../store/floorPlanSlice.js';

export const InteractiveFloorPlan: React.FC = () => {
  const dispatch = useDispatch();
  const {
    departments,
    machines,
    showStatusIndicators,
    showLabels,
    activeCategory,
    zoomLevel,
    panOffset,
    selectedMachineId,
    selectedDepartmentId,
  } = useSelector((state: RootState) => state.floorPlan);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mouse pan handlers
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Only drag on left click and not on interactive SVG items directly unless dragging background
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    dispatch(updatePanOffset({ dx: dx - panOffset.x, dy: dy - panOffset.y }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.max(0.5, Math.min(3.0, zoomLevel + zoomDelta));
    dispatch(setZoomLevel(newZoom));
  };

  // Touch pan handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    dispatch(updatePanOffset({ dx: dx - panOffset.x, dy: dy - panOffset.y }));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Category filter check
  const isDepartmentHighlighted = (category: string) => {
    if (activeCategory === 'ALL') return true;
    return activeCategory === category;
  };

  // Color map for LED status light
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return { fill: '#10b981', stroke: '#059669', glow: '#34d399' }; // Green
      case 'IDLE':
        return { fill: '#f59e0b', stroke: '#d97706', glow: '#fbbf24' }; // Yellow
      case 'MAINTENANCE':
        return { fill: '#ef4444', stroke: '#dc2626', glow: '#f87171' }; // Red
      default:
        return { fill: '#9ca3af', stroke: '#6b7280', glow: '#d1d5db' };
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-[calc(100vh-80px)] bg-slate-950 overflow-hidden select-none cursor-${
        isDragging ? 'grabbing' : 'grab'
      }`}
    >
      {/* Background Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Viewport Transform Container */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          viewBox="0 0 1050 630"
          className="w-[1050px] h-[630px] drop-shadow-2xl overflow-visible"
          style={{ background: '#f6f6f4' }}
        >
          <defs>
            {/* LED Status Light Glow Filters */}
            <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hatch patterns for staging areas */}
            <pattern id="stripe-pattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#000" strokeWidth="2" strokeOpacity="0.1" />
            </pattern>
          </defs>

          {/* Outer Facility Building Boundary & Walls */}
          <rect x="20" y="20" width="1000" height="580" fill="#f8f9fa" stroke="#1e293b" strokeWidth="6" rx="4" />
          
          {/* Internal Structural Walls (Top Rooms & Executive Offices) */}
          {/* Top Wall Divider */}
          <line x1="20" y1="90" x2="920" y2="90" stroke="#334155" strokeWidth="4" />
          {/* Right Executive Offices Divider */}
          <line x1="920" y1="20" x2="920" y2="600" stroke="#334155" strokeWidth="4" />

          {/* Top Department Office Rooms */}
          {/* Storage Box & Tool Crib */}
          <rect x="520" y="20" width="60" height="70" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
          <text x="550" y="55" textAnchor="middle" className="text-[9px] font-bold fill-slate-700">TOOL CRIB</text>
          
          {/* Programming Dept */}
          <rect x="580" y="20" width="60" height="70" fill="#edf2f7" stroke="#475569" strokeWidth="1.5" />
          <text x="610" y="50" textAnchor="middle" className="text-[8px] font-bold fill-slate-700">PROGRAMMING</text>
          <text x="610" y="60" textAnchor="middle" className="text-[8px] font-bold fill-slate-700">DEPT.</text>

          {/* QA & Machine Office */}
          <rect x="640" y="20" width="70" height="70" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
          <text x="675" y="45" textAnchor="middle" className="text-[8px] font-bold fill-slate-700">QA & MACH.</text>
          <text x="675" y="55" textAnchor="middle" className="text-[8px] font-bold fill-slate-700">OFFICE</text>

          {/* QC Inspection Area */}
          <rect x="640" y="55" width="70" height="35" fill="#f1f5f9" stroke="#475569" strokeWidth="1.5" />
          <text x="675" y="77" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-600">QC INSPECTION</text>

          {/* Break / Lunch Area */}
          <rect x="710" y="20" width="60" height="70" fill="#edf2f7" stroke="#475569" strokeWidth="1.5" />
          <text x="740" y="50" textAnchor="middle" className="text-[8px] font-bold fill-slate-700">LUNCH /</text>
          <text x="740" y="60" textAnchor="middle" className="text-[8px] font-bold fill-slate-700">BREAK AREA</text>

          {/* Storage Racks #6 & #7 Top */}
          <rect x="270" y="30" width="85" height="15" fill="#7030a0" stroke="#4a154b" strokeWidth="1" />
          <text x="312" y="41" textAnchor="middle" className="text-[7px] font-bold fill-white">STORAGE RACK #6</text>
          <rect x="270" y="65" width="85" height="15" fill="#7030a0" stroke="#4a154b" strokeWidth="1" />
          <text x="312" y="76" textAnchor="middle" className="text-[7px] font-bold fill-white">STORAGE RACK #7</text>

          {/* Right Administrative Rooms */}
          <rect x="920" y="20" width="100" height="50" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="970" y="42" textAnchor="middle" className="text-[8px] font-bold fill-slate-800">GUEST WAITING AREA</text>

          <rect x="920" y="70" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="945" y="92" textAnchor="middle" className="text-[8px] font-bold fill-slate-800">FRONT DESK</text>

          <rect x="970" y="70" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="995" y="92" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">CONFERENCE</text>

          <rect x="920" y="110" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="945" y="132" textAnchor="middle" className="text-[8px] font-bold fill-slate-800">ACCOUNTING</text>

          <rect x="970" y="110" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="995" y="132" textAnchor="middle" className="text-[8px] font-bold fill-slate-800">HR OFFICE</text>

          <rect x="920" y="150" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="945" y="167" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">HARCON</text>
          <text x="945" y="177" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">SALES</text>

          <rect x="970" y="150" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="995" y="172" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">PURCHASING</text>

          <rect x="920" y="190" width="50" height="40" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="945" y="212" textAnchor="middle" className="text-[8px] font-bold fill-slate-800">J.A. OFFICE</text>

          <rect x="970" y="190" width="50" height="40" fill="#c2410c" stroke="#475569" strokeWidth="1.5" />
          <text x="995" y="212" textAnchor="middle" className="text-[7.5px] font-bold fill-white">CONTROL ROOM</text>

          <rect x="920" y="250" width="100" height="70" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="970" y="280" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-800">PLANNING & QUOTING DEPT.</text>

          <rect x="920" y="320" width="50" height="60" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="945" y="350" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">ENGINEERING DEPT.</text>

          <rect x="970" y="320" width="50" height="60" fill="#fae8d0" stroke="#475569" strokeWidth="1.5" />
          <text x="995" y="347" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">HEAD</text>
          <text x="995" y="357" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-800">ENGINEER</text>

          {/* RENDER DEPARTMENT ZONES */}
          {departments.map((dept) => {
            const isHighlighted = isDepartmentHighlighted(dept.category);
            const isSelected = selectedDepartmentId === dept.id;

            return (
              <g
                key={dept.id}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(selectDepartment(dept.id));
                }}
                className="cursor-pointer transition-opacity duration-200"
                opacity={isHighlighted ? 1 : 0.25}
              >
                {/* Department Base Rectangle */}
                <rect
                  x={dept.x}
                  y={dept.y}
                  width={dept.width}
                  height={dept.height}
                  fill={dept.color}
                  stroke={isSelected ? '#3b82f6' : '#1e293b'}
                  strokeWidth={isSelected ? 3.5 : 1.5}
                  rx={2}
                  className="hover:opacity-90 transition-all"
                />

                {/* Optional Department Hatching Overlay for Staging */}
                {dept.category === 'ASSEMBLY' && (
                  <rect
                    x={dept.x}
                    y={dept.y}
                    width={dept.width}
                    height={dept.height}
                    fill="url(#stripe-pattern)"
                    pointerEvents="none"
                  />
                )}

                {/* Department Labels */}
                {showLabels && (
                  <text
                    x={dept.x + dept.width / 2}
                    y={dept.y + dept.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontWeight="800"
                    fontSize={dept.width < 100 ? '10px' : '12px'}
                    style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}
                    pointerEvents="none"
                  >
                    {dept.name.toUpperCase()}
                  </text>
                )}
              </g>
            );
          })}

          {/* RENDER PRODUCTION MACHINES & STATUS LED LIGHTS */}
          {machines.map((machine) => {
            const statusStyle = getStatusColor(machine.status);
            const isSelected = selectedMachineId === machine.id;

            return (
              <g
                key={machine.id}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(selectMachine(machine.id));
                }}
                className="cursor-pointer group"
              >
                {/* Machine Shape Body */}
                <rect
                  x={machine.x}
                  y={machine.y}
                  width={machine.width}
                  height={machine.height}
                  fill={isSelected ? '#38bdf8' : '#334155'}
                  stroke={isSelected ? '#0284c7' : '#0f172a'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  rx={2}
                  className="group-hover:fill-slate-600 transition-colors"
                />

                {/* Machine Code / Label inside machine body */}
                {showLabels && (
                  <text
                    x={machine.x + machine.width / 2}
                    y={machine.y + machine.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="7.5px"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {machine.name}
                  </text>
                )}

                {/* SMALL CIRCULAR LIGHT ON TOP-LEFT OF PRODUCTION MACHINE / DEPARTMENT AREA */}
                {showStatusIndicators && (
                  <g transform={`translate(${machine.x - 3}, ${machine.y - 3})`}>
                    {/* Outer Glow Halo */}
                    <circle
                      cx="6"
                      cy="6"
                      r="7"
                      fill={statusStyle.glow}
                      opacity="0.6"
                      filter={`url(#glow-${machine.status.toLowerCase()})`}
                    />
                    {/* Main LED Status Circle Light */}
                    <circle
                      cx="6"
                      cy="6"
                      r="4.5"
                      fill={statusStyle.fill}
                      stroke={statusStyle.stroke}
                      strokeWidth="1.2"
                    />
                    {/* Inner Specular Highlight */}
                    <circle cx="4.5" cy="4.5" r="1.2" fill="#ffffff" opacity="0.8" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Interactive Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl text-slate-200 text-xs flex flex-col gap-2">
        <div className="font-bold text-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
          Machine Status Indicators
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-900 border border-emerald-300"></span>
            <span className="font-medium text-slate-300">Green (Running)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-900 border border-amber-300"></span>
            <span className="font-medium text-slate-300">Yellow (Idle)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-900 border border-red-300"></span>
            <span className="font-medium text-slate-300">Red (Maintenance)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
