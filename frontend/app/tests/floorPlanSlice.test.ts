import { describe, it, expect } from 'vitest';
import floorPlanReducer, {
  toggleStatusIndicators,
  toggleLabels,
  setActiveCategory,
  zoomIn,
  zoomOut,
  resetZoomAndPan,
  updateMachineStatus,
  FloorPlanState,
} from '../store/floorPlanSlice.js';

describe('floorPlanSlice Redux reducers', () => {
  const initialState: FloorPlanState = {
    departments: [],
    machines: [
      {
        id: 'm1',
        code: 'HAAS_01',
        name: 'Haas Mach. #1',
        departmentId: 'dept1',
        status: 'RUNNING',
        x: 100,
        y: 100,
        width: 40,
        height: 40,
      },
    ],
    showStatusIndicators: true,
    showLabels: true,
    showGrid: true,
    activeCategory: 'ALL',
    zoomLevel: 1.0,
    panOffset: { x: 0, y: 0 },
    selectedDepartmentId: null,
    selectedMachineId: null,
    selectedItem: null,
    isPrintModalOpen: false,
    searchQuery: '',
  };

  it('should toggle status indicators state', () => {
    const nextState = floorPlanReducer(initialState, toggleStatusIndicators());
    expect(nextState.showStatusIndicators).toBe(false);
  });

  it('should toggle labels state', () => {
    const nextState = floorPlanReducer(initialState, toggleLabels());
    expect(nextState.showLabels).toBe(false);
  });

  it('should set active category highlight filter', () => {
    const nextState = floorPlanReducer(initialState, setActiveCategory('WELDING'));
    expect(nextState.activeCategory).toBe('WELDING');
  });

  it('should handle zoom in and zoom out', () => {
    const zoomedIn = floorPlanReducer(initialState, zoomIn());
    expect(zoomedIn.zoomLevel).toBe(1.15);

    const zoomedOut = floorPlanReducer(zoomedIn, zoomOut());
    expect(zoomedOut.zoomLevel).toBe(1.0);
  });

  it('should reset zoom and pan', () => {
    const stateWithZoom = { ...initialState, zoomLevel: 2.0, panOffset: { x: 100, y: 50 } };
    const reset = floorPlanReducer(stateWithZoom, resetZoomAndPan());
    expect(reset.zoomLevel).toBe(1.0);
    expect(reset.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('should update machine status to MAINTENANCE (Red)', () => {
    const updated = floorPlanReducer(
      initialState,
      updateMachineStatus({ machineId: 'm1', status: 'MAINTENANCE', message: 'Tool error' })
    );
    expect(updated.machines[0].status).toBe('MAINTENANCE');
    expect(updated.machines[0].statusMessage).toBe('Tool error');
  });
});
