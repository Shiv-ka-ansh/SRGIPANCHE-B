import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import eventRegistrationRoutes from './routes/eventRegistrations';
import eventRoutes from './routes/events';
import scheduleRoutes from './routes/schedule';
import userRoutes from './routes/users';
import exportRoutes from './routes/export';
import analyticsRoutes from './routes/analytics';

const app = express();
const PORT = process.env.PORT || 4000;

// Correctly handle proxy headers (essential for Render/Heroku etc.)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-Limit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://panache2k26.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/panache2k26')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/event-registrations', eventRegistrationRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
