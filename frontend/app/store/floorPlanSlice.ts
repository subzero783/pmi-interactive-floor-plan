import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MachineStatus = 'RUNNING' | 'IDLE' | 'MAINTENANCE';

export interface Machine {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  status: MachineStatus;
  statusMessage?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  lastUpdated?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description?: string | null;
  machines?: Machine[];
}

export interface FloorPlanState {
  departments: Department[];
  machines: Machine[];
  showStatusIndicators: boolean;
  showLabels: boolean;
  activeCategory: string; // 'ALL' or specific category
  zoomLevel: number; // 0.5 to 3.0
  panOffset: { x: number; y: number };
  selectedDepartmentId: string | null;
  selectedMachineId: string | null;
  isPrintModalOpen: boolean;
  searchQuery: string;
}

const initialState: FloorPlanState = {
  departments: [],
  machines: [],
  showStatusIndicators: true,
  showLabels: true,
  activeCategory: 'ALL',
  zoomLevel: 1.0,
  panOffset: { x: 0, y: 0 },
  selectedDepartmentId: null,
  selectedMachineId: null,
  isPrintModalOpen: false,
  searchQuery: '',
};

export const floorPlanSlice = createSlice({
  name: 'floorPlan',
  initialState,
  reducers: {
    setFloorPlanData: (
      state,
      action: PayloadAction<{ departments: Department[]; machines: Machine[] }>
    ) => {
      state.departments = action.payload.departments;
      state.machines = action.payload.machines;
    },
    toggleStatusIndicators: (state) => {
      state.showStatusIndicators = !state.showStatusIndicators;
    },
    toggleLabels: (state) => {
      state.showLabels = !state.showLabels;
    },
    setActiveCategory: (state, action: PayloadAction<string>) => {
      state.activeCategory = action.payload;
    },
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.5, Math.min(3.0, action.payload));
    },
    zoomIn: (state) => {
      state.zoomLevel = Math.min(3.0, Number((state.zoomLevel + 0.15).toFixed(2)));
    },
    zoomOut: (state) => {
      state.zoomLevel = Math.max(0.5, Number((state.zoomLevel - 0.15).toFixed(2)));
    },
    resetZoomAndPan: (state) => {
      state.zoomLevel = 1.0;
      state.panOffset = { x: 0, y: 0 };
    },
    setPanOffset: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.panOffset = action.payload;
    },
    updatePanOffset: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      state.panOffset.x += action.payload.dx;
      state.panOffset.y += action.payload.dy;
    },
    selectDepartment: (state, action: PayloadAction<string | null>) => {
      state.selectedDepartmentId = action.payload;
      state.selectedMachineId = null;
    },
    selectMachine: (state, action: PayloadAction<string | null>) => {
      state.selectedMachineId = action.payload;
    },
    updateMachineStatus: (
      state,
      action: PayloadAction<{ machineId: string; status: MachineStatus; message?: string }>
    ) => {
      const machine = state.machines.find((m) => m.id === action.payload.machineId || m.code === action.payload.machineId);
      if (machine) {
        machine.status = action.payload.status;
        if (action.payload.message !== undefined) {
          machine.statusMessage = action.payload.message;
        }
        machine.lastUpdated = new Date().toISOString();
      }
    },
    setPrintModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPrintModalOpen = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  setFloorPlanData,
  toggleStatusIndicators,
  toggleLabels,
  setActiveCategory,
  setZoomLevel,
  zoomIn,
  zoomOut,
  resetZoomAndPan,
  setPanOffset,
  updatePanOffset,
  selectDepartment,
  selectMachine,
  updateMachineStatus,
  setPrintModalOpen,
  setSearchQuery,
} = floorPlanSlice.actions;

export default floorPlanSlice.reducer;
