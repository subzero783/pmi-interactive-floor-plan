import { useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { useDispatch } from 'react-redux';
import { setFloorPlanData, Department, Machine } from '../store/floorPlanSlice.js';
import { TopBar } from '../components/TopBar.js';
import { InteractiveFloorPlan } from '../components/InteractiveFloorPlan.js';
import { MachineDetailDrawer } from '../components/MachineDetailDrawer.js';
import { PrintViewModal } from '../components/PrintViewModal.js';

// Default initial floor plan dataset matching PMI facility floor plan
const defaultDepartments: Department[] = [
  { id: '1', code: 'DEPT_HARDWARE', name: 'Hardware Dept.', category: 'FINISHING', x: 45, y: 135, width: 100, height: 100, color: '#4d6b38', description: 'Hardware installation and fastening department.' },
  { id: '2', code: 'DEPT_POWDERCOAT', name: 'Powdercoat Area', category: 'FINISHING', x: 45, y: 330, width: 150, height: 260, color: '#559955', description: 'Powder coating line & high temp curing oven.' },
  { id: '3', code: 'DEPT_MACHINE_SHOP', name: 'Machine Shop Area', category: 'PRODUCTION', x: 460, y: 135, width: 140, height: 450, color: '#d97736', description: 'CNC Lathes, Haas Vertical Mills, and precision machining.' },
  { id: '4', code: 'DEPT_WELDING', name: 'Welding & Robot Area', category: 'WELDING', x: 420, y: 460, width: 220, height: 130, color: '#93a17e', description: 'Robotic welding cells and manual TIG/MIG stations.' },
  { id: '5', code: 'DEPT_PRESS_BRAKE', name: 'Press Brake Area', category: 'PRESS_BRAKE', x: 785, y: 135, width: 65, height: 450, color: '#2a8555', description: 'Amada precision press brake sheet bending.' },
  { id: '6', code: 'DEPT_ASSEMBLY', name: 'Assembly Staging Area', category: 'ASSEMBLY', x: 210, y: 220, width: 180, height: 370, color: '#8c597c', description: 'Final assembly staging, honeycomb press, and upholstery.' },
  { id: '7', code: 'DEPT_CUTTING', name: 'Laser & Waterjet Cutting Area', category: 'PRODUCTION', x: 640, y: 480, width: 320, height: 110, color: '#1d6391', description: 'Omax waterjet cutters, Amada fiber lasers, saw machines.' },
  { id: '8', code: 'DEPT_OFFICES', name: 'Executive & Engineering Offices', category: 'OFFICE', x: 885, y: 135, width: 95, height: 450, color: '#d4c4a8', description: 'Engineering, Planning, HR, Sales, and Purchasing.' },
];

const defaultMachines: Machine[] = [
  // Machine Shop Area
  { id: 'm1', code: 'M_HAAS_01', name: 'Haas Mach. #1', departmentId: '3', status: 'RUNNING', x: 535, y: 210, width: 32, height: 50, statusMessage: 'Active batch #8492' },
  { id: 'm2', code: 'M_HAAS_02', name: 'Haas Mach. #2', departmentId: '3', status: 'RUNNING', x: 535, y: 280, width: 32, height: 50, statusMessage: 'Processing bracket' },
  { id: 'm3', code: 'M_HAAS_03', name: 'Haas Mach. #3', departmentId: '3', status: 'IDLE', x: 470, y: 390, width: 30, height: 35, statusMessage: 'Awaiting feed' },
  { id: 'm4', code: 'M_HAAS_04', name: 'Haas Mach. #4', departmentId: '3', status: 'MAINTENANCE', x: 538, y: 410, width: 28, height: 30, statusMessage: 'Tool changer check' },
  { id: 'm5', code: 'M_HAAS_05', name: 'Haas Mach. #5', departmentId: '3', status: 'RUNNING', x: 538, y: 450, width: 28, height: 30, statusMessage: 'Fine detail lathe' },
  
  { id: 'm6', code: 'M_LATHE_01', name: 'Lathe Mach. #1', departmentId: '3', status: 'RUNNING', x: 470, y: 310, width: 32, height: 30 },
  { id: 'm7', code: 'M_LATHE_02', name: 'Lathe Mach. #2', departmentId: '3', status: 'RUNNING', x: 470, y: 275, width: 32, height: 30 },
  { id: 'm8', code: 'M_LATHE_03', name: 'Lathe Mach. #3', departmentId: '3', status: 'IDLE', x: 470, y: 240, width: 32, height: 30 },
  { id: 'm9', code: 'M_LATHE_04', name: 'Lathe Mach. #4', departmentId: '3', status: 'RUNNING', x: 470, y: 205, width: 32, height: 30 },

  // Press Brake Area
  { id: 'm10', code: 'M_AMADA_RG35', name: 'Amada RG 35', departmentId: '5', status: 'RUNNING', x: 795, y: 400, width: 22, height: 40 },
  { id: 'm11', code: 'M_AMADA_HG2204', name: 'Amada HG 2204 NT', departmentId: '5', status: 'RUNNING', x: 795, y: 210, width: 22, height: 45 },
  { id: 'm12', code: 'M_AMADA_HDS1030', name: 'Amada HDS 1030', departmentId: '5', status: 'IDLE', x: 795, y: 270, width: 22, height: 35 },
  { id: 'm13', code: 'M_AMADA_HD1003_1', name: 'Amada HD 1003 ATC #1', departmentId: '5', status: 'RUNNING', x: 822, y: 210, width: 22, height: 45 },
  { id: 'm14', code: 'M_AMADA_HD1003_2', name: 'Amada HD 1003 ATC #2', departmentId: '5', status: 'MAINTENANCE', x: 822, y: 310, width: 22, height: 45 },

  // Heavy Cutting & Lasers
  { id: 'm15', code: 'M_OMAX_01', name: 'Omax Mach. #1', departmentId: '7', status: 'RUNNING', x: 735, y: 535, width: 60, height: 40 },
  { id: 'm16', code: 'M_OMAX_02', name: 'Omax Mach. #2', departmentId: '7', status: 'RUNNING', x: 645, y: 535, width: 60, height: 40 },
  { id: 'm17', code: 'M_AMADA_LASER', name: 'Laser Amada', departmentId: '7', status: 'RUNNING', x: 870, y: 510, width: 75, height: 65 },
  { id: 'm18', code: 'M_AMADA_EMK', name: 'Amada EMK Mach.', departmentId: '7', status: 'RUNNING', x: 618, y: 210, width: 75, height: 55 },
  { id: 'm19', code: 'M_AMADA_EML', name: 'Amada EML Mach.', departmentId: '7', status: 'IDLE', x: 622, y: 310, width: 75, height: 45 },
  { id: 'm20', code: 'M_AMADA_SAW', name: 'Amada 250 Saw Machine', departmentId: '7', status: 'RUNNING', x: 890, y: 450, width: 85, height: 28 },

  // Welding & Robots
  { id: 'm21', code: 'M_WELD_ROBOT_1', name: 'Weld Robot #1', departmentId: '4', status: 'RUNNING', x: 390, y: 545, width: 30, height: 30 },
  { id: 'm22', code: 'M_WELD_ROBOT_2', name: 'Weld Robot #2', departmentId: '4', status: 'RUNNING', x: 420, y: 465, width: 30, height: 25 },
  
  // Assembly & Powdercoat
  { id: 'm23', code: 'M_HONEYCOMB_PRESS', name: 'Honeycomb Press Mach.', departmentId: '6', status: 'RUNNING', x: 202, y: 405, width: 55, height: 30 },
  { id: 'm24', code: 'M_SANDBLAST', name: 'Sandblast Mach.', departmentId: '2', status: 'IDLE', x: 202, y: 550, width: 55, height: 30 },
];

export async function loader() {
  try {
    const res = await fetch('http://localhost:5000/api/floorplan');
    if (res.ok) {
      const data = await res.json();
      if (data.departments && data.machines) {
        return { departments: data.departments, machines: data.machines };
      }
    }
  } catch (err) {
    // API server offline during SSR pre-render -> fallback gracefully
  }

  return { departments: defaultDepartments, machines: defaultMachines };
}

export default function Index() {
  const loaderData = useLoaderData() as { departments: Department[]; machines: Machine[] };
  const dispatch = useDispatch();

  useEffect(() => {
    if (loaderData) {
      dispatch(setFloorPlanData(loaderData));
    }
  }, [loaderData, dispatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      <TopBar />
      <main className="flex-1 relative overflow-hidden">
        <InteractiveFloorPlan />
        <MachineDetailDrawer />
        <PrintViewModal />
      </main>
    </div>
  );
}
