import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store/index.js';
import { InteractiveFloorPlan } from '../components/InteractiveFloorPlan.js';
import { TopBar } from '../components/TopBar.js';
import { MachineDetailDrawer } from '../components/MachineDetailDrawer.js';

describe('InteractiveFloorPlan & TopBar UI Components', () => {
  it('renders company title, controls and filter chips in TopBar', () => {
    render(
      <Provider store={store}>
        <TopBar />
      </Provider>
    );

    expect(screen.getByText('Pacific Maritime Industries')).toBeInTheDocument();
    expect(screen.getByText('Facility Floor Plan & Operations Layout')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
    expect(screen.getByText('All Areas')).toBeInTheDocument();
    expect(screen.getByText('Machine Shop')).toBeInTheDocument();
    expect(screen.getByText('CNC / Amada Presses')).toBeInTheDocument();
  });

  it('renders interactive floor plan SVG canvas and HUD elements', () => {
    const { container } = render(
      <Provider store={store}>
        <InteractiveFloorPlan />
      </Provider>
    );

    expect(container.querySelector('#floorPlanSvg')).toBeInTheDocument();
    expect(screen.getByText('FACILITY NORTH')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
    expect(screen.getByText('⟲')).toBeInTheDocument();
  });

  it('renders machine detail drawer components', () => {
    render(
      <Provider store={store}>
        <MachineDetailDrawer />
      </Provider>
    );

    expect(screen.getByText('Operational Status')).toBeInTheDocument();
    expect(screen.getByText('Specifications & Capabilities')).toBeInTheDocument();
    expect(screen.getByText('Safety & Environmental')).toBeInTheDocument();
    expect(screen.getByText('Center in View')).toBeInTheDocument();
  });
});
