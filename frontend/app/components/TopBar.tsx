import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  toggleStatusIndicators,
  toggleLabels,
  toggleGrid,
  setActiveCategory,
  setSearchQuery,
} from '../store/floorPlanSlice.js';

export const TopBar: React.FC = () => {
  const dispatch = useDispatch();
  const {
    showStatusIndicators,
    showLabels,
    showGrid,
    activeCategory,
    searchQuery,
  } = useSelector((state: RootState) => state.floorPlan);

  const filterCategories = [
    { id: 'all', label: 'All Areas' },
    { id: 'machineshop', label: 'Machine Shop', color: '#228b84' },
    { id: 'cnc', label: 'CNC / Amada Presses', color: '#d13636' },
    { id: 'staging', label: 'Staging & Assembly', color: '#845389' },
    { id: 'welding', label: 'Welding, Drill & Grind', color: '#f59e0b' },
    { id: 'cutting', label: 'Waterjet & Laser', color: '#0e65a6' },
    { id: 'coating', label: 'Powdercoat & Finishing', color: '#3da35d' },
    { id: 'upholstery', label: 'Upholstery', color: '#df7325' },
    { id: 'storage', label: 'Storage Racks', color: '#6e4768' },
    { id: 'office', label: 'Offices & Facilities', color: '#38bdf8' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const currentCategory = (activeCategory || 'all').toLowerCase();

  return (
    <>
      {/* ==========================================================================
           HEADER & TOOLBAR
           ========================================================================== */}
      <header>
        <div className="brand-section">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="brand-title">Pacific Maritime Industries</div>
            <div className="brand-subtitle">Facility Floor Plan & Operations Layout</div>
          </div>
        </div>

        <div className="controls-wrapper">
          <div className="search-box">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              id="searchInput"
              placeholder="Search machines, zones, offices..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            />
          </div>

          <div className="btn-group">
            <button
              type="button"
              className={`btn ${showLabels ? 'active' : ''}`}
              id="btnToggleLabels"
              title="Toggle Text Labels"
              onClick={() => dispatch(toggleLabels())}
            >
              <svg viewBox="0 0 24 24">
                <path d="M5 4v3h5.5v12h3V7H19V4z" />
              </svg>
              Labels
            </button>
            <button
              type="button"
              className={`btn ${showGrid ? 'active' : ''}`}
              id="btnToggleGrid"
              title="Toggle Grid Lines"
              onClick={() => dispatch(toggleGrid())}
            >
              <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />
              </svg>
              Grid
            </button>
            <button
              type="button"
              className={`btn ${showStatusIndicators ? 'active' : ''}`}
              id="btnStatusMode"
              title="Machine Status Overlay"
              onClick={() => dispatch(toggleStatusIndicators())}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              Status
            </button>
            <button
              type="button"
              className="btn"
              id="btnPrint"
              title="Print Floor Plan"
              onClick={handlePrint}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================================================
           CATEGORY FILTER BAR
           ========================================================================== */}
      <div className="filter-bar">
        {filterCategories.map((cat) => {
          const isActive = currentCategory === cat.id;
          return (
            <div
              key={cat.id}
              className={`filter-chip ${isActive ? 'active' : ''}`}
              data-category={cat.id}
              onClick={() => dispatch(setActiveCategory(cat.id))}
            >
              {cat.color && <span className="dot" style={{ background: cat.color }} />}
              {cat.label}
            </div>
          );
        })}
      </div>
    </>
  );
};
