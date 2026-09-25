import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import departmentRoutes from './routes/departments.js';
import machineRoutes from './routes/machines.js';
import { prisma } from './lib/prisma.js';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PMI Floor Plan Backend', timestamp: new Date() });
});

// Floor plan combined summary endpoint
app.get('/api/floorplan', async (_req, res) => {
  try {
    const [departments, machines] = await Promise.all([
      prisma.department.findMany({ include: { machines: true } }),
      prisma.machine.findMany({ include: { department: true } }),
    ]);

    res.json({
      company: 'Pacific Maritime Industries Corp',
      departments,
      machines,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Floorplan fetch error:', error);
    res.status(500).json({ error: 'Failed to load floor plan data' });
  }
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/machines', machineRoutes);

// Export app for testing; start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`PMI Express API Server running on port ${PORT}`);
  });
}
