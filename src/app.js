import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const allowed = process.env.FRONTEND_URL || 'https://regwithdclm.vercel.app';
app.use(
  cors({
    origin: allowed,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/registrations', registrationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use(errorHandler);

export default app;
