import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  setSelectedItem,
  selectMachine,
  selectDepartment,
  setZoomLevel,
} from '../store/floorPlanSlice.js';

interface TooltipState {
  visible: boolean;
  title: string;
  category: string;
  x: number;
  y: number;
}

export const InteractiveFloorPlan: React.FC = () => {
  const dispatch = useDispatch();
  const {
    showStatusIndicators,
    showLabels,
    showGrid,
    activeCategory,
    searchQuery,
    selectedItem,
  } = useSelector((state: RootState) => state.floorPlan);

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan & Zoom state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [coords, setCoords] = useState({ x: 1000, y: 500 });

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    title: '',
    category: '',
    x: 0,
    y: 0,
  });

  // Fit initial view to viewport
  const fitToScreen = useCallback(() => {
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const svgW = 2000;
    const svgH = 1000;
    const scaleX = (vRect.width - 40) / svgW;
    const scaleY = (vRect.height - 40) / svgH;
    const initialScale = Math.min(scaleX, scaleY, 1.2);
    const initialPanX = (vRect.width - svgW * initialScale) / 2;
    const initialPanY = (vRect.height - svgH * initialScale) / 2;

    setScale(initialScale);
    setPanX(initialPanX);
    setPanY(initialPanY);
    dispatch(setZoomLevel(initialScale));
  }, [dispatch]);

  // Initial fit & resize handler
  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  // Mouse pan interaction
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.hud-compass') ||
      target.closest('.hud-zoom-controls') ||
      target.closest('.drawer')
    ) {
      return;
    }
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - panX,
      y: e.clientY - panY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (viewportRef.current) {
        const vRect = viewportRef.current.getBoundingClientRect();
        const svgX = Math.round((e.clientX - vRect.left - panX) / scale);
        const svgY = Math.round((e.clientY - vRect.top - panY) / scale);
        if (svgX >= 0 && svgX <= 2000 && svgY >= 0 && svgY <= 1000) {
          setCoords({ x: svgX, y: svgY });
        }
      }

      if (!isDraggingRef.current) return;
      setPanX(e.clientX - dragStartRef.current.x);
      setPanY(e.clientY - dragStartRef.current.y);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panX, panY, scale]);

  // Wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const zoomFactor = 1.12;
    const mouseX = e.clientX - vRect.left;
    const mouseY = e.clientY - vRect.top;

    const prevScale = scale;
    const nextScale = e.deltaY < 0
      ? Math.min(scale * zoomFactor, 4.0)
      : Math.max(scale / zoomFactor, 0.4);

    const nextPanX = mouseX - (mouseX - panX) * (nextScale / prevScale);
    const nextPanY = mouseY - (mouseY - panY) * (nextScale / prevScale);

    setScale(nextScale);
    setPanX(nextPanX);
    setPanY(nextPanY);
    dispatch(setZoomLevel(nextScale));
  };

  // HUD Zoom Controls
  const handleZoomIn = () => {
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const cx = vRect.width / 2;
    const cy = vRect.height / 2;
    const prevScale = scale;
    const nextScale = Math.min(scale * 1.25, 4.0);

    setPanX(cx - (cx - panX) * (nextScale / prevScale));
    setPanY(cy - (cy - panY) * (nextScale / prevScale));
    setScale(nextScale);
    dispatch(setZoomLevel(nextScale));
  };

  const handleZoomOut = () => {
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const cx = vRect.width / 2;
    const cy = vRect.height / 2;
    const prevScale = scale;
    const nextScale = Math.max(scale / 1.25, 0.4);

    setPanX(cx - (cx - panX) * (nextScale / prevScale));
    setPanY(cy - (cy - panY) * (nextScale / prevScale));
    setScale(nextScale);
    dispatch(setZoomLevel(nextScale));
  };

  // Center Element in View handler
  const centerElementInView = useCallback((elId?: string) => {
    const targetId = elId || selectedItem?.id;
    if (!targetId || !svgRef.current || !viewportRef.current) return;

    const el = svgRef.current.getElementById(targetId) as SVGGraphicsElement | null;
    if (!el || typeof el.getBBox !== 'function') return;

    const bbox = el.getBBox();
    const vRect = viewportRef.current.getBoundingClientRect();
    const newScale = 1.6;
    const newPanX = vRect.width / 2 - (bbox.x + bbox.width / 2) * newScale;
    const newPanY = vRect.height / 2 - (bbox.y + bbox.height / 2) * newScale;

    setScale(newScale);
    setPanX(newPanX);
    setPanY(newPanY);
    dispatch(setZoomLevel(newScale));
  }, [selectedItem, dispatch]);

  // Listen for custom center event from MachineDetailDrawer
  useEffect(() => {
    const handleCenterEvent = (e: CustomEvent<{ elementId?: string }>) => {
      centerElementInView(e.detail?.elementId);
    };

    window.addEventListener('floorplan:center-element', handleCenterEvent as EventListener);
    return () => {
      window.removeEventListener('floorplan:center-element', handleCenterEvent as EventListener);
    };
  }, [centerElementInView]);

  // Handle Category Filter & Search Highlighting on SVG Elements
  useEffect(() => {
    if (!svgRef.current) return;
    const allCadElements = svgRef.current.querySelectorAll<SVGGraphicsElement>('.cad-element');
    const query = (searchQuery || '').trim().toLowerCase();
    const category = (activeCategory || 'all').toLowerCase();

    let firstMatch: SVGGraphicsElement | null = null;

    allCadElements.forEach((el) => {
      const elCat = (el.getAttribute('data-category') || '').toLowerCase();
      const elName = (el.getAttribute('data-name') || '').toLowerCase();
      const elSpecs = (el.getAttribute('data-specs') || '').toLowerCase();
      const elId = el.id.toLowerCase();

      if (query) {
        if (elName.includes(query) || elSpecs.includes(query) || elId.includes(query)) {
          el.classList.remove('dimmed');
          el.classList.add('highlighted');
          if (!firstMatch) firstMatch = el;
        } else {
          el.classList.add('dimmed');
          el.classList.remove('highlighted');
        }
      } else {
        if (category === 'all' || elCat === category) {
          el.classList.remove('dimmed');
        } else {
          el.classList.add('dimmed');
        }

        if (selectedItem && el.id === selectedItem.id) {
          el.classList.add('highlighted');
        } else {
          el.classList.remove('highlighted');
        }
      }
    });

    if (firstMatch && query.length > 2 && viewportRef.current) {
      const bbox = (firstMatch as SVGGraphicsElement).getBBox();
      const vRect = viewportRef.current.getBoundingClientRect();
      const newScale = 1.4;
      const newPanX = vRect.width / 2 - (bbox.x + bbox.width / 2) * newScale;
      const newPanY = vRect.height / 2 - (bbox.y + bbox.height / 2) * newScale;
      setScale(newScale);
      setPanX(newPanX);
      setPanY(newPanY);
    }
  }, [activeCategory, searchQuery, selectedItem]);

  // Tooltip & Click interactions
  const handleElementMouseEnter = (e: React.MouseEvent<SVGElement>) => {
    const el = e.currentTarget;
    const name = el.getAttribute('data-name') || 'Shop Area';
    const cat = el.getAttribute('data-category') || 'Zone';

    if (viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect();
      setTooltip({
        visible: true,
        title: name,
        category: `Category: ${cat.toUpperCase()}`,
        x: e.clientX - vRect.left,
        y: e.clientY - vRect.top - 12,
      });
    }
  };

  const handleElementMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect();
      setTooltip((prev) => ({
        ...prev,
        x: e.clientX - vRect.left,
        y: e.clientY - vRect.top - 12,
      }));
    }
  };

  const handleElementMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleElementClick = (e: React.MouseEvent<SVGElement>) => {
    e.stopPropagation();
    const el = e.currentTarget;
    const id = el.id;
    const name = el.getAttribute('data-name') || 'Facility Area';
    const category = el.getAttribute('data-category') || 'machineshop';
    const specs =
      el.getAttribute('data-specs') ||
      'Standard facility equipment and operations zone.';

    dispatch(
      setSelectedItem({
        id,
        name,
        category,
        specs,
      })
    );
    dispatch(selectMachine(id));
    dispatch(selectDepartment(category));
  };

  return (
    <div
      className="viewport-container"
      id="viewport"
      ref={viewportRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      <div
        id="planCanvas"
        ref={canvasRef}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
        }}
      >
        <svg
          ref={svgRef}
          className="floor-plan-svg"
          id="floorPlanSvg"
          viewBox="0 0 2000 1000"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="cadGridMinor" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" className="cad-grid-minor" />
            </pattern>
            <pattern id="cadGridMajor" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#cadGridMinor)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" className="cad-grid-major" />
            </pattern>

            {/* Marker Glow Filter */}
            <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Drafting Grid */}
          <rect
            id="bgGrid"
            width="2000"
            height="1000"
            fill="url(#cadGridMajor)"
            style={{ display: showGrid ? 'block' : 'none' }}
          />

          {/* ====================================================================
               LAYER 1: ARCHITECTURAL WALLS & STRUCTURE (Outer & Interior Rooms)
               ==================================================================== */}
          <g id="layerArchitectural">
            {/* Outer Boundary Walls */}
            <path
              className="cad-outer-wall"
              d="
                M 60,140
                L 400,140
                L 400,50
                L 510,50
                L 510,140
                L 730,140
                M 790,140 L 980,140
                M 1020,140 L 1150,140
                M 1250,140 L 1760,140
                M 1830,140 L 1860,140
                L 1860,35
                L 1960,35
                L 1960,950
                L 60,950
                Z
              "
            />

            {/* Left Exterior Centerline / Crosshair Symbol */}
            <g transform="translate(30, 420)">
              <line x1="0" y1="0" x2="60" y2="0" stroke="#64748b" strokeWidth="1.5" strokeDasharray="12 4 3 4" />
              <line x1="30" y1="-30" x2="30" y2="30" stroke="#64748b" strokeWidth="1.5" strokeDasharray="12 4 3 4" />
              <text x="38" y="-12" fontSize="12" fill="#64748b" fontWeight="700">CL</text>
            </g>

            {/* North-West Entrance (Blue Dot Marker) */}
            <g
              id="elem_north_marker_west"
              className="cad-element"
              data-name="North Warehouse Gate Entrance (West)"
              data-category="office"
              data-specs="Main North Freight & Ingress portal."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <line x1="400" y1="140" x2="510" y2="140" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" />
              <line x1="400" y1="90" x2="510" y2="90" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
              <rect x="400" y="50" width="110" height="90" fill="rgba(56, 189, 248, 0.05)" />
              {/* {<circle cx="445" cy="55" r="16" fill="#2fa2e8" filter="url(#blueGlow)" stroke="#ffffff" strokeWidth="2.5" />} */}
            </g>

            {/* North-East Entrance (Blue Dot Marker) */}
            {/* {<g
              id="elem_north_marker_east"
              className="cad-element"
              data-name="North Executive Entrance (East)"
              data-category="office"
              data-specs="Executive & visitor personnel ingress."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1860" y="35" width="100" height="105" fill="rgba(56, 189, 248, 0.05)" stroke="#1e293b" strokeWidth="2" />
              <circle cx="1865" cy="35" r="16" fill="#2fa2e8" filter="url(#blueGlow)" stroke="#ffffff" strokeWidth="2.5" />
            </g>} */}

            {/* Top Corridor Structural Walls */}
            <line x1="730" y1="140" x2="810" y2="140" stroke="#1e293b" strokeWidth="3" />
            <line x1="810" y1="140" x2="810" y2="235" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="810" y1="235" x2="730" y2="235" stroke="#1e293b" strokeWidth="2.5" />

            {/* Top North Offices Suite */}
            {/* Storage Conex Box & Tool Crib */}
            <g
              id="elem_tool_crib"
              className="cad-element"
              data-name="Storage Conex Box & Tool Crib"
              data-category="storage"
              data-specs="Secure Tool Inventory, CNC Bit Management, Fixtures & Jigs storage."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1030" y="150" width="135" height="115" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <line x1="1097" y1="150" x2="1097" y2="265" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />
              <text className="label-text label-dark" x="1063" y="195" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>STORAGE</text>
              <text className="label-text label-dark" x="1063" y="208" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>CONEX BOX</text>
              <text className="label-text label-dark" x="1131" y="195" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>TOOL</text>
              <text className="label-text label-dark" x="1131" y="208" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>CRIB</text>
            </g>

            {/* Programming Dept */}
            <g
              id="elem_prog_dept"
              className="cad-element"
              data-name="Programming Department"
              data-category="office"
              data-specs="CAD/CAM Nesting, G-code Generation, Toolpath Optimization workstations."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1165" y="150" width="115" height="120" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              {/* Men's Bath & Stairs nook */}
              <rect x="1195" y="135" width="40" height="35" fill="#fef08a" stroke="#1e293b" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1215" y="146" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>MENS</text>
              <text className="label-text label-dark" x="1215" y="156" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
              <text className="label-text label-dark" x="1222" y="215" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>PROGRAMMING</text>
              <text className="label-text label-dark" x="1222" y="230" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
            </g>

            {/* QA & Machine Office & QC Inspection Area */}
            <g
              id="elem_qa_office"
              className="cad-element"
              data-name="Q.A. & Mach. Office / QC Inspection Area"
              data-category="office"
              data-specs="Quality Assurance Management, CMM Reports, Granite surface plates."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1305" y="135" width="130" height="135" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <line x1="1305" y1="195" x2="1435" y2="195" stroke="#1e293b" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1370" y="160" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>Q.A. &amp; MACH.</text>
              <text className="label-text label-dark" x="1370" y="174" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
              <text className="label-text label-dark" x="1370" y="222" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>Q.C. INSPECTION</text>
              <text className="label-text label-dark" x="1370" y="236" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Lunch / Break Area */}
            <g
              id="elem_break_room"
              className="cad-element"
              data-name="Lunch & Break Area"
              data-category="office"
              data-specs="Employee cafeteria, refrigerators, break seating."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1435" y="135" width="75" height="135" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1472" y="195" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>LUNCH /</text>
              <text className="label-text label-dark" x="1472" y="208" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>BREAK</text>
              <text className="label-text label-dark" x="1472" y="221" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* East Administrative Block */}
            <rect x="1780" y="140" width="180" height="510" fill="#f8fafc" stroke="#1e293b" strokeWidth="3" />

            {/* Guest Waiting Area */}
            <g
              id="elem_guest_waiting"
              className="cad-element"
              data-name="Guest Waiting Area"
              data-category="office"
              data-specs="Executive visitor reception and staging lobby."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="145" width="90" height="42" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1825" y="162" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>GUEST WAITING</text>
              <text className="label-text label-dark" x="1825" y="174" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Front Desk */}
            <g
              id="elem_front_desk"
              className="cad-element"
              data-name="Front Desk"
              data-category="office"
              data-specs="Visitor check-in, security badge management."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="187" width="90" height="42" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1825" y="204" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>FRONT</text>
              <text className="label-text label-dark" x="1825" y="216" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>DESK</text>
            </g>

            {/* Accounting */}
            <g
              id="elem_accounting"
              className="cad-element"
              data-name="Accounting Office"
              data-category="office"
              data-specs="Financial controllers, billing, vendor payables."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="229" width="90" height="45" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1825" y="254" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>ACCOUNTING</text>
            </g>

            {/* Harcon Sales Office */}
            <g
              id="elem_sales"
              className="cad-element"
              data-name="Harcon Sales Office"
              data-category="office"
              data-specs="Commercial maritime accounts, contracts & bidding estimators."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="274" width="90" height="52" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1825" y="294" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>HARCON</text>
              <text className="label-text label-dark" x="1825" y="306" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>SALES</text>
              <text className="label-text label-dark" x="1825" y="318" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* J.A. Office */}
            <g
              id="elem_ja_office"
              className="cad-element"
              data-name="J.A. Office"
              data-category="office"
              data-specs="Executive Operations Director suite."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="326" width="90" height="55" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1825" y="352" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>J.A.</text>
              <text className="label-text label-dark" x="1825" y="365" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* Conference Room */}
            <g
              id="elem_conference"
              className="cad-element"
              data-name="Conference Room"
              data-category="office"
              data-specs="12-person boardroom table, video conferencing."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="145" width="90" height="84" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1915" y="182" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>CONFERENCE</text>
              <text className="label-text label-dark" x="1915" y="195" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>ROOM</text>
            </g>

            {/* HR Office */}
            <g
              id="elem_hr"
              className="cad-element"
              data-name="HR Office"
              data-category="office"
              data-specs="Human Resources, onboarding, payroll & benefits."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="229" width="90" height="45" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1915" y="248" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>HR</text>
              <text className="label-text label-dark" x="1915" y="260" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* Purchasing Office */}
            <g
              id="elem_purchasing"
              className="cad-element"
              data-name="Purchasing Office"
              data-category="office"
              data-specs="Raw material procurement, mill certificates, tooling orders."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="274" width="90" height="52" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1915" y="295" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>PURCHASING</text>
              <text className="label-text label-dark" x="1915" y="308" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* Control Room (Solid Red) */}
            <g
              id="elem_control_room"
              className="cad-element"
              data-name="Control Room"
              data-category="office"
              data-specs="Shop Floor Dispatch, ERP tracking & central operations."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="326" width="90" height="55" fill="#b92d34" stroke="#7f1d1d" strokeWidth="1.5" />
              <text className="label-text label-white" x="1915" y="348" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>CONTROL</text>
              <text className="label-text label-white" x="1915" y="360" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>ROOM</text>
            </g>

            {/* Planning & Quoting Dept */}
            <g
              id="elem_planning_dept"
              className="cad-element"
              data-name="Planning & Quoting Department"
              data-category="office"
              data-specs="Production routing, job quoting, bill of materials management."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="415" width="90" height="145" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1825" y="485" fontSize="8" transform="rotate(-90 1825 485)" style={{ display: showLabels ? undefined : 'none' }}>PLANNING &amp; QUOTING DEPT.</text>
            </g>

            {/* Admin Restrooms Suite */}
            <g
              id="elem_east_restrooms"
              className="cad-element"
              data-name="Admin Restrooms Suite"
              data-category="office"
              data-specs="Office facility restrooms."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="415" width="90" height="145" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <line x1="1915" y1="415" x2="1915" y2="560" stroke="#475569" strokeWidth="1" />
              <line x1="1870" y1="490" x2="1960" y2="490" stroke="#475569" strokeWidth="1" />
              <text className="label-text label-dark" x="1892" y="450" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>WOMEN'S</text>
              <text className="label-text label-dark" x="1892" y="460" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
              <text className="label-text label-dark" x="1938" y="450" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>EXEC</text>
              <text className="label-text label-dark" x="1938" y="460" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
            </g>

            {/* Engineering Dept & Head Engineer */}
            <g
              id="elem_engineering_dept"
              className="cad-element"
              data-name="Engineering Department"
              data-category="office"
              data-specs="SolidWorks design stations, structural FEA, marine fabrication schematics."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="565" width="120" height="85" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1840" y="602" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>ENGINEERING</text>
              <text className="label-text label-dark" x="1840" y="615" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
            </g>

            <g
              id="elem_head_engineer"
              className="cad-element"
              data-name="Head Engineer Office"
              data-category="office"
              data-specs="Chief Marine Architect & Engineering Director private office."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1900" y="565" width="60" height="85" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1930" y="600" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>HEAD</text>
              <text className="label-text label-dark" x="1930" y="612" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>ENGINEER</text>
              <text className="label-text label-dark" x="1930" y="624" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 2: WEST FLOOR (Hardware, Powdercoat, Assembly, Honeycomb)
               ==================================================================== */}
          <g id="layerWestFloor">
            {/* Hardware Dept (Olive green) */}
            <g
              id="elem_hardware_dept"
              className="cad-element"
              data-name="Hardware Department"
              data-category="storage"
              data-specs="Fasteners, marine hardware, hinges, latches, gasketing inventory."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="75" y="145" width="175" height="125" fill="#48633b" stroke="#283325" strokeWidth="2.5" />
              <rect x="155" y="215" width="95" height="55" fill="#3a4f30" stroke="#283325" strokeWidth="1.5" />
              <text className="label-text label-white" x="162" y="195" fontSize="12" style={{ display: showLabels ? undefined : 'none' }}>HARDWARE</text>
              <text className="label-text label-white" x="162" y="212" fontSize="12" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
            </g>

            {/* Powdercoat Area (Large Solid Green Rectangle with internal layout lines) */}
            <g
              id="elem_powdercoat"
              className="cad-element"
              data-name="Powdercoat Area"
              data-category="coating"
              data-specs="Automated wash, dry-off oven, electrostatic spray booths, cure batch oven."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="75" y="335" width="305" height="500" fill="#3da35d" stroke="#163e23" strokeWidth="3" />
              {/* Internal booth lines & divider markings */}
              <rect x="235" y="580" width="130" height="230" fill="none" stroke="#163e23" strokeWidth="2" />
              <line x1="235" y1="655" x2="365" y2="655" stroke="#163e23" strokeWidth="1.5" strokeDasharray="6 3" />
              <line x1="235" y1="730" x2="365" y2="730" stroke="#163e23" strokeWidth="1.5" strokeDasharray="6 3" />
              <line x1="300" y1="580" x2="300" y2="810" stroke="#163e23" strokeWidth="1.5" />
              <text className="label-text label-dark" x="227" y="595" fontSize="14" fontWeight="800" style={{ display: showLabels ? undefined : 'none' }}>POWDERCOAT</text>
              <text className="label-text label-dark" x="227" y="618" fontSize="14" fontWeight="800" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Assembly Staging Area (Purple) */}
            <g
              id="elem_assembly_staging"
              className="cad-element"
              data-name="Assembly Staging Area"
              data-category="staging"
              data-specs="Sub-assembly integration, rivnut installation, quality sign-off."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="425" y="335" width="115" height="155" fill="#753a74" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="482" y="405" fontSize="11" style={{ display: showLabels ? undefined : 'none' }}>ASSEMBLY</text>
              <text className="label-text label-white" x="482" y="422" fontSize="11" style={{ display: showLabels ? undefined : 'none' }}>STAGING AREA</text>
            </g>

            {/* Honeycomb Press Mach (Solid Red below Assembly Staging) */}
            <g
              id="elem_honeycomb_press"
              className="cad-element"
              data-name="Honeycomb Press Machine"
              data-category="cnc"
              data-specs="Structural composite panel lamination press for lightweight marine partitions."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="395" y="630" width="115" height="60" fill="#b92d34" stroke="#871c1c" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="452" y="655" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>HONEYCOMB PRESS</text>
              <text className="label-text label-white" x="452" y="670" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>MACH.</text>
            </g>

            {/* Assembly Orange Tables / Lathes Column */}
            {[
              { id: 'elem_table_1', name: 'Lathe Table #1', label: 'LANFONIVE #1', y: 345 },
              { id: 'elem_table_2', name: 'Lathe Table #2', label: 'CLNANFNVR #2', y: 395 },
              { id: 'elem_table_3', name: 'Lathe Table #3', label: 'LAHTNFNVR #3', y: 445 },
              { id: 'elem_table_4', name: 'Lathe Table #4', label: 'IMFNANV #2', y: 495 },
              { id: 'elem_table_5', name: 'Lathe Table #5', label: 'LATHE TABLE #5', y: 565 },
            ].map((tbl) => (
              <g
                key={tbl.id}
                id={tbl.id}
                className="cad-element"
                data-name={tbl.name}
                data-category="upholstery"
                data-specs="Precision assembly and fitting workbench."
                onMouseEnter={handleElementMouseEnter}
                onMouseMove={handleElementMouseMove}
                onMouseLeave={handleElementMouseLeave}
                onClick={handleElementClick}
              >
                <rect x="605" y={tbl.y} width="35" height="42" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
                <text className="label-text label-white" x="622" y={tbl.y + 16} fontSize="5" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
                <text className="label-text label-white" x="622" y={tbl.y + 26} fontSize="5" style={{ display: showLabels ? undefined : 'none' }}>TABLE</text>
              </g>
            ))}

            {/* Horizontal Lathe Tables */}
            <g
              id="elem_table_6"
              className="cad-element"
              data-name="Lathe Table #6"
              data-category="upholstery"
              data-specs="Assembly fitting table."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="585" y="635" width="60" height="22" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="615" y="648" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>LATHE TABLE #6</text>
            </g>

            <g
              id="elem_table_7"
              className="cad-element"
              data-name="Lathe Table #7"
              data-category="upholstery"
              data-specs="Assembly fitting table."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="560" y="662" width="75" height="24" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="597" y="676" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>LATHE TABLE #7</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 3: CENTER FLOOR (Storage Racks, Upholstery, Machine Shop)
               ==================================================================== */}
          <g id="layerCenterFloor">
            {/* Storage Rack #6 (Top purple strip) */}
            <g
              id="elem_rack_6"
              className="cad-element"
              data-name="Storage Rack #6"
              data-category="storage"
              data-specs="Cantilever stock storage rack #6."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="550" y="145" width="170" height="26" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="635" y="161" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #6</text>
            </g>

            {/* Storage Rack #7 (Top lower purple strip) */}
            <g
              id="elem_rack_7"
              className="cad-element"
              data-name="Storage Rack #7"
              data-category="storage"
              data-specs="Pallet sheet stock storage rack #7."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="550" y="210" width="135" height="26" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="617" y="226" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #7</text>
            </g>

            {/* Storage Rack #4 (Large vertical purple) */}
            <g
              id="elem_rack_4"
              className="cad-element"
              data-name="Storage Rack #4 (Vertical)"
              data-category="storage"
              data-specs="Vertical sheet metal rack, high-density alloy sheet storage."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="685" y="330" width="85" height="270" fill="#753a74" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="727" y="465" fontSize="11" transform="rotate(-90 727 465)" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #4</text>
            </g>

            {/* Storage Rack #5 (Purple square / rect) */}
            <g
              id="elem_rack_5"
              className="cad-element"
              data-name="Storage Rack #5"
              data-category="storage"
              data-specs="Fastener bins and pre-assembly kit storage."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="685" y="635" width="90" height="130" fill="#753a74" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="730" y="700" fontSize="10" transform="rotate(-90 730 700)" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #5</text>
            </g>

            {/* Upholstery Area (Tall Orange Rectangle) */}
            <g
              id="elem_upholstery"
              className="cad-element"
              data-name="Upholstery Area"
              data-category="upholstery"
              data-specs="Marine vinyl cutting tables, foam bonding, sewing stations & seat assembly."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="825" y="335" width="75" height="320" fill="#df7325" stroke="#944810" strokeWidth="2" />
              <text className="label-text label-white" x="862" y="495" fontSize="13" transform="rotate(-90 862 495)" style={{ display: showLabels ? undefined : 'none' }}>UPHOLSTERY AREA</text>
            </g>

            {/* Machine Shop Area: Individual Orange Machines (No Background Enclosure) */}
            {/* Text label in center aisle */}
            <text className="label-text label-dark" x="1035" y="525" fontSize="13" transform="rotate(-90 1035 525)" style={{ display: showLabels ? undefined : 'none' }}>
              MACHINE SHOP AREA
            </text>

            {/* Lathe Column (Orange `#df7325`) */}
            <g
              id="elem_lathe_mach_4"
              className="cad-element"
              data-name="Lathe Mach. #4"
              data-category="machineshop"
              data-specs="CNC Turning Center with live tooling and bar feeder."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="925" y="335" width="65" height="45" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="957" y="352" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
              <text className="label-text label-white" x="957" y="364" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>MACH. #4</text>
            </g>

            <g
              id="elem_lathe_mach_3"
              className="cad-element"
              data-name="Lathe Mach. #3"
              data-category="machineshop"
              data-specs="Heavy-duty 2-axis CNC lathe for marine shafting."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="925" y="390" width="65" height="45" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="957" y="407" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
              <text className="label-text label-white" x="957" y="419" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>MACH. #3</text>
            </g>

            <g
              id="elem_lathe_mach_2"
              className="cad-element"
              data-name="Lathe Mach. #2"
              data-category="machineshop"
              data-specs="High-speed precision chucking lathe."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="925" y="445" width="65" height="45" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="957" y="462" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
              <text className="label-text label-white" x="957" y="474" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>MACH. #2</text>
            </g>

            <g
              id="elem_lathe_mach_1"
              className="cad-element"
              data-name="Lathe Mach. #1"
              data-category="machineshop"
              data-specs="Multi-axis turning center with sub-spindle."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="925" y="500" width="65" height="45" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="957" y="517" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
              <text className="label-text label-white" x="957" y="529" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>MACH. #1</text>
            </g>

            <g
              id="elem_haas_mach_3"
              className="cad-element"
              data-name="Haas Mach. #3 (VMC)"
              data-category="machineshop"
              data-specs="Haas VF-4 50-taper vertical machining center for titanium & stainless."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="925" y="555" width="65" height="95" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="957" y="602" fontSize="8.5" transform="rotate(-90 957 602)" style={{ display: showLabels ? undefined : 'none' }}>HAAS MACH. #3</text>
            </g>

            {/* Haas Right Column */}
            <g
              id="elem_haas_mach_1"
              className="cad-element"
              data-name="Haas Mach. #1 (VMC)"
              data-category="machineshop"
              data-specs="Haas VF-6 Vertical Machining Center with 64x32 inch travel."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1090" y="335" width="55" height="85" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="377" fontSize="8.5" transform="rotate(-90 1117 377)" style={{ display: showLabels ? undefined : 'none' }}>HAAS MACH. #1</text>
            </g>

            <g
              id="elem_haas_mach_2"
              className="cad-element"
              data-name="Haas Mach. #2 (VMC)"
              data-category="machineshop"
              data-specs="Haas VF-2 High Speed VMC with Renishaw wireless probing."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1090" y="440" width="55" height="90" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="485" fontSize="8.5" transform="rotate(-90 1117 485)" style={{ display: showLabels ? undefined : 'none' }}>HAAS MACH. #2</text>
            </g>

            <g
              id="elem_haas_mach_4"
              className="cad-element"
              data-name="Haas Mach. #4"
              data-category="machineshop"
              data-specs="Haas Mini Mill 2 production machine."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1090" y="635" width="55" height="40" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="650" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>HAAS</text>
              <text className="label-text label-white" x="1117" y="662" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH. #4</text>
            </g>

            <g
              id="elem_haas_mach_5"
              className="cad-element"
              data-name="Haas Mach. #5"
              data-category="machineshop"
              data-specs="Haas CNC drill-tap machining cell."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1090" y="695" width="55" height="40" fill="#df7325" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="710" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>HAAS</text>
              <text className="label-text label-white" x="1117" y="722" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH. #5</text>
            </g>

            {/* Manual Drill Area */}
            <g
              id="elem_manual_drill"
              className="cad-element"
              data-name="Manual Drill Area"
              data-category="welding"
              data-specs="Radial arm drill press, tapping heads, countersink fixtures."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1065" y="755" width="90" height="35" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1110" y="770" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>MANUAL</text>
              <text className="label-text label-dark" x="1110" y="781" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>DRILL AREA</text>
            </g>

            {/* Weld Robot #2 (Beneath Machine Shop) */}
            <g
              id="elem_weld_robot_2"
              className="cad-element"
              data-name="Weld Robot #2"
              data-category="welding"
              data-specs="6-axis robotic MIG/TIG arm with dual indexing rotary positioners."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="840" y="735" width="65" height="50" fill="#52b86e" stroke="#256e39" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="872" y="755" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>WELD ROBOT</text>
              <text className="label-text label-white" x="872" y="768" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>#2</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 4: EAST FLOOR (Amada Turrets, Spot Weld, Press Brakes)
               ==================================================================== */}
          <g id="layerFabrication">
            {/* Top Red/Teal Blocks: AMADA EMK MACH (Red) & AMADA LOADER (Teal) */}
            <g
              id="elem_amada_emk"
              className="cad-element"
              data-name="Amada EMK Mach."
              data-category="cnc"
              data-specs="Amada EMK 3610 NT high-speed servo-electric punch press."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1245" y="345" width="150" height="88" fill="#b92d34" stroke="#871c1c" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1320" y="385" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1320" y="399" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>EMK MACH</text>
            </g>

            <g
              id="elem_amada_loader_top"
              className="cad-element"
              data-name="Amada Loader (Top)"
              data-category="cnc"
              data-specs="Automated vacuum cup sheet loader and unloader tower."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1400" y="345" width="55" height="88" fill="#2bb89a" stroke="#13593f" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1427" y="389" fontSize="8.5" transform="rotate(-90 1427 389)" style={{ display: showLabels ? undefined : 'none' }}>AMADA LOADER</text>
            </g>

            <g
              id="elem_gen_staging"
              className="cad-element"
              data-name="General Staging Area"
              data-category="staging"
              data-specs="Processed sheet parts awaiting deburring and forming."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1465" y="345" width="75" height="88" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1502" y="382" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>GENERAL</text>
              <text className="label-text label-white" x="1502" y="396" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>STAGING</text>
              <text className="label-text label-white" x="1502" y="410" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Bottom Red/Teal Blocks: AMADA EML MACH. (Red) & AMADA LOADER (Teal) */}
            <g
              id="elem_amada_eml"
              className="cad-element"
              data-name="Amada EML Mach."
              data-category="cnc"
              data-specs="Amada EML Punch/Laser combination with 30-ton servo drive."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1255" y="505" width="135" height="65" fill="#b92d34" stroke="#871c1c" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1322" y="532" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1322" y="546" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>EML MACH.</text>
            </g>

            <g
              id="elem_amada_loader_bottom"
              className="cad-element"
              data-name="Amada Loader (Lower)"
              data-category="cnc"
              data-specs="Automated sheet feeder mechanism."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1395" y="505" width="55" height="88" fill="#2bb89a" stroke="#13593f" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1422" y="549" fontSize="8.5" transform="rotate(-90 1422 549)" style={{ display: showLabels ? undefined : 'none' }}>AMADA LOADER</text>
            </g>

            {/* Spot Weld Section: Staging Area & 2x2 Yellow Grid */}
            <g
              id="elem_sw_staging"
              className="cad-element"
              data-name="Spot Weld Staging Area"
              data-category="staging"
              data-specs="Staged enclosures and panels for spot welding assembly."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1475" y="590" width="60" height="180" fill="#753a74" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="1505" y="680" fontSize="9.5" transform="rotate(-90 1505 680)" style={{ display: showLabels ? undefined : 'none' }}>SPOT WELD STAGING AREA</text>
            </g>

            {/* 2x2 Yellow SW Machines */}
            <g
              id="elem_sw_3"
              className="cad-element"
              data-name="Spot Weld Mach. #3"
              data-category="welding"
              data-specs="Pneumatic resistance spot welder."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1390" y="645" width="36" height="38" fill="#f3a829" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1408" y="658" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1408" y="668" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>MACH</text>
              <text className="label-text label-yellow" x="1408" y="677" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>#3</text>
            </g>

            <g
              id="elem_sw_4"
              className="cad-element"
              data-name="Spot Weld Mach. #4"
              data-category="welding"
              data-specs="Pneumatic resistance spot welder."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1430" y="645" width="36" height="38" fill="#f3a829" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1448" y="658" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1448" y="668" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>MACH</text>
              <text className="label-text label-yellow" x="1448" y="677" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>#4</text>
            </g>

            <g
              id="elem_sw_1"
              className="cad-element"
              data-name="Spot Weld Mach. #1"
              data-category="welding"
              data-specs="Foot-actuated spot welder."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1390" y="692" width="36" height="38" fill="#f3a829" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1408" y="705" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1408" y="715" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>MACH</text>
              <text className="label-text label-yellow" x="1408" y="724" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>#1</text>
            </g>

            <g
              id="elem_sw_2"
              className="cad-element"
              data-name="Spot Weld Mach. #2"
              data-category="welding"
              data-specs="Foot-actuated spot welder."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1430" y="692" width="36" height="38" fill="#f3a829" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1448" y="705" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1448" y="715" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>MACH</text>
              <text className="label-text label-yellow" x="1448" y="724" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>#2</text>
            </g>

            {/* Press Brake Staging Strip #2 (West Strip) */}
            <g
              id="elem_press_staging_2"
              className="cad-element"
              data-name="Press Brake Staging Area #2"
              data-category="staging"
              data-specs="Forming queue lane #2 for sheet metal parts."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1575" y="345" width="18" height="340" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1584" y="515" fontSize="7.5" transform="rotate(-90 1584 515)" style={{ display: showLabels ? undefined : 'none' }}>PRESS BRAKE STAGING AREA #2</text>
            </g>

            {/* Press Brake Staging Strip #1 (East Strip) */}
            <g
              id="elem_press_staging_1"
              className="cad-element"
              data-name="Press Brake Staging Area #1"
              data-category="staging"
              data-specs="Finished bent components awaiting weld and hardware."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1705" y="345" width="18" height="430" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1714" y="560" fontSize="7.5" transform="rotate(-90 1714 560)" style={{ display: showLabels ? undefined : 'none' }}>PRESS BRAKE STAGING AREA #1</text>
            </g>

            {/* Left Column of Green Amada Press Brakes */}
            <g
              id="elem_amada_hds_2204"
              className="cad-element"
              data-name="Amada HDS 2204 NT Press Brake"
              data-category="cnc"
              data-specs="240-ton 8-axis CNC hydraulic/servo press brake."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1603" y="350" width="40" height="65" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1623" y="375" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA HDS</text>
              <text className="label-text label-white" x="1623" y="386" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>2204 NT</text>
            </g>

            <g
              id="elem_amada_hds_8025"
              className="cad-element"
              data-name="Amada HDS 8025 NT Press Brake"
              data-category="cnc"
              data-specs="88-ton 8-foot precision bending machine."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1603" y="425" width="40" height="55" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1623" y="446" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA HDS</text>
              <text className="label-text label-white" x="1623" y="457" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>8025 NT</text>
            </g>

            <g
              id="elem_amada_hds_5020_left"
              className="cad-element"
              data-name="Amada HDS 5020 NT Press Brake"
              data-category="cnc"
              data-specs="55-ton CNC hydraulic press brake."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1603" y="492" width="40" height="42" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1623" y="508" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA HDS</text>
              <text className="label-text label-white" x="1623" y="519" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>5020 NT</text>
            </g>

            <g
              id="elem_amada_rg_100"
              className="cad-element"
              data-name="Amada RG 100 Press Brake"
              data-category="cnc"
              data-specs="100-ton mechanical-hydraulic up-acting press brake."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1603" y="545" width="40" height="40" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1623" y="560" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1623" y="571" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>RG 100</text>
            </g>

            <g
              id="elem_amada_rg_50"
              className="cad-element"
              data-name="Amada RG 50 Press Brake"
              data-category="cnc"
              data-specs="50-ton compact press brake for fine brackets."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1603" y="625" width="40" height="50" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1623" y="645" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1623" y="656" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>RG 50</text>
            </g>

            {/* Right Column of Green Amada Press Brakes */}
            <g
              id="elem_amada_hg_1003_1"
              className="cad-element"
              data-name="Amada HG 1003 ATC #1 Press Brake"
              data-category="cnc"
              data-specs="Automatic Tool Changer press brake, 110-ton capacity."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1653" y="350" width="40" height="65" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1673" y="375" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA HG</text>
              <text className="label-text label-white" x="1673" y="386" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>1003 ATC #1</text>
            </g>

            <g
              id="elem_amada_hg_1003_2"
              className="cad-element"
              data-name="Amada HG 1003 ATC #2 Press Brake"
              data-category="cnc"
              data-specs="Precision sheet forming cell with automated bend angle sensors."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1653" y="495" width="40" height="65" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1673" y="520" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA HG</text>
              <text className="label-text label-white" x="1673" y="531" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>1003 ATC #2</text>
            </g>

            <g
              id="elem_amada_hds_5020_right"
              className="cad-element"
              data-name="Amada HDS 5020 NT Press Brake"
              data-category="cnc"
              data-specs="55-ton forming press."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1653" y="605" width="40" height="60" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1673" y="630" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA HDS</text>
              <text className="label-text label-white" x="1673" y="641" fontSize="5.5" style={{ display: showLabels ? undefined : 'none' }}>5020 NT</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 5: SOUTH WALL (Bottom Row from Left to Right)
               ==================================================================== */}
          <g id="layerSouthFloor">
            {/* Sandblast Mach (Yellow) */}
            <g
              id="elem_sandblast"
              className="cad-element"
              data-name="Sandblast Machine"
              data-category="welding"
              data-specs="Enclosed abrasive grit blasting cabinet."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="400" y="890" width="120" height="50" fill="#f3a829" stroke="#a16207" strokeWidth="2" rx="2" />
              <text className="label-text label-yellow" x="460" y="915" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>SANDBLAST MACH.</text>
            </g>

            {/* Grind Area (Tan `#e8cca7`) */}
            <g
              id="elem_grind_area"
              className="cad-element"
              data-name="Grind Area"
              data-category="welding"
              data-specs="Heavy deburring, edge conditioning, blending, angle grinding benches."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="600" y="850" width="175" height="95" fill="#e8cca7" stroke="#99703f" strokeWidth="2" />
              <text className="label-text label-dark" x="687" y="897" fontSize="11" fontWeight="700" style={{ display: showLabels ? undefined : 'none' }}>GRIND AREA</text>
            </g>

            {/* Weld Robot #1 (Green) */}
            <g
              id="elem_weld_robot_1"
              className="cad-element"
              data-name="Weld Robot #1"
              data-category="welding"
              data-specs="Heavy robotic weld cell for longitudinal pipe and seam welding."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="785" y="880" width="80" height="65" fill="#52b86e" stroke="#256e39" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="825" y="907" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>WELD ROBOT</text>
              <text className="label-text label-white" x="825" y="920" fontSize="7.5" style={{ display: showLabels ? undefined : 'none' }}>#1</text>
            </g>

            {/* Weld Staging Area #2 (Purple) */}
            <g
              id="elem_weld_staging_2"
              className="cad-element"
              data-name="Weld Staging Area #2"
              data-category="staging"
              data-specs="Fixtured subassemblies ready for robotic cell cycle."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="840" y="805" width="150" height="30" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="915" y="820" fontSize="8.5" style={{ display: showLabels ? undefined : 'none' }}>WELD STAGING AREA #2</text>
            </g>

            {/* Weld Staging Area #1 (Purple) */}
            <g
              id="elem_weld_staging_1"
              className="cad-element"
              data-name="Weld Staging Area #1"
              data-category="staging"
              data-specs="Pre-weld component carts and tack-welded weldments."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1075" y="805" width="100" height="30" fill="#753a74" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1125" y="816" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>WELD STAGING</text>
              <text className="label-text label-white" x="1125" y="826" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>AREA #1</text>
            </g>

            {/* 7 Open Partitioned Weld Area Booths */}
            {[
              { id: 'elem_weld_1', num: 1, x: 885 },
              { id: 'elem_weld_2', num: 2, x: 928 },
              { id: 'elem_weld_3', num: 3, x: 971 },
              { id: 'elem_weld_4', num: 4, x: 1014 },
              { id: 'elem_weld_5', num: 5, x: 1057 },
              { id: 'elem_weld_6', num: 6, x: 1100 },
              { id: 'elem_weld_7', num: 7, x: 1143 },
            ].map((weld) => (
              <g
                key={weld.id}
                id={weld.id}
                className="cad-element"
                data-name={`Weld Area #${weld.num}`}
                data-category="welding"
                data-specs="MIG/TIG welding station with local fume extraction arm."
                onMouseEnter={handleElementMouseEnter}
                onMouseMove={handleElementMouseMove}
                onMouseLeave={handleElementMouseLeave}
                onClick={handleElementClick}
              >
                <rect x={weld.x} y="875" width="40" height="70" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
                <circle cx={weld.x + 20} cy="890" r="5" fill="#f59e0b" opacity="0.8" />
                <text
                  className="label-text label-dark"
                  x={weld.x + 20}
                  y="918"
                  fontSize="6.5"
                  transform={`rotate(-90 ${weld.x + 20} 918)`}
                  style={{ display: showLabels ? undefined : 'none' }}
                >
                  {`WELD AREA #${weld.num}`}
                </text>
              </g>
            ))}

            {/* OMAX Waterjets (Blue `#086ea8`) */}
            <g
              id="elem_omax_2"
              className="cad-element"
              data-name="OMAX Mach. #2 (Waterjet)"
              data-category="cutting"
              data-specs="OMAX 80X JetMachining Center, abrasive waterjet with tilt-A-jet taper compensation."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1295" y="865" width="145" height="75" fill="#086ea8" stroke="#064e77" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1367" y="898" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>OMAX</text>
              <text className="label-text label-white" x="1367" y="912" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>MACH. #2</text>
            </g>

            <g
              id="elem_omax_1"
              className="cad-element"
              data-name="OMAX Mach. #1 (Waterjet)"
              data-category="cutting"
              data-specs="OMAX 60120 Bridge-style waterjet, dual EnduroMAX 50HP pumps."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1475" y="865" width="145" height="75" fill="#086ea8" stroke="#064e77" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1547" y="898" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>OMAX</text>
              <text className="label-text label-white" x="1547" y="912" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>MACH. #1</text>
            </g>

            {/* Amada Loader (Teal `#2bb89a`) & Laser Amada (Red `#b92d34`) */}
            <g
              id="elem_laser_loader"
              className="cad-element"
              data-name="Amada Laser Loader Tower"
              data-category="cutting"
              data-specs="Automated material shuttle table and pallet elevator."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1665" y="820" width="70" height="120" fill="#2bb89a" stroke="#13593f" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1700" y="880" fontSize="9.5" transform="rotate(-90 1700 880)" style={{ display: showLabels ? undefined : 'none' }}>AMADA LOADER</text>
            </g>

            <g
              id="elem_laser_amada"
              className="cad-element"
              data-name="Laser Amada Cutting System"
              data-category="cutting"
              data-specs="Amada Ensis 6kW Fiber Laser with clean-fast cut technology."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1750" y="820" width="150" height="120" fill="#b92d34" stroke="#661922" strokeWidth="2.5" rx="2" />
              <text className="label-text label-white" x="1825" y="880" fontSize="12" style={{ display: showLabels ? undefined : 'none' }}>LASER AMADA</text>
            </g>

            {/* Manual Saw Machine Area (Text) */}
            <g
              id="elem_saw_text_label"
              className="cad-element"
              data-name="Manual Saw Machine Area"
              data-category="welding"
              data-specs="Miter saws, cold cut saws and material roller infeed tables."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <text className="label-text label-dark" x="1870" y="675" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>MANUAL SAW</text>
              <text className="label-text label-dark" x="1870" y="688" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>MACHINE AREA</text>
            </g>

            {/* Amada 250 Saw Machine (Yellow) */}
            <g
              id="elem_amada_250_saw"
              className="cad-element"
              data-name="Amada 250 Saw Machine"
              data-category="cutting"
              data-specs="Amada HK-700 / 250 CNC horizontal bandsaw."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="725" width="180" height="45" fill="#f3a829" stroke="#a16207" strokeWidth="2" rx="2" />
              <text className="label-text label-yellow" x="1870" y="742" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>AMADA 250</text>
              <text className="label-text label-yellow" x="1870" y="755" fontSize="9.5" style={{ display: showLabels ? undefined : 'none' }}>SAW MACHINE</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 6: STATUS BADGES OVERLAY (Toggled by showStatusIndicators)
               ==================================================================== */}
          <g id="layerStatusDots" style={{ display: showStatusIndicators ? 'block' : 'none' }}>
            <circle cx="1255" cy="360" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1265" cy="520" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="940" cy="350" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="940" cy="405" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="940" cy="460" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="940" cy="515" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="940" cy="570" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1105" cy="350" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1105" cy="455" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1310" cy="880" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1490" cy="880" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1765" cy="840" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1615" cy="365" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1665" cy="365" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      {/* ==========================================================================
           BOTTOM-LEFT HUD: COMPASS & DYNAMIC COORDINATES
           ========================================================================== */}
      <div className="hud-compass">
        <div className="compass-dial">
          <div className="compass-needle" />
        </div>
        <div className="compass-labels">
          <strong>FACILITY NORTH</strong>
          <span id="coordsDisplay">{`X: ${coords.x} | Y: ${coords.y}`}</span>
        </div>
      </div>

      {/* ==========================================================================
           BOTTOM-RIGHT HUD: ZOOM & RESET CONTROLS
           ========================================================================== */}
      <div className="hud-zoom-controls">
        <button
          type="button"
          className="hud-btn"
          id="btnZoomIn"
          title="Zoom In"
          onClick={handleZoomIn}
        >
          +
        </button>
        <button
          type="button"
          className="hud-btn"
          id="btnZoomOut"
          title="Zoom Out"
          onClick={handleZoomOut}
        >
          −
        </button>
        <button
          type="button"
          className="hud-btn"
          id="btnResetView"
          title="Reset View"
          style={{ fontSize: '14px' }}
          onClick={fitToScreen}
        >
          ⟲
        </button>
      </div>

      {/* ==========================================================================
           HOVER TOOLTIP
           ========================================================================== */}
      <div
        id="tooltip"
        className={tooltip.visible ? 'visible' : ''}
        style={{
          left: `${tooltip.x}px`,
          top: `${tooltip.y}px`,
        }}
      >
        <div className="tt-title" id="ttTitle">{tooltip.title}</div>
        <div className="tt-category" id="ttCategory">{tooltip.category}</div>
      </div>
    </div>
  );
};
