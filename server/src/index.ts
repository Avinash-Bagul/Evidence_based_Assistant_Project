import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Route imports
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import documentRoutes from './routes/document.routes';
import planRoutes from './routes/plan.routes';
import evidenceRoutes from './routes/evidence.routes';
import briefRoutes from './routes/brief.routes';
import followUpRoutes from './routes/followup.routes';
import versionRoutes from './routes/version.routes';
import workflowRoutes from './routes/workflow.routes';

const app = express();

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.isDev ? 'http://localhost:5173' : process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Static files for uploads
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Request logging
app.use((req: any, _res: any, next: any) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// ============================================
// Routes
// ============================================

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/research-plan', planRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/research-brief', briefRoutes);
app.use('/api/follow-up', followUpRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/workflow', workflowRoutes);

// ============================================
// Error Handling
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// Start Server
// ============================================

app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
      pid: process.pid,
    },
    `🚀 Server running on http://localhost:${config.port}`
  );
});

export default app;
