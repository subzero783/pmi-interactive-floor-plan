import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/departments
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        machines: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            lastUpdated: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// GET /api/departments/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const department = await prisma.department.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        machines: true,
      },
    });

    if (!department) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    res.json(department);
  } catch (error) {
    console.error('Fetch department details error:', error);
    res.status(500).json({ error: 'Failed to fetch department details' });
  }
});

export default router;
