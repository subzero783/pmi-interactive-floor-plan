import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store/index.js';
import { InteractiveFloorPlan } from '../components/InteractiveFloorPlan.js';
import { TopBar } from '../components/TopBar.js';

describe('InteractiveFloorPlan & TopBar UI Components', () => {
  it('renders company title in TopBar', () => {
    render(
      <Provider store={store}>
        <TopBar />
      </Provider>
    );

    expect(screen.getByText('Pacific Maritime Industries Corp.')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
  });

  it('renders interactive floor plan SVG canvas and status legend', () => {
    render(
      <Provider store={store}>
        <InteractiveFloorPlan />
      </Provider>
    );

    expect(screen.getByText('Green (Running)')).toBeInTheDocument();
    expect(screen.getByText('Yellow (Idle)')).toBeInTheDocument();
    expect(screen.getByText('Red (Maintenance)')).toBeInTheDocument();
  });
});
