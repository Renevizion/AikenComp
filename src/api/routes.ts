import { Router, Request, Response } from 'express';
import { CompilationQueue } from '../queue/CompilationQueue';
import { CompilationRequest, JobStatusResponse } from '../types';

export function createApiRouter(compilationQueue: CompilationQueue): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
      service: 'AikenComp Compilation API',
    });
  });

  // Submit compilation job
  router.post('/compile', async (req: Request, res: Response) => {
    try {
      const request: CompilationRequest = req.body;
      
      // Validate required fields
      if (!request.code) {
        res.status(400).json({
          error: 'Missing required field: code',
        });
        return;
      }
      
      // Validate code length (max 1MB)
      if (typeof request.code !== 'string' || request.code.length > 1024 * 1024) {
        res.status(400).json({
          error: 'Code must be a string with maximum length of 1MB',
        });
        return;
      }
      
      // Validate options if provided
      if (request.options) {
        if (typeof request.options !== 'object') {
          res.status(400).json({
            error: 'Options must be an object',
          });
          return;
        }
        
        // Validate individual option types
        const { optimize, trace, validate } = request.options;
        if (optimize !== undefined && typeof optimize !== 'boolean') {
          res.status(400).json({
            error: 'Option "optimize" must be a boolean',
          });
          return;
        }
        if (trace !== undefined && typeof trace !== 'boolean') {
          res.status(400).json({
            error: 'Option "trace" must be a boolean',
          });
          return;
        }
        if (validate !== undefined && typeof validate !== 'boolean') {
          res.status(400).json({
            error: 'Option "validate" must be a boolean',
          });
          return;
        }
      }
      
      const jobId = await compilationQueue.submitJob(request);
      
      res.status(202).json({
        jobId,
        message: 'Compilation job submitted',
        statusUrl: `/api/jobs/${jobId}`,
      });
    } catch (error: any) {
      console.error('Error submitting job:', error);
      res.status(500).json({
        error: 'Failed to submit compilation job',
        details: error.message,
      });
    }
  });

  // Get job status
  router.get('/jobs/:jobId', (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = compilationQueue.getJobStatus(jobId);
    
    if (!job) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }
    
    const response: JobStatusResponse = {
      id: job.id,
      status: job.status,
      timestamp: job.timestamp,
      result: job.result,
      error: job.error,
    };
    
    res.json(response);
  });

  // Get all jobs
  router.get('/jobs', (req: Request, res: Response) => {
    const jobs = compilationQueue.getAllJobs();
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const paginatedJobs = jobs.slice(offset, offset + limit);
    
    res.json({
      jobs: paginatedJobs,
      total: jobs.length,
      limit,
      offset,
    });
  });

  // Get queue statistics
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await compilationQueue.getQueueStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        error: 'Failed to get queue statistics',
        details: error.message,
      });
    }
  });

  return router;
}
