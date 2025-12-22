import Bull, { Queue, Job } from 'bull';
import { CompilationJob, JobStatus, CompilationRequest, CompilationResult } from '../types';
import { AikenCompiler } from '../compiler/AikenCompiler';
import { v4 as uuidv4 } from 'uuid';

export class CompilationQueue {
  private queue: Queue;
  private compiler: AikenCompiler;
  private jobs: Map<string, CompilationJob>;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.queue = new Bull('compilation', redisUrl);
    this.compiler = new AikenCompiler();
    this.jobs = new Map();
    
    this.setupProcessor();
  }

  async initialize(): Promise<void> {
    await this.compiler.initialize();
    console.log('Compilation queue initialized');
  }

  private setupProcessor(): void {
    this.queue.process(async (job: Job) => {
      const { jobId, code, options } = job.data;
      
      // Update job status
      const compilationJob = this.jobs.get(jobId);
      if (compilationJob) {
        compilationJob.status = JobStatus.PROCESSING;
      }
      
      try {
        // Compile the code
        const result = await this.compiler.compile(code, options);
        
        // Update job with result
        if (compilationJob) {
          compilationJob.status = JobStatus.COMPLETED;
          compilationJob.result = result;
        }
        
        return { success: true, result };
      } catch (error: any) {
        // Update job with error
        if (compilationJob) {
          compilationJob.status = JobStatus.FAILED;
          compilationJob.error = {
            message: error.message || 'Compilation failed',
            details: error,
          };
        }
        
        throw error;
      }
    });

    this.queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });
  }

  async submitJob(request: CompilationRequest): Promise<string> {
    const jobId = uuidv4();
    
    // Create job record
    const compilationJob: CompilationJob = {
      id: jobId,
      status: JobStatus.PENDING,
      code: request.code,
      timestamp: Date.now(),
    };
    
    this.jobs.set(jobId, compilationJob);
    
    // Add to queue
    await this.queue.add({
      jobId,
      code: request.code,
      options: request.options || {},
    });
    
    return jobId;
  }

  getJobStatus(jobId: string): CompilationJob | null {
    return this.jobs.get(jobId) || null;
  }

  getAllJobs(): CompilationJob[] {
    return Array.from(this.jobs.values());
  }

  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      total: this.jobs.size,
    };
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
