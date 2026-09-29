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
          {/* Base Layer: Floor Plan Background Image */}
          <image
            href="/floor-plan-bg.png"
            x="0"
            y="0"
            width="2000"
            height="1000"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Invisible Interactive Zones */}
          <g id="interactive-overlays">
            {/* North-West Entrance */}
            {/* <g
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
              <rect x="400" y="50" width="110" height="90" fill="transparent" />
            </g> */}

            {/* North-East Entrance */}
            {/* <g
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
              <rect x="1860" y="35" width="100" height="105" fill="transparent" />
            </g> */}

            {/* Top North Offices Suite */}
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
              <rect x="1030" y="150" width="135" height="115" fill="transparent" />
            </g>

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
              <rect x="1165" y="135" width="115" height="135" fill="transparent" />
            </g>

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
              <rect x="1305" y="135" width="130" height="135" fill="transparent" />
            </g>

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
              <rect x="1435" y="135" width="75" height="135" fill="transparent" />
            </g>

            {/* East Administrative Block */}
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
              <rect x="1780" y="145" width="90" height="42" fill="transparent" />
            </g>

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
              <rect x="1780" y="187" width="90" height="42" fill="transparent" />
            </g>

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
              <rect x="1780" y="229" width="90" height="45" fill="transparent" />
            </g>

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
              <rect x="1780" y="274" width="90" height="52" fill="transparent" />
            </g>

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
              <rect x="1780" y="326" width="90" height="55" fill="transparent" />
            </g>

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
              <rect x="1870" y="145" width="90" height="84" fill="transparent" />
            </g>

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
              <rect x="1870" y="229" width="90" height="45" fill="transparent" />
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
              <rect x="1870" y="274" width="90" height="52" fill="transparent" />
            </g>

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
              <rect x="1870" y="326" width="90" height="55" fill="transparent" />
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
              <rect x="1780" y="415" width="90" height="145" fill="transparent" />
            </g>

            {/* <g
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
              <rect x="1870" y="415" width="90" height="145" fill="transparent" />
            </g> */}

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
              <rect x="1780" y="565" width="120" height="85" fill="transparent" />
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
              <rect x="1900" y="565" width="60" height="85" fill="transparent" />
            </g>

            {/* West Floor (Hardware, Powdercoat, Assembly, Honeycomb) */}
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
              <rect x="75" y="145" width="175" height="125" fill="transparent" />
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
              <rect x="75" y="350" width="305" height="530" fill="transparent" />
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
              <rect x="425" y="347" width="115" height="158" fill="transparent" />
            </g>

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
              <rect x="395" y="662" width="112" height="64" fill="transparent" />
            </g>

            {/* Lathe / Assembly Tables */}
            <g
              id="elem_table_1"
              className="cad-element"
              data-name="Lathe Table #1"
              data-category="upholstery"
              data-specs="Precision assembly and fitting workbench."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="357" width="28" height="42" fill="transparent" />
            </g>

            <g
              id="elem_table_2"
              className="cad-element"
              data-name="Lathe Table #2"
              data-category="upholstery"
              data-specs="Precision assembly and fitting workbench."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="410" width="28" height="42" fill="transparent" />
            </g>

            <g
              id="elem_table_3"
              className="cad-element"
              data-name="Lathe Table #3"
              data-category="upholstery"
              data-specs="Precision assembly and fitting workbench."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="465" width="28" height="42" fill="transparent" />
            </g>

            <g
              id="elem_table_4"
              className="cad-element"
              data-name="Lathe Table #4"
              data-category="upholstery"
              data-specs="Precision assembly and fitting workbench."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="520" width="28" height="42" fill="transparent" />
            </g>

            <g
              id="elem_table_5"
              className="cad-element"
              data-name="Lathe Table #5"
              data-category="upholstery"
              data-specs="Precision assembly and fitting workbench."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="590" width="28" height="42" fill="transparent" />
            </g>

            <g
              id="elem_table_6"
              className="cad-element"
              data-name="Lathe Table #2"
              data-category="upholstery"
              data-specs="Assembly fitting table."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="605" y="663" width="28" height="22" fill="transparent" />
            </g>

            <g
              id="elem_table_7"
              className="cad-element"
              data-name="Lathe Table #1"
              data-category="upholstery"
              data-specs="Assembly fitting table."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="558" y="695" width="75" height="24" fill="transparent" />
            </g>

            {/* Center Floor (Storage Racks, Upholstery, Machine Shop) */}
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
              <rect x="550" y="145" width="170" height="26" fill="transparent" />
            </g>

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
              <rect x="550" y="210" width="135" height="26" fill="transparent" />
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
              <rect x="685" y="340" width="83" height="290" fill="transparent" />
            </g>

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
              <rect x="685" y="665" width="87" height="135" fill="transparent" />
            </g>

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
              <rect x="825" y="345" width="75" height="340" fill="transparent" />
            </g>

            {/* Lathes */}
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
              <rect x="925" y="335" width="65" height="45" fill="transparent" />
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
              <rect x="925" y="390" width="65" height="45" fill="transparent" />
            </g>

            <g
              id="elem_lathe_mach_2"
              className="cad-element"
              data-name="Lathe Mach. #2"
              data-category="machineshop"
              data-specs="High-speed precision chucking lathe."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onClick={handleElementClick}
            >
              <rect x="925" y="445" width="65" height="45" fill="transparent" />
            </g>

            <g
              id="elem_lathe_mach_1"
              className="cad-element"
              data-name="Lathe Mach. #1"
              data-category="machineshop"
              data-specs="Toolroom lathe with digital readout."
              onMouseEnter={handleElementMouseEnter}
              onMouseMove={handleElementMouseMove}
              onMouseLeave={handleElementMouseLeave}
              onClick={handleElementClick}
            >
              <rect x="925" y="500" width="65" height="45" fill="transparent" />
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
              <rect x="925" y="555" width="65" height="95" fill="transparent" />
            </g>

            {/* Haas Column */}
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
              <rect x="1090" y="335" width="55" height="85" fill="transparent" />
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
              <rect x="1090" y="440" width="55" height="90" fill="transparent" />
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
              <rect x="1090" y="635" width="55" height="40" fill="transparent" />
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
              <rect x="1090" y="695" width="55" height="40" fill="transparent" />
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
              <rect x="1055" y="794" width="88" height="40" fill="transparent" />
            </g>

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
              <rect x="834" y="772" width="67" height="50" fill="transparent" />
            </g>

            {/* East Floor (Amada Turrets, Spot Weld, Press Brakes) */}
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
              <rect x="1245" y="345" width="150" height="88" fill="transparent" />
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
              <rect x="1400" y="345" width="55" height="88" fill="transparent" />
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
              <rect x="1465" y="345" width="75" height="88" fill="transparent" />
            </g>

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
              <rect x="1255" y="530" width="135" height="65" fill="transparent" />
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
              <rect x="1395" y="530" width="55" height="88" fill="transparent" />
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
              <rect x="1475" y="590" width="60" height="180" fill="transparent" />
            </g>

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
              <rect x="1390" y="645" width="36" height="38" fill="transparent" />
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
              <rect x="1430" y="645" width="36" height="38" fill="transparent" />
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
              <rect x="1390" y="692" width="36" height="38" fill="transparent" />
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
              <rect x="1430" y="692" width="36" height="38" fill="transparent" />
            </g>

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
              <rect x="1575" y="345" width="18" height="340" fill="transparent" />
            </g>

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
              <rect x="1705" y="345" width="18" height="430" fill="transparent" />
            </g>

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
              <rect x="1603" y="350" width="40" height="65" fill="transparent" />
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
              <rect x="1603" y="425" width="40" height="55" fill="transparent" />
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
              <rect x="1603" y="492" width="40" height="42" fill="transparent" />
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
              <rect x="1603" y="545" width="40" height="40" fill="transparent" />
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
              <rect x="1603" y="625" width="40" height="50" fill="transparent" />
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
              <rect x="1653" y="350" width="40" height="65" fill="transparent" />
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
              <rect x="1653" y="495" width="40" height="65" fill="transparent" />
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
              <rect x="1653" y="605" width="40" height="60" fill="transparent" />
            </g>

            {/* South Floor */}
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
              <rect x="390" y="935" width="120" height="50" fill="transparent" />
            </g>

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
              <rect x="596" y="895" width="177" height="95" fill="transparent" />
            </g>

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
              <rect x="781" y="928" width="89" height="55" fill="transparent" />
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
              <rect x="839" y="845" width="152" height="32" fill="transparent" />
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
              <rect x="1074" y="844" width="100" height="38" fill="transparent" />
            </g>

            {[
              { id: 'elem_weld_7', num: 7, x: 889 },
              { id: 'elem_weld_6', num: 6, x: 942 },
              { id: 'elem_weld_5', num: 5, x: 995 },
              { id: 'elem_weld_4', num: 4, x: 1047 },
              { id: 'elem_weld_3', num: 3, x: 1097 },
              { id: 'elem_weld_2', num: 2, x: 1143 },
              { id: 'elem_weld_1', num: 1, x: 1187 },
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
                <rect x={weld.x} y="915" width="30" height="70" fill="transparent" />
              </g>
            ))}

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
              <rect x="1295" y="865" width="145" height="75" fill="transparent" />
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
              <rect x="1475" y="865" width="145" height="75" fill="transparent" />
            </g>

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
              <rect x="1665" y="820" width="70" height="120" fill="transparent" />
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
              <rect x="1750" y="820" width="150" height="120" fill="transparent" />
            </g>

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
              <rect x="1780" y="660" width="180" height="55" fill="transparent" />
            </g>

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
              <rect x="1780" y="725" width="180" height="45" fill="transparent" />
            </g>
          </g>

          {/* Status Badges Overlay (Toggled by showStatusIndicators) */}
          <g id="layerStatusDots" style={{ display: showStatusIndicators ? 'block' : 'none', pointerEvents: 'none' }}>
            <circle cx="1255" cy="370" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1265" cy="540" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="928" cy="360" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="930" cy="410" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="925" cy="470" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="925" cy="535" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="930" cy="595" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1125" cy="350" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1125" cy="470" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1310" cy="930" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1490" cy="930" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1775" cy="880" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1635" cy="375" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="1665" cy="370" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
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
