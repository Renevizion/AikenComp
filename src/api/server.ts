import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { CompilationQueue } from '../queue/CompilationQueue';
import { createApiRouter } from './routes';

export class ApiServer {
  private app: Application;
  private compilationQueue: CompilationQueue;
  private port: number;

  constructor(port: number = 3000, redisUrl?: string) {
    this.app = express();
    this.port = port;
    this.compilationQueue = new CompilationQueue(redisUrl);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Body parser
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // CORS
    this.app.use(cors());
    
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    const apiRouter = createApiRouter(this.compilationQueue);
    this.app.use('/api', apiRouter);
    
    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'AikenComp Compilation API',
        version: '1.0.0',
        description: 'Standalone Aiken compilation API with job queue and status tracking',
        endpoints: {
          health: '/api/health',
          compile: 'POST /api/compile',
          jobStatus: 'GET /api/jobs/:jobId',
          jobs: 'GET /api/jobs',
          stats: 'GET /api/stats',
        },
      });
    });
    
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });
  }

  async start(): Promise<void> {
    await this.compilationQueue.initialize();
    
    this.app.listen(this.port, () => {
      console.log(`AikenComp API server running on port ${this.port}`);
      console.log(`API documentation available at http://localhost:${this.port}/`);
    });
  }

  async stop(): Promise<void> {
    await this.compilationQueue.close();
  }

  getApp(): Application {
    return this.app;
  }
}
