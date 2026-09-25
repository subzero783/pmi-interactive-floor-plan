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
    // Ignore clicks on HUD controls, tooltip or drawer
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
      // Coordinate tracking over viewport
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

      // If search query is active
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
        // Search query empty -> filter by category
        if (category === 'all' || elCat === category) {
          el.classList.remove('dimmed');
        } else {
          el.classList.add('dimmed');
        }

        // Keep selection highlight if this is the selected element
        if (selectedItem && el.id === selectedItem.id) {
          el.classList.add('highlighted');
        } else {
          el.classList.remove('highlighted');
        }
      }
    });

    // Auto center on first match if user typed 3+ characters
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

  // Handle CAD Element Mouse Interactions
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

            {/* Powdercoat Spray Filter Pattern */}
            <pattern id="powderPattern" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#3da35d" />
              <circle cx="8" cy="8" r="1.5" fill="#2d7e48" />
            </pattern>

            {/* Assembly Diagonal Texture */}
            <pattern id="assemblyPattern" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="#845389" />
              <line x1="0" y1="0" x2="0" y2="12" stroke="#6e3e73" strokeWidth="2" />
            </pattern>

            {/* Storage Rack Diagonal Slats */}
            <pattern id="rackPattern" width="10" height="20" patternUnits="userSpaceOnUse">
              <rect width="10" height="20" fill="#606870" />
              <line x1="0" y1="0" x2="10" y2="0" stroke="#373d44" strokeWidth="1.5" />
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
                M 80,140
                L 420,140
                L 420,50
                L 520,50
                L 520,140
                L 730,140
                M 790,140 L 980,140
                M 1040,140 L 1160,140
                M 1260,140 L 1760,140
                M 1830,140 L 1960,140
                L 1960,940
                L 80,940
                Z
              "
            />

            {/* Left Exterior Centerline / Crosshair Symbol */}
            <g transform="translate(45, 420)">
              <line x1="0" y1="0" x2="60" y2="0" stroke="#64748b" strokeWidth="1.5" strokeDasharray="12 4 3 4" />
              <line x1="30" y1="-30" x2="30" y2="30" stroke="#64748b" strokeWidth="1.5" strokeDasharray="12 4 3 4" />
              <text x="38" y="-12" fontSize="12" fill="#64748b" fontWeight="700">CL</text>
            </g>

            {/* North Exterior Entrance (Blue Dot Marker) */}
            <g
              id="elem_north_marker"
              className="cad-element"
              data-name="North Warehouse Gate Entrance"
              data-category="office"
              data-specs="Main North Freight & Personnel Ingress. Overhead high-speed rollup door."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <line x1="420" y1="140" x2="520" y2="140" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" />
              <line x1="420" y1="90" x2="520" y2="90" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
              <rect x="420" y="50" width="100" height="90" fill="rgba(56, 189, 248, 0.05)" />
              <circle cx="455" cy="95" r="22" className="pulsing-marker" />
              <circle cx="455" cy="95" r="16" fill="#38bdf8" filter="url(#blueGlow)" stroke="#ffffff" strokeWidth="3" />
            </g>

            {/* Tool Crib & Storage Conex */}
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
              <rect x="1020" y="160" width="125" height="105" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <line x1="1080" y1="160" x2="1080" y2="265" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />
              <text className="label-text label-dark" x="1050" y="200" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>STORAGE</text>
              <text className="label-text label-dark" x="1050" y="215" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>CONEX BOX</text>
              <text className="label-text label-dark" x="1105" y="200" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>TOOL</text>
              <text className="label-text label-dark" x="1105" y="215" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>CRIB</text>
            </g>

            {/* Stairs & North Bath */}
            <g
              id="elem_north_mens_bath"
              className="cad-element"
              data-name="Men's Bath & Mezzanine Stairs"
              data-category="office"
              data-specs="North shop restroom with 2nd floor mezzanine stairwell access."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1155" y="145" width="90" height="65" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <rect x="1155" y="145" width="30" height="65" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
              <line x1="1155" y1="155" x2="1185" y2="155" stroke="#64748b" strokeWidth="1" />
              <line x1="1155" y1="165" x2="1185" y2="165" stroke="#64748b" strokeWidth="1" />
              <line x1="1155" y1="175" x2="1185" y2="175" stroke="#64748b" strokeWidth="1" />
              <line x1="1155" y1="185" x2="1185" y2="185" stroke="#64748b" strokeWidth="1" />
              <line x1="1155" y1="195" x2="1185" y2="195" stroke="#64748b" strokeWidth="1" />
              <text className="label-text label-dark" x="1170" y="175" fontSize="7" transform="rotate(-90 1170 175)" style={{ display: showLabels ? undefined : 'none' }}>STAIRS</text>
              <text className="label-text label-dark" x="1215" y="170" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>MEN'S</text>
              <text className="label-text label-dark" x="1215" y="184" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
            </g>

            {/* Programming Dept (North) */}
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
              <rect x="1155" y="210" width="110" height="70" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1210" y="240" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>PROGRAMMING</text>
              <text className="label-text label-dark" x="1210" y="254" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
            </g>

            {/* QA & Machine Office */}
            <g
              id="elem_qa_office"
              className="cad-element"
              data-name="Q.A. & Machine Office"
              data-category="office"
              data-specs="Quality Assurance Management, CMM Reports, First-Article approvals."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1300" y="145" width="120" height="60" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1360" y="170" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>Q.A. &amp; MACH.</text>
              <text className="label-text label-dark" x="1360" y="184" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* QC Inspection Area */}
            <g
              id="elem_qc_inspection"
              className="cad-element"
              data-name="Q.C. Inspection Area"
              data-category="office"
              data-specs="Granite surface plates, Vernier height gages, optical comparators, calibration lab."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1300" y="205" width="120" height="75" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1360" y="235" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>Q.C. INSPECTION</text>
              <text className="label-text label-dark" x="1360" y="250" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Lunch / Break Area */}
            <g
              id="elem_break_room"
              className="cad-element"
              data-name="Lunch & Break Area"
              data-category="office"
              data-specs="Employee cafeteria, refrigerators, microwave bays, break seating."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1420" y="145" width="80" height="135" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1460" y="205" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>LUNCH /</text>
              <text className="label-text label-dark" x="1460" y="220" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>BREAK</text>
              <text className="label-text label-dark" x="1460" y="235" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Men's Restroom */}
            <g
              id="elem_mens_restroom"
              className="cad-element"
              data-name="Men's Restroom"
              data-category="office"
              data-specs="Shop facility restroom, 2 stalls, 2 urinals, wash stations."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1530" y="145" width="60" height="100" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1560" y="185" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>MEN'S</text>
              <text className="label-text label-dark" x="1560" y="200" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
            </g>

            {/* Women's Restroom */}
            <g
              id="elem_womens_restroom"
              className="cad-element"
              data-name="Women's Restroom"
              data-category="office"
              data-specs="Shop facility restroom, private stalls, wash basins."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1595" y="145" width="60" height="100" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1625" y="185" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>WOMEN'S</text>
              <text className="label-text label-dark" x="1625" y="200" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
            </g>

            {/* North Programming Annex */}
            <g
              id="elem_prog_annex"
              className="cad-element"
              data-name="Programming Department Annex"
              data-category="office"
              data-specs="Secondary CAM workstations and shop floor terminal interface."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1680" y="145" width="100" height="100" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
              <text className="label-text label-dark" x="1730" y="195" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>PROGRAMMING</text>
            </g>

            {/* East Administrative Block (Right Column) */}
            <rect x="1785" y="140" width="175" height="515" fill="#f8fafc" stroke="#1e293b" strokeWidth="3" />

            {/* Guest Waiting & Conference Room */}
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
              <rect x="1785" y="145" width="85" height="45" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1827" y="162" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>GUEST WAITING</text>
              <text className="label-text label-dark" x="1827" y="174" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            <g
              id="elem_front_desk"
              className="cad-element"
              data-name="Front Desk & Reception"
              data-category="office"
              data-specs="Visitor check-in, security badge management, switchboard."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1785" y="190" width="85" height="45" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1827" y="207" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>FRONT</text>
              <text className="label-text label-dark" x="1827" y="220" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>DESK</text>
            </g>

            <g
              id="elem_conference"
              className="cad-element"
              data-name="Executive Conference Room"
              data-category="office"
              data-specs="12-person boardroom table, video conferencing, client reviews."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="145" width="90" height="90" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1915" y="185" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>CONFERENCE</text>
              <text className="label-text label-dark" x="1915" y="198" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>ROOM</text>
            </g>

            {/* Accounting & HR */}
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
              <rect x="1785" y="235" width="85" height="48" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1827" y="260" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>ACCOUNTING</text>
            </g>

            <g
              id="elem_hr"
              className="cad-element"
              data-name="HR Office"
              data-category="office"
              data-specs="Human Resources, onboarding, payroll & benefits administration."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="235" width="90" height="48" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1915" y="254" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>HR</text>
              <text className="label-text label-dark" x="1915" y="266" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* Sales & Purchasing */}
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
              <rect x="1785" y="283" width="85" height="52" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1827" y="303" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>HARCON</text>
              <text className="label-text label-dark" x="1827" y="315" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>SALES</text>
              <text className="label-text label-dark" x="1827" y="327" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

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
              <rect x="1870" y="283" width="90" height="52" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1915" y="303" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>PURCHASING</text>
              <text className="label-text label-dark" x="1915" y="316" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            {/* JA Office & Coordinator / Control Room */}
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
              <rect x="1785" y="335" width="85" height="65" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1827" y="362" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>J.A.</text>
              <text className="label-text label-dark" x="1827" y="375" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>

            <g
              id="elem_control_room"
              className="cad-element"
              data-name="Control Room / Coordinator Office"
              data-category="office"
              data-specs="Shop Floor Dispatch, Conquer Software terminal, ERP tracking."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1870" y="335" width="90" height="65" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <rect x="1875" y="340" width="80" height="40" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1" rx="2" />
              <text className="label-text label-white" x="1915" y="356" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>CONTROL</text>
              <text className="label-text label-white" x="1915" y="368" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>ROOM</text>
            </g>

            {/* Middle Admin Restrooms & Planning */}
            <g
              id="elem_east_restrooms"
              className="cad-element"
              data-name="Admin Restrooms Suite"
              data-category="office"
              data-specs="Office facility executive restrooms."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1785" y="405" width="55" height="150" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1812" y="475" fontSize="8" transform="rotate(-90 1812 475)" style={{ display: showLabels ? undefined : 'none' }}>MEN'S BATH</text>
              <rect x="1840" y="405" width="60" height="75" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
              <text className="label-text label-dark" x="1870" y="438" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>WOMEN'S</text>
              <text className="label-text label-dark" x="1870" y="450" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
              <rect x="1900" y="405" width="60" height="75" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
              <text className="label-text label-dark" x="1930" y="438" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>EXEC</text>
              <text className="label-text label-dark" x="1930" y="450" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>BATH</text>
            </g>

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
              <rect x="1840" y="480" width="120" height="75" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1900" y="512" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>PLANNING &amp; QUOTING</text>
              <text className="label-text label-dark" x="1900" y="525" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
            </g>

            {/* Engineering Department & Head Engineer */}
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
              <rect x="1785" y="565" width="115" height="90" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1842" y="605" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>ENGINEERING</text>
              <text className="label-text label-dark" x="1842" y="620" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
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
              <rect x="1900" y="565" width="60" height="90" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1930" y="602" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>HEAD</text>
              <text className="label-text label-dark" x="1930" y="615" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>ENGINEER</text>
              <text className="label-text label-dark" x="1930" y="628" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>OFFICE</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 2: STORAGE RACKS & AISLE CORRIDORS
               ==================================================================== */}
          <g id="layerRacks">
            <g
              id="elem_rack_8"
              className="cad-element"
              data-name="Storage Rack #8"
              data-category="storage"
              data-specs="Heavy-duty 4-tier cantilever rack for raw bar and channel stock."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="560" y="145" width="160" height="26" fill="#4b5563" stroke="#1f2937" strokeWidth="1.5" />
              <text className="label-text label-white" x="640" y="158" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #8</text>
            </g>

            <g
              id="elem_rack_7_top"
              className="cad-element"
              data-name="Storage Rack #7 (Aisle)"
              data-category="storage"
              data-specs="Pallet racking for sheet stock cutoffs and hardware kits."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="560" y="210" width="130" height="26" fill="#4b5563" stroke="#1f2937" strokeWidth="1.5" />
              <text className="label-text label-white" x="625" y="223" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #7</text>
            </g>

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
              <rect x="690" y="330" width="80" height="270" fill="url(#rackPattern)" stroke="#373d44" strokeWidth="2" />
              <rect x="710" y="420" width="40" height="90" fill="rgba(31, 41, 55, 0.9)" rx="4" />
              <text className="label-text label-white" x="730" y="465" fontSize="11" transform="rotate(-90 730 465)" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK #4</text>
            </g>

            <g
              id="elem_rack_5"
              className="cad-element"
              data-name="Storage Rack #5 (Vertical)"
              data-category="storage"
              data-specs="Hardware, fastener bins and pre-assembly kit storage."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="690" y="635" width="85" height="130" fill="url(#rackPattern)" stroke="#373d44" strokeWidth="2" />
              <rect x="712" y="675" width="40" height="60" fill="rgba(31, 41, 55, 0.9)" rx="4" />
              <text className="label-text label-white" x="732" y="705" fontSize="10" transform="rotate(-90 732 705)" style={{ display: showLabels ? undefined : 'none' }}>STORAGE RACK</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 3: WEST FLOOR (Hardware, Powdercoat, Assembly, Honeycomb)
               ==================================================================== */}
          <g id="layerWestFloor">
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
              <rect x="95" y="145" width="175" height="125" fill="#4d5c48" stroke="#283325" strokeWidth="2.5" />
              <rect x="175" y="225" width="95" height="45" fill="#3a4736" stroke="#283325" strokeWidth="1.5" />
              <rect x="195" y="270" width="40" height="55" fill="none" stroke="#283325" strokeWidth="2" />
              <text className="label-text label-white" x="180" y="200" fontSize="13" style={{ display: showLabels ? undefined : 'none' }}>HARDWARE</text>
              <text className="label-text label-white" x="180" y="218" fontSize="13" style={{ display: showLabels ? undefined : 'none' }}>DEPT.</text>
            </g>

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
              <rect x="95" y="330" width="300" height="500" fill="url(#powderPattern)" stroke="#225432" strokeWidth="3" />
              <rect x="250" y="570" width="130" height="230" fill="none" stroke="#163e23" strokeWidth="2" />
              <line x1="250" y1="645" x2="380" y2="645" stroke="#163e23" strokeWidth="1.5" strokeDasharray="6 3" />
              <line x1="250" y1="720" x2="380" y2="720" stroke="#163e23" strokeWidth="1.5" strokeDasharray="6 3" />
              <line x1="315" y1="570" x2="315" y2="800" stroke="#163e23" strokeWidth="1.5" />
              <line x1="250" y1="610" x2="270" y2="610" stroke="#163e23" strokeWidth="3" />
              <line x1="250" y1="685" x2="270" y2="685" stroke="#163e23" strokeWidth="3" />
              <text className="label-text label-white" x="245" y="575" fontSize="15" style={{ display: showLabels ? undefined : 'none' }}>POWDERCOAT</text>
              <text className="label-text label-white" x="245" y="598" fontSize="15" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

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
              <rect x="440" y="330" width="115" height="155" fill="url(#assemblyPattern)" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="497" y="398" fontSize="11" style={{ display: showLabels ? undefined : 'none' }}>ASSEMBLY</text>
              <text className="label-text label-white" x="497" y="414" fontSize="11" style={{ display: showLabels ? undefined : 'none' }}>STAGING AREA</text>
            </g>

            <g
              id="elem_assembly_table"
              className="cad-element"
              data-name="Assembly Routing Table"
              data-category="staging"
              data-specs="Production tracking schedule for line drills & presses."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="400" y="495" width="165" height="55" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="400" y1="507" x2="565" y2="507" stroke="#1e293b" strokeWidth="1" />
              <line x1="480" y1="495" x2="480" y2="550" stroke="#1e293b" strokeWidth="1" />
              <line x1="520" y1="495" x2="520" y2="550" stroke="#1e293b" strokeWidth="1" />
              <text className="label-text label-dark" x="500" y="502" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>DIE/GA</text>
              <text className="label-text label-dark" x="542" y="502" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>DRILL</text>
              <text className="label-text label-dark" x="440" y="515" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>LANFONIVE #1</text>
              <text className="label-text label-dark" x="440" y="525" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>CLNANFNVR #2</text>
              <text className="label-text label-dark" x="440" y="535" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>LAHTNFNVR #3</text>
              <text className="label-text label-dark" x="440" y="545" fontSize="6.5" style={{ display: showLabels ? undefined : 'none' }}>IMFNANV #2</text>
            </g>

            {/* Vertical Column of Lathes */}
            {[
              { id: 'elem_lathe_col_6', name: 'Lathe Mach. #6 (Assembly)', num: '#6', y: 345 },
              { id: 'elem_lathe_col_5', name: 'Lathe Mach. #5 (Assembly)', num: '#5', y: 395 },
              { id: 'elem_lathe_col_4', name: 'Lathe Mach. #4 (Assembly)', num: '#4', y: 445 },
              { id: 'elem_lathe_col_3', name: 'Lathe Mach. #3 (Assembly)', num: '#3', y: 495 },
              { id: 'elem_lathe_col_2', name: 'Lathe Mach. #2 (Assembly)', num: '#2', y: 545 },
              { id: 'elem_lathe_col_1', name: 'Lathe Mach. #1 (Assembly)', num: '#1', y: 595 },
            ].map((lathe) => (
              <g
                key={lathe.id}
                id={lathe.id}
                className="cad-element"
                data-name={lathe.name}
                data-category="upholstery"
                data-specs="Precision turning lathe for assembly fittings."
                onMouseEnter={handleElementMouseEnter}
                onMouseMove={handleElementMouseMove}
                onMouseLeave={handleElementMouseLeave}
                onClick={handleElementClick}
              >
                <rect x="615" y={lathe.y} width="30" height="40" fill="#e47c29" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
                <text className="label-text label-white" x="630" y={lathe.y + 15} fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
                <text className="label-text label-white" x="630" y={lathe.y + 25} fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>MACH.</text>
                <text className="label-text label-white" x="630" y={lathe.y + 35} fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>{lathe.num}</text>
              </g>
            ))}

            {/* Honeycomb Press Machine */}
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
              <rect x="410" y="635" width="115" height="60" fill="#d13636" stroke="#871c1c" strokeWidth="2" rx="3" />
              <text className="label-text label-white" x="467" y="660" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>HONEYCOMB PRESS</text>
              <text className="label-text label-white" x="467" y="675" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>MACH.</text>
            </g>

            {/* Lower Lathe / Milling Blocks */}
            <g
              id="elem_lathe_dnya_1"
              className="cad-element"
              data-name="Lathe / Dnya Mill #1"
              data-category="upholstery"
              data-specs="Secondary tooling and trimming lathe."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="595" y="635" width="65" height="25" fill="#e47c29" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="627" y="648" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>LATHE/DNYA 11</text>
            </g>
            <g
              id="elem_lathe_dnya_2"
              className="cad-element"
              data-name="Lathe / Dnya Mill #2"
              data-category="upholstery"
              data-specs="Precision face mill."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="570" y="665" width="75" height="25" fill="#e47c29" stroke="#9a4d13" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="607" y="678" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>LANETOHYM/MILL 11</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 4: UPHOLSTERY & CENTER MACHINE SHOP
               ==================================================================== */}
          <g id="layerCenterFloor">
            {/* Upholstery Area */}
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
              <rect x="830" y="330" width="75" height="320" fill="#df7325" stroke="#944810" strokeWidth="2.5" />
              <text className="label-text label-white" x="867" y="490" fontSize="14" transform="rotate(-90 867 490)" style={{ display: showLabels ? undefined : 'none' }}>UPHOLSTERY AREA</text>
            </g>

            {/* MACHINE SHOP AREA (Teal Enclosure) */}
            <g
              id="elem_machine_shop_enclosure"
              className="cad-element"
              data-name="Machine Shop Area"
              data-category="machineshop"
              data-specs="Climate-controlled precision CNC machining department with mist filtration."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="920" y="325" width="235" height="405" fill="#228b84" stroke="#105752" strokeWidth="3" />
              <rect x="918" y="480" width="4" height="40" fill="#e9edf0" />
              <rect x="1153" y="480" width="4" height="40" fill="#e9edf0" />
              <rect x="1010" y="323" width="50" height="4" fill="#e9edf0" />
              <rect x="1010" y="728" width="50" height="4" fill="#e9edf0" />
              <text className="label-text label-white" x="1037" y="525" fontSize="15" transform="rotate(-90 1037 525)" style={{ display: showLabels ? undefined : 'none' }}>MACHINE SHOP AREA</text>
            </g>

            {/* Lathes inside Machine Shop */}
            {[
              { id: 'elem_lathe_mach_4', name: 'CNC Lathe Mach. #4', num: '#4', y: 335 },
              { id: 'elem_lathe_mach_3', name: 'CNC Lathe Mach. #3', num: '#3', y: 390 },
              { id: 'elem_lathe_mach_2', name: 'CNC Lathe Mach. #2', num: '#2', y: 445 },
              { id: 'elem_lathe_mach_1', name: 'CNC Lathe Mach. #1', num: '#1', y: 500 },
            ].map((lathe) => (
              <g
                key={lathe.id}
                id={lathe.id}
                className="cad-element"
                data-name={lathe.name}
                data-category="machineshop"
                data-specs="CNC Turning Center with live tooling and bar feeder."
                onMouseEnter={handleElementMouseEnter}
                onMouseMove={handleElementMouseMove}
                onMouseLeave={handleElementMouseLeave}
                onClick={handleElementClick}
              >
                <rect x="935" y={lathe.y} width="65" height="45" fill="#d13636" stroke="#871c1c" strokeWidth="1.5" rx="2" />
                <text className="label-text label-white" x="967" y={lathe.y + 17} fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>LATHE</text>
                <text className="label-text label-white" x="967" y={lathe.y + 29} fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>MACH. {lathe.num}</text>
              </g>
            ))}

            {/* Haas Mach #3 */}
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
              <rect x="935" y="555" width="65" height="95" fill="#d13636" stroke="#871c1c" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="967" y="595" fontSize="9" transform="rotate(-90 967 595)" style={{ display: showLabels ? undefined : 'none' }}>HAAS MACH. #3</text>
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
              <rect x="1090" y="335" width="55" height="85" fill="#d13636" stroke="#871c1c" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="377" fontSize="9" transform="rotate(-90 1117 377)" style={{ display: showLabels ? undefined : 'none' }}>HAAS MACH. #1</text>
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
              <rect x="1090" y="440" width="55" height="90" fill="#d13636" stroke="#871c1c" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="485" fontSize="9" transform="rotate(-90 1117 485)" style={{ display: showLabels ? undefined : 'none' }}>HAAS MACH. #2</text>
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
              <rect x="1090" y="635" width="55" height="40" fill="#d13636" stroke="#871c1c" strokeWidth="1.5" rx="2" />
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
              <rect x="1090" y="690" width="55" height="40" fill="#d13636" stroke="#871c1c" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1117" y="705" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>HAAS</text>
              <text className="label-text label-white" x="1117" y="717" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH. #5</text>
            </g>

            {/* South of Machine Shop (Robots, Drill & Staging) */}
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
              <text className="label-text label-white" x="872" y="768" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>#1-2</text>
            </g>

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
              <rect x="840" y="805" width="150" height="30" fill="#845389" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="915" y="820" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>WELD STAGING AREA #2</text>
            </g>

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
              <rect x="1065" y="755" width="90" height="40" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <text className="label-text label-dark" x="1110" y="770" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>MANUAL</text>
              <text className="label-text label-dark" x="1110" y="782" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>DRILL AREA</text>
            </g>

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
              <rect x="1070" y="805" width="100" height="30" fill="#845389" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1120" y="816" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>WELD STAGING</text>
              <text className="label-text label-white" x="1120" y="826" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>AREA #1</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 5: SHEET METAL, AMADA TURRETS, SPOT WELD & PRESS BRAKES
               ==================================================================== */}
          <g id="layerFabrication">
            {/* Upper Turret Punch Cell */}
            <g
              id="elem_amada_eml_top"
              className="cad-element"
              data-name="Amada EML Punch/Laser Mach. (Top)"
              data-category="cnc"
              data-specs="Amada EML 3510 NT Punch/Laser combination with 30-ton servo drive."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1235" y="345" width="150" height="88" fill="#d13636" stroke="#871c1c" strokeWidth="2" rx="3" />
              <text className="label-text label-white" x="1310" y="380" fontSize="11" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1310" y="396" fontSize="11" style={{ display: showLabels ? undefined : 'none' }}>EML MACH.</text>
            </g>

            <g
              id="elem_amada_loader_top"
              className="cad-element"
              data-name="Amada Sheet Loader (Top)"
              data-category="cnc"
              data-specs="Automated vacuum cup sheet loader and unloader tower."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1390" y="345" width="60" height="88" fill="#25966c" stroke="#13593f" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1420" y="380" fontSize="9" transform="rotate(-90 1420 380)" style={{ display: showLabels ? undefined : 'none' }}>AMADA LOADER</text>
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
              <rect x="1460" y="345" width="75" height="88" fill="#845389" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="1497" y="382" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>GENERAL</text>
              <text className="label-text label-white" x="1497" y="396" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>STAGING</text>
              <text className="label-text label-white" x="1497" y="410" fontSize="9" style={{ display: showLabels ? undefined : 'none' }}>AREA</text>
            </g>

            {/* Lower Turret Punch Cell */}
            <g
              id="elem_amada_eml_bottom"
              className="cad-element"
              data-name="Amada EML Punch Mach. (Lower)"
              data-category="cnc"
              data-specs="Amada CNC turret press with high-speed sheet tracking."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1245" y="505" width="135" height="65" fill="#d13636" stroke="#871c1c" strokeWidth="2" rx="3" />
              <text className="label-text label-white" x="1312" y="532" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1312" y="546" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>EML MACH.</text>
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
              <rect x="1385" y="505" width="55" height="88" fill="#25966c" stroke="#13593f" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1412" y="549" fontSize="8" transform="rotate(-90 1412 549)" style={{ display: showLabels ? undefined : 'none' }}>AMADA LOADER</text>
            </g>

            {/* Spot Welding 2x2 Cluster */}
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
              <rect x="1375" y="645" width="40" height="40" fill="#f59e0b" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1395" y="660" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1395" y="670" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH #3</text>
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
              <rect x="1420" y="645" width="40" height="40" fill="#f59e0b" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1440" y="660" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1440" y="670" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH #4</text>
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
              <rect x="1375" y="695" width="40" height="40" fill="#f59e0b" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1395" y="710" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1395" y="720" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH #1</text>
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
              <rect x="1420" y="695" width="40" height="40" fill="#f59e0b" stroke="#a16207" strokeWidth="1.5" rx="2" />
              <text className="label-text label-yellow" x="1440" y="710" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>SW</text>
              <text className="label-text label-yellow" x="1440" y="720" fontSize="7" style={{ display: showLabels ? undefined : 'none' }}>MACH #2</text>
            </g>

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
              <rect x="1470" y="590" width="60" height="160" fill="#845389" stroke="#4a284e" strokeWidth="2" />
              <text className="label-text label-white" x="1500" y="670" fontSize="10" transform="rotate(-90 1500 670)" style={{ display: showLabels ? undefined : 'none' }}>SPOT WELD STAGING AREA</text>
            </g>

            {/* Press Brake Staging Strip #2 */}
            <g
              id="elem_press_staging_2"
              className="cad-element"
              data-name="Press Brake Staging Area #1-2 (West)"
              data-category="staging"
              data-specs="Forming queue lane for sheet metal parts."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1570" y="345" width="20" height="430" fill="#845389" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1580" y="560" fontSize="8" transform="rotate(-90 1580 560)" style={{ display: showLabels ? undefined : 'none' }}>PRESS BRAKE STAGING AREA #1-2</text>
            </g>

            {/* Amada Press Brakes */}
            <g
              id="elem_amada_hds_2204"
              className="cad-element"
              data-name="Amada HDS 2204 NT Press Brake"
              data-category="cnc"
              data-specs="240-ton 8-axis CNC hydraulic/servo press brake with crowning."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1600" y="350" width="42" height="65" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1621" y="375" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1621" y="385" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>HDS 2204 NT</text>
            </g>

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
              <rect x="1648" y="350" width="44" height="65" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1670" y="375" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA HG</text>
              <text className="label-text label-white" x="1670" y="385" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>1003 ATC #1</text>
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
              <rect x="1600" y="425" width="42" height="55" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1621" y="445" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1621" y="455" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>HDS 8025</text>
            </g>

            <g
              id="elem_amada_rg_100_1"
              className="cad-element"
              data-name="Amada RG 100 Press Brake"
              data-category="cnc"
              data-specs="100-ton mechanical-hydraulic up-acting press brake."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1600" y="495" width="42" height="35" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1621" y="508" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1621" y="518" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>RG 100</text>
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
              <rect x="1648" y="495" width="44" height="65" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1670" y="520" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA HG</text>
              <text className="label-text label-white" x="1670" y="530" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>1003 ATC #2</text>
            </g>

            <g
              id="elem_amada_rg_100_2"
              className="cad-element"
              data-name="Amada RG 100 Press Brake (Lower)"
              data-category="cnc"
              data-specs="Up-acting bending machine for repetitive flange brackets."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1600" y="540" width="42" height="35" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1621" y="553" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1621" y="563" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>RG 100</text>
            </g>

            <g
              id="elem_amada_rg_50"
              className="cad-element"
              data-name="Amada RG 50 Press Brake"
              data-category="cnc"
              data-specs="50-ton compact press brake for fine brackets and tabs."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1600" y="625" width="42" height="50" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1621" y="645" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA</text>
              <text className="label-text label-white" x="1621" y="655" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>RG 50</text>
            </g>

            <g
              id="elem_amada_hds_8025_2"
              className="cad-element"
              data-name="Amada HDS 8025NT Press Brake"
              data-category="cnc"
              data-specs="88-ton forming press."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1648" y="605" width="44" height="60" fill="#209559" stroke="#105730" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="1670" y="630" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>AMADA HDS</text>
              <text className="label-text label-white" x="1670" y="640" fontSize="6" style={{ display: showLabels ? undefined : 'none' }}>8025NT</text>
            </g>

            {/* Press Brake Staging Strip #1 (East) */}
            <g
              id="elem_press_staging_1"
              className="cad-element"
              data-name="Press Brake Staging Area #1-2 (East)"
              data-category="staging"
              data-specs="Finished bent components awaiting weld and hardware."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1698" y="345" width="20" height="430" fill="#845389" stroke="#4a284e" strokeWidth="1.5" />
              <text className="label-text label-white" x="1708" y="560" fontSize="8" transform="rotate(-90 1708 560)" style={{ display: showLabels ? undefined : 'none' }}>PRESS BRAKE STAGING AREA #1-2</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER 6: SOUTH WALL (Sandblast, Grind, Weld Booths, OMAX, Laser, Saw)
               ==================================================================== */}
          <g id="layerSouthFloor">
            {/* Sandblast Machine */}
            <g
              id="elem_sandblast"
              className="cad-element"
              data-name="Sandblast Machine"
              data-category="welding"
              data-specs="Enclosed abrasive grit blasting cabinet for surface preparation and weld scale removal."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="410" y="890" width="115" height="50" fill="#cf9f74" stroke="#78502d" strokeWidth="2" rx="2" />
              <text className="label-text label-dark" x="467" y="910" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>SANDBLAST</text>
              <text className="label-text label-dark" x="467" y="922" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>MACH.</text>
            </g>

            {/* Grind Area */}
            <g
              id="elem_grind_area"
              className="cad-element"
              data-name="Grind Area"
              data-category="welding"
              data-specs="Heavy deburring, edge conditioning, blending, angle grinding benches with downdraft tables."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="850" width="175" height="90" fill="#e8cfa9" stroke="#99703f" strokeWidth="2.5" />
              <text className="label-text label-dark" x="692" y="895" fontSize="12" style={{ display: showLabels ? undefined : 'none' }}>GRIND AREA</text>
            </g>

            {/* Weld Robot #1 */}
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
              <rect x="785" y="880" width="80" height="60" fill="#52b86e" stroke="#256e39" strokeWidth="1.5" rx="2" />
              <text className="label-text label-white" x="825" y="905" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>WELD ROBOT</text>
              <text className="label-text label-white" x="825" y="918" fontSize="8" style={{ display: showLabels ? undefined : 'none' }}>#1</text>
            </g>

            {/* 8 Weld Area Booths */}
            {[
              { id: 'elem_weld_1', num: 1, x: 875 },
              { id: 'elem_weld_2', num: 2, x: 918 },
              { id: 'elem_weld_3', num: 3, x: 961 },
              { id: 'elem_weld_4', num: 4, x: 1004 },
              { id: 'elem_weld_5', num: 5, x: 1047 },
              { id: 'elem_weld_6', num: 6, x: 1090 },
              { id: 'elem_weld_7', num: 7, x: 1133 },
              { id: 'elem_weld_8', num: 8, x: 1176 },
            ].map((weld) => (
              <g
                key={weld.id}
                id={weld.id}
                className="cad-element"
                data-name={`Weld Area #${weld.num}`}
                data-category="welding"
                data-specs="MIG/TIG welding station with local fume extraction arm and power source."
                onMouseEnter={handleElementMouseEnter}
                onMouseMove={handleElementMouseMove}
                onMouseLeave={handleElementMouseLeave}
                onClick={handleElementClick}
              >
                <rect x={weld.x} y="875" width="40" height="65" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
                <circle cx={weld.x + 20} cy="890" r="5" fill="#f59e0b" opacity="0.8" />
                <text
                  className="label-text label-dark"
                  x={weld.x + 20}
                  y="915"
                  fontSize="6.5"
                  transform={`rotate(-90 ${weld.x + 20} 915)`}
                  style={{ display: showLabels ? undefined : 'none' }}
                >
                  {`WELD AREA #${weld.num}`}
                </text>
              </g>
            ))}

            {/* OMAX Waterjets */}
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
              <rect x="1285" y="865" width="145" height="65" fill="#0e65a6" stroke="#083e66" strokeWidth="2" rx="3" />
              <text className="label-text label-white" x="1357" y="893" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>OMAX</text>
              <text className="label-text label-white" x="1357" y="907" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>MACH. #2</text>
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
              <rect x="1465" y="865" width="145" height="65" fill="#0e65a6" stroke="#083e66" strokeWidth="2" rx="3" />
              <text className="label-text label-white" x="1537" y="893" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>OMAX</text>
              <text className="label-text label-white" x="1537" y="907" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>MACH. #1</text>
            </g>

            {/* Laser Amada & Loader */}
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
              <rect x="1650" y="825" width="75" height="110" fill="#25966c" stroke="#13593f" strokeWidth="2" rx="2" />
              <text className="label-text label-white" x="1687" y="880" fontSize="10" transform="rotate(-90 1687 880)" style={{ display: showLabels ? undefined : 'none' }}>AMADA LOADER</text>
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
              <rect x="1735" y="825" width="155" height="110" fill="#9a2b37" stroke="#661922" strokeWidth="2.5" rx="3" />
              <text className="label-text label-white" x="1812" y="880" fontSize="13" style={{ display: showLabels ? undefined : 'none' }}>LASER AMADA</text>
            </g>

            {/* Manual Saw Machine Area & Amada 250 Saw */}
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
              <text className="label-text label-dark" x="1875" y="675" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>MANUAL SAW</text>
              <text className="label-text label-dark" x="1875" y="688" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>MACHINE AREA</text>
            </g>

            <g
              id="elem_amada_250_saw"
              className="cad-element"
              data-name="Amada 250 Saw Machine"
              data-category="cutting"
              data-specs="Amada HK-700 / 250 CNC horizontal bandsaw with automatic bundle clamping."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="1780" y="725" width="180" height="45" fill="#f59e0b" stroke="#a16207" strokeWidth="2" rx="2" />
              <text className="label-text label-yellow" x="1870" y="742" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>AMADA 250</text>
              <text className="label-text label-yellow" x="1870" y="756" fontSize="10" style={{ display: showLabels ? undefined : 'none' }}>SAW MACHINE</text>
            </g>
          </g>

          {/* ====================================================================
               LAYER STATUS DOTS OVERLAY (Toggled by showStatusIndicators)
               ==================================================================== */}
          <g id="layerStatusDots" style={{ display: showStatusIndicators ? 'block' : 'none' }}>
            <circle cx="1250" cy="360" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1260" cy="520" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="950" cy="350" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="950" cy="405" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="950" cy="460" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="950" cy="515" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="950" cy="570" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1105" cy="350" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1105" cy="455" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1300" cy="880" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1480" cy="880" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1750" cy="840" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1615" cy="365" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1660" cy="365" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      {/* ==========================================================================
           BOTTOM-LEFT HUD: COMPASS & COORDINATES
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
           BOTTOM-RIGHT HUD: ZOOM CONTROLS
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
