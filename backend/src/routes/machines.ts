import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { MachineStatus } from '@prisma/client';

const router = Router();

// GET /api/machines
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        department: {
          select: { id: true, name: true, code: true, category: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(machines);
  } catch (error) {
    console.error('Fetch machines error:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// GET /api/machines/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const machine = await prisma.machine.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        department: true,
      },
    });

    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    res.json(machine);
  } catch (error) {
    console.error('Fetch machine details error:', error);
    res.status(500).json({ error: 'Failed to fetch machine details' });
  }
});

// PATCH /api/machines/:id/status
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, statusMessage } = req.body;

    if (!status || !Object.values(MachineStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid machine status. Must be RUNNING, IDLE, or MAINTENANCE' });
      return;
    }

    const machine = await prisma.machine.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    const updatedMachine = await prisma.machine.update({
      where: { id: machine.id },
      data: {
        status: status as MachineStatus,
        statusMessage: statusMessage !== undefined ? statusMessage : machine.statusMessage,
        lastUpdated: new Date(),
      },
      include: {
        department: true,
      },
    });

    res.json(updatedMachine);
  } catch (error) {
    console.error('Update machine status error:', error);
    res.status(500).json({ error: 'Failed to update machine status' });
  }
});

export default router;
