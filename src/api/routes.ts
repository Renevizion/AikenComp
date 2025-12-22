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
      
      if (!request.code) {
        res.status(400).json({
          error: 'Missing required field: code',
        });
        return;
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
