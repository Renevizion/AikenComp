import Bull, { Queue, Job } from 'bull';
import { CompilationJob, JobStatus, CompilationRequest, CompilationResult } from '../types';
import { AikenCompiler } from '../compiler/AikenCompiler';
import { v4 as uuidv4 } from 'uuid';

export class CompilationQueue {
  private queue: Queue | null = null;
  private compiler: AikenCompiler;
  private jobs: Map<string, CompilationJob>;
  private useMemoryMode: boolean = false;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.compiler = new AikenCompiler();
    this.jobs = new Map();
    
    try {
      this.queue = new Bull('compilation', redisUrl, {
        settings: {
          lockDuration: 30000,
          lockRenewTime: 15000,
          stalledInterval: 30000,
          maxStalledCount: 1,
        },
      });
      
      // Listen for connection errors
      this.queue.on('error', (error) => {
        if (!this.useMemoryMode) {
          console.warn('Redis queue error, switching to in-memory mode:', error.message);
          this.useMemoryMode = true;
        }
      });
      
      this.setupProcessor();
    } catch (error) {
      console.warn('Redis not available, using in-memory mode');
      this.useMemoryMode = true;
    }
  }

  async initialize(): Promise<void> {
    await this.compiler.initialize();
    
    // Test Redis connection if queue is configured
    if (this.queue && !this.useMemoryMode) {
      try {
        // Set a timeout for Redis connection check
        await Promise.race([
          this.queue.isReady(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
          )
        ]);
        console.log('Compilation queue initialized with Redis');
      } catch (error) {
        console.warn('Redis connection failed, switching to in-memory mode');
        this.useMemoryMode = true;
        if (this.queue) {
          await this.queue.close().catch(() => {});
          this.queue = null;
        }
      }
    } else {
      console.log('Compilation queue initialized in memory mode');
    }
  }

  private setupProcessor(): void {
    if (!this.queue) return;
    
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
    
    // If in memory mode, process immediately
    if (this.useMemoryMode || !this.queue) {
      this.processJobInMemory(jobId, request.code, request.options || {});
    } else {
      // Add to queue with timeout protection
      try {
        await Promise.race([
          this.queue.add({
            jobId,
            code: request.code,
            options: request.options || {},
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Queue add timeout')), 2000)
          )
        ]);
      } catch (error) {
        console.warn('Failed to add job to Redis queue, using in-memory processing');
        this.useMemoryMode = true;
        this.processJobInMemory(jobId, request.code, request.options || {});
      }
    }
    
    return jobId;
  }

  private async processJobInMemory(jobId: string, code: string, options: any): Promise<void> {
    const compilationJob = this.jobs.get(jobId);
    if (!compilationJob) return;
    
    // Process in background
    setImmediate(async () => {
      compilationJob.status = JobStatus.PROCESSING;
      
      try {
        const result = await this.compiler.compile(code, options);
        compilationJob.status = JobStatus.COMPLETED;
        compilationJob.result = result;
        console.log(`Job ${jobId} completed successfully (in-memory)`);
      } catch (error: any) {
        compilationJob.status = JobStatus.FAILED;
        compilationJob.error = {
          message: error.message || 'Compilation failed',
          details: error,
        };
        console.error(`Job ${jobId} failed (in-memory):`, error.message);
      }
    });
  }

  getJobStatus(jobId: string): CompilationJob | null {
    return this.jobs.get(jobId) || null;
  }

  getAllJobs(): CompilationJob[] {
    return Array.from(this.jobs.values());
  }

  async getQueueStats(): Promise<any> {
    if (this.useMemoryMode || !this.queue) {
      // Calculate stats from in-memory jobs
      const jobs = Array.from(this.jobs.values());
      return {
        waiting: jobs.filter(j => j.status === JobStatus.PENDING).length,
        active: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
        completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
        failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
        total: this.jobs.size,
      };
    }
    
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
    if (this.queue) {
      await this.queue.close();
    }
  }
}
