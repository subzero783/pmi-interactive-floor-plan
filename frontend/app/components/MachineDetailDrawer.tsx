import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  selectMachine,
  selectDepartment,
  setSelectedItem,
} from '../store/floorPlanSlice.js';

const catColors: Record<string, string> = {
  machineshop: '#228b84',
  cnc: '#d13636',
  staging: '#845389',
  welding: '#f59e0b',
  cutting: '#0e65a6',
  coating: '#3da35d',
  upholstery: '#df7325',
  storage: '#6e4768',
  office: '#38bdf8',
};

interface MachineDetailDrawerProps {
  onCenterInView?: (elementId?: string) => void;
}

export const MachineDetailDrawer: React.FC<MachineDetailDrawerProps> = ({ onCenterInView }) => {
  const dispatch = useDispatch();
  const {
    selectedItem,
    selectedMachineId,
    selectedDepartmentId,
    machines,
    departments,
  } = useSelector((state: RootState) => state.floorPlan);

  // Match selected data either from selectedItem or from machines/departments
  const machine = machines.find((m) => m.id === selectedMachineId);
  const department = departments.find(
    (d) => d.id === selectedDepartmentId || d.id === machine?.departmentId
  );

  const isOpen = Boolean(selectedItem || machine || department);

  const title =
    selectedItem?.name ||
    machine?.name ||
    department?.name ||
    'Facility Area';

  const category = (
    selectedItem?.category ||
    department?.category ||
    'machineshop'
  ).toLowerCase();

  const specs =
    selectedItem?.specs ||
    machine?.statusMessage ||
    department?.description ||
    'Standard facility equipment and operations zone.';

  const zoneCode = (
    selectedItem?.id
      ? selectedItem.id.replace('elem_', '').toUpperCase()
      : machine
      ? machine.code
      : department
      ? department.code
      : 'SEC-04-FAB'
  );

  const badgeColor = catColors[category] || '#228b84';

  const closeDrawer = () => {
    dispatch(setSelectedItem(null));
    dispatch(selectMachine(null));
    dispatch(selectDepartment(null));
    // Remove highlighted class from any selected CAD element
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.cad-element.highlighted').forEach((el) => {
        el.classList.remove('highlighted');
      });
    }
  };

  const handleCenterInView = () => {
    const targetId = selectedItem?.id || (machine ? `elem_${machine.code.toLowerCase()}` : undefined);
    if (onCenterInView) {
      onCenterInView(targetId);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('floorplan:center-element', { detail: { elementId: targetId } })
      );
    }
  };

  return (
    <aside className={`drawer ${isOpen ? 'open' : ''}`} id="detailsDrawer">
      <div className="drawer-header">
        <div>
          <span
            className="drawer-badge"
            id="drawerBadge"
            style={{ backgroundColor: badgeColor, color: '#ffffff' }}
          >
            {category}
          </span>
          <h2 className="drawer-title" id="drawerTitle">
            {title}
          </h2>
        </div>
        <button
          className="close-btn"
          id="btnCloseDrawer"
          title="Close Drawer"
          onClick={closeDrawer}
        >
          &times;
        </button>
      </div>

      <div className="drawer-section">
        <div className="drawer-section-title">Operational Status</div>
        <div className="status-indicator">
          <span className="status-dot active"></span>
          <span id="drawerStatusText">Operational - Active Cycle</span>
        </div>
      </div>

      <div className="drawer-section">
        <div className="drawer-section-title">Specifications & Capabilities</div>
        <p
          id="drawerDesc"
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#cbd5e1',
            marginBottom: '12px',
          }}
        >
          {specs}
        </p>

        <table className="spec-table">
          <tbody>
            <tr>
              <td className="spec-label">Zone Code</td>
              <td className="spec-value" id="specZone">
                {zoneCode}
              </td>
            </tr>
            <tr>
              <td className="spec-label">Power Required</td>
              <td className="spec-value" id="specPower">
                480V 3-Phase 60Hz
              </td>
            </tr>
            <tr>
              <td className="spec-label">Shift Lead</td>
              <td className="spec-value">Station Lead #4</td>
            </tr>
            <tr>
              <td className="spec-label">Maintenance Cycle</td>
              <td className="spec-value">Bi-Weekly Verified</td>
            </tr>
            <tr>
              <td className="spec-label">Safety Mandate</td>
              <td className="spec-value">ANSI Z87.1 / Steel Toe</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="drawer-section">
        <div className="drawer-section-title">Safety & Environmental</div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: 1.4,
            color: '#94a3b8',
          }}
        >
          • Hearing protection mandatory within 15ft boundary.
          <br />
          • Overhead crane zone clearance required prior to staging.
          <br />
          • Daily pre-shift hydraulic &amp; e-stop safety interlock check passed.
        </div>
      </div>

      <button
        className="action-btn"
        id="btnFocusItem"
        onClick={handleCenterInView}
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
        </svg>
        Center in View
      </button>
    </aside>
  );
};
