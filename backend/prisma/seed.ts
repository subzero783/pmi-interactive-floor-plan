import { PrismaClient, Role, DepartmentCategory, MachineStatus } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PMI Floor Plan database...');

  // 1. Create Default Users (Operator & Admin)
  const passwordHash = await argon2.hash('PMIpassword2026!');
  
  await prisma.user.upsert({
    where: { email: 'operator@pmi.com' },
    update: {},
    create: {
      email: 'operator@pmi.com',
      name: 'PMI Shopfloor Operator',
      passwordHash,
      role: Role.OPERATOR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@pmi.com' },
    update: {},
    create: {
      email: 'admin@pmi.com',
      name: 'PMI Facility Manager',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // Clear existing departments & machines for clean seed
  await prisma.machine.deleteMany();
  await prisma.department.deleteMany();

  // 2. Define Departments
  const hardwareDept = await prisma.department.create({
    data: {
      code: 'DEPT_HARDWARE',
      name: 'Hardware Dept.',
      category: DepartmentCategory.FINISHING,
      x: 45,
      y: 135,
      width: 100,
      height: 100,
      color: '#4d6b38',
      description: 'Hardware installation and fastening tools department.',
    },
  });

  const powdercoatDept = await prisma.department.create({
    data: {
      code: 'DEPT_POWDERCOAT',
      name: 'Powdercoat Area',
      category: DepartmentCategory.FINISHING,
      x: 45,
      y: 330,
      width: 150,
      height: 380,
      color: '#559955',
      description: 'Large liquid/powder coating line and high-temp curing oven.',
    },
  });

  const machineShopDept = await prisma.department.create({
    data: {
      code: 'DEPT_MACHINE_SHOP',
      name: 'Machine Shop Area',
      category: DepartmentCategory.PRODUCTION,
      x: 460,
      y: 440,
      width: 140,
      height: 250,
      color: '#d97736',
      description: 'Precision CNC Lathes, Haas Vertical Mills, and precision machining equipment.',
    },
  });

  const weldingDept = await prisma.department.create({
    data: {
      code: 'DEPT_WELDING',
      name: 'Welding & Robot Area',
      category: DepartmentCategory.WELDING,
      x: 420,
      y: 740,
      width: 220,
      height: 140,
      color: '#93a17e',
      description: 'Robotic welding cells, manual TIG/MIG welding booths, and staging area.',
    },
  });

  const pressBrakeDept = await prisma.department.create({
    data: {
      code: 'DEPT_PRESS_BRAKE',
      name: 'Press Brake Staging Area',
      category: DepartmentCategory.PRESS_BRAKE,
      x: 785,
      y: 450,
      width: 65,
      height: 280,
      color: '#2a8555',
      description: 'Amada high-tonnage precision press brake sheet bending area.',
    },
  });

  const assemblyDept = await prisma.department.create({
    data: {
      code: 'DEPT_ASSEMBLY',
      name: 'Assembly & Upholstery Area',
      category: DepartmentCategory.ASSEMBLY,
      x: 230,
      y: 370,
      width: 180,
      height: 300,
      color: '#8c597c',
      description: 'Final assembly staging, benchwork, honeycomb press, and upholstery.',
    },
  });

  const cuttingDept = await prisma.department.create({
    data: {
      code: 'DEPT_CUTTING',
      name: 'Laser & Waterjet Cutting Area',
      category: DepartmentCategory.PRODUCTION,
      x: 640,
      y: 790,
      width: 320,
      height: 120,
      color: '#1d6391',
      description: 'Omax abrasive waterjet cutters, Amada fiber lasers, and heavy saw equipment.',
    },
  });

  const officeDept = await prisma.department.create({
    data: {
      code: 'DEPT_OFFICES',
      name: 'Executive & Engineering Offices',
      category: DepartmentCategory.OFFICE,
      x: 885,
      y: 135,
      width: 95,
      height: 520,
      color: '#d4c4a8',
      description: 'Engineering, Planning & Quoting, HR, Sales, and Purchasing offices.',
    },
  });

  // 3. Define Machines with Initial Status (Green, Yellow, Red) and top-left positions
  const machinesData = [
    // Machine Shop Area
    { code: 'M_HAAS_01', name: 'Haas Mach. #1', departmentId: machineShopDept.id, status: MachineStatus.RUNNING, x: 535, y: 350, width: 32, height: 60, msg: 'Active production batch #8492' },
    { code: 'M_HAAS_02', name: 'Haas Mach. #2', departmentId: machineShopDept.id, status: MachineStatus.RUNNING, x: 535, y: 440, width: 32, height: 60, msg: 'Processing aluminum bracket' },
    { code: 'M_HAAS_03', name: 'Haas Mach. #3', departmentId: machineShopDept.id, status: MachineStatus.IDLE, x: 470, y: 600, width: 30, height: 35, msg: 'Awaiting material feed' },
    { code: 'M_HAAS_04', name: 'Haas Mach. #4', departmentId: machineShopDept.id, status: MachineStatus.MAINTENANCE, x: 538, y: 640, width: 28, height: 30, msg: 'Tool changer calibration (Red Status)' },
    { code: 'M_HAAS_05', name: 'Haas Mach. #5', departmentId: machineShopDept.id, status: MachineStatus.RUNNING, x: 538, y: 700, width: 28, height: 30, msg: 'Running fine detail contour' },

    { code: 'M_LATHE_01', name: 'Lathe Mach. #1', departmentId: machineShopDept.id, status: MachineStatus.RUNNING, x: 470, y: 490, width: 32, height: 32, msg: 'Turning stainless steel pins' },
    { code: 'M_LATHE_02', name: 'Lathe Mach. #2', departmentId: machineShopDept.id, status: MachineStatus.RUNNING, x: 470, y: 445, width: 32, height: 32, msg: 'Turning bronze bushings' },
    { code: 'M_LATHE_03', name: 'Lathe Mach. #3', departmentId: machineShopDept.id, status: MachineStatus.IDLE, x: 470, y: 400, width: 32, height: 32, msg: 'Setup in progress' },
    { code: 'M_LATHE_04', name: 'Lathe Mach. #4', departmentId: machineShopDept.id, status: MachineStatus.RUNNING, x: 470, y: 355, width: 32, height: 32, msg: 'Active shaft lathe operation' },

    // Press Brake Area
    { code: 'M_AMADA_RG35', name: 'Amada RG 35', departmentId: pressBrakeDept.id, status: MachineStatus.RUNNING, x: 795, y: 650, width: 22, height: 40, msg: 'Precision sheet metal fold' },
    { code: 'M_AMADA_HG2204', name: 'Amada HG 2204 NT', departmentId: pressBrakeDept.id, status: MachineStatus.RUNNING, x: 795, y: 350, width: 22, height: 45, msg: '220-ton press brake active' },
    { code: 'M_AMADA_HDS1030', name: 'Amada HDS 1030', departmentId: pressBrakeDept.id, status: MachineStatus.IDLE, x: 795, y: 440, width: 22, height: 35, msg: 'Program loaded, operator inspection' },
    { code: 'M_AMADA_HD1003_1', name: 'Amada HD 1003 ATC #1', departmentId: pressBrakeDept.id, status: MachineStatus.RUNNING, x: 822, y: 350, width: 22, height: 45, msg: 'Auto tool changer active' },
    { code: 'M_AMADA_HD1003_2', name: 'Amada HD 1003 ATC #2', departmentId: pressBrakeDept.id, status: MachineStatus.MAINTENANCE, x: 822, y: 500, width: 22, height: 45, msg: 'Hydraulic fluid check required' },

    // Heavy Cutting & Laser Area
    { code: 'M_OMAX_01', name: 'Omax Mach. #1', departmentId: cuttingDept.id, status: MachineStatus.RUNNING, x: 735, y: 870, width: 60, height: 50, msg: 'Cutting 1/2 inch titanium plate' },
    { code: 'M_OMAX_02', name: 'Omax Mach. #2', departmentId: cuttingDept.id, status: MachineStatus.RUNNING, x: 645, y: 870, width: 60, height: 50, msg: 'Abrasive waterjet active' },
    { code: 'M_AMADA_LASER', name: 'Laser Amada', departmentId: cuttingDept.id, status: MachineStatus.RUNNING, x: 870, y: 825, width: 75, height: 95, msg: 'High speed fiber laser cutting' },
    { code: 'M_AMADA_EMK', name: 'Amada EMK Mach.', departmentId: cuttingDept.id, status: MachineStatus.RUNNING, x: 618, y: 350, width: 75, height: 75, msg: 'Turret punch press active' },
    { code: 'M_AMADA_EML', name: 'Amada EML Mach.', departmentId: cuttingDept.id, status: MachineStatus.IDLE, x: 622, y: 505, width: 75, height: 55, msg: 'Combination laser/punch idle' },
    { code: 'M_AMADA_SAW', name: 'Amada 250 Saw Machine', departmentId: cuttingDept.id, status: MachineStatus.RUNNING, x: 890, y: 730, width: 85, height: 35, msg: 'Automatic stock saw' },

    // Welding & Robot Area
    { code: 'M_WELD_ROBOT_1', name: 'Weld Robot #1', departmentId: weldingDept.id, status: MachineStatus.RUNNING, x: 390, y: 885, width: 30, height: 35, msg: 'Robotic MIG seam weld' },
    { code: 'M_WELD_ROBOT_2', name: 'Weld Robot #2', departmentId: weldingDept.id, status: MachineStatus.RUNNING, x: 420, y: 745, width: 30, height: 30, msg: 'Robotic arm active' },
    { code: 'M_SPOT_WELD_1', name: 'SW Mach #1', departmentId: weldingDept.id, status: MachineStatus.RUNNING, x: 685, y: 700, width: 22, height: 22, msg: 'Resistance spot welding' },

    // Assembly & Finishing
    { code: 'M_HONEYCOMB_PRESS', name: 'Honeycomb Press Mach.', departmentId: assemblyDept.id, status: MachineStatus.RUNNING, x: 202, y: 655, width: 55, height: 38, msg: 'Panel lamination cycle' },
    { code: 'M_SANDBLAST', name: 'Sandblast Mach.', departmentId: powdercoatDept.id, status: MachineStatus.IDLE, x: 202, y: 895, width: 55, height: 35, msg: 'Abrasive blast chamber standby' }
  ];

  for (const machine of machinesData) {
    await prisma.machine.create({
      data: machine,
    });
  }

  console.log(`Successfully seeded ${machinesData.length} machines across ${await prisma.department.count()} departments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
