import { CompilationQueue } from '../queue/CompilationQueue';
import { JobStatus } from '../types';

describe('CompilationQueue', () => {
  let queue: CompilationQueue;

  beforeEach(() => {
    queue = new CompilationQueue();
  });

  afterEach(async () => {
    await queue.close();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(queue.initialize()).resolves.not.toThrow();
    });
  });

  describe('job submission', () => {
    it('should submit a job and return a job ID', async () => {
      await queue.initialize();
      
      const jobId = await queue.submitJob({
        code: 'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }',
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should track job status', async () => {
      await queue.initialize();
      
      const jobId = await queue.submitJob({
        code: 'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }',
      });

      const job = queue.getJobStatus(jobId);
      expect(job).not.toBeNull();
      expect(job?.id).toBe(jobId);
      expect(job?.status).toBeDefined();
    });

    it('should process job and complete successfully', async () => {
      await queue.initialize();
      
      const jobId = await queue.submitJob({
        code: 'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }',
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const job = queue.getJobStatus(jobId);
      expect(job?.status).toBe(JobStatus.COMPLETED);
      expect(job?.result).toBeDefined();
      expect(job?.result?.success).toBe(true);
    });
  });

  describe('job retrieval', () => {
    it('should return null for non-existent job', () => {
      const job = queue.getJobStatus('non-existent-id');
      expect(job).toBeNull();
    });

    it('should list all jobs', async () => {
      await queue.initialize();
      
      await queue.submitJob({
        code: 'validator test1 { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }',
      });
      await queue.submitJob({
        code: 'validator test2 { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { False } }',
      });

      const jobs = queue.getAllJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('queue statistics', () => {
    it('should return queue statistics', async () => {
      await queue.initialize();
      
      const stats = await queue.getQueueStats();
      
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
    });

    it('should track completed jobs in stats', async () => {
      await queue.initialize();
      
      await queue.submitJob({
        code: 'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }',
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await queue.getQueueStats();
      expect(stats.completed).toBeGreaterThanOrEqual(1);
    });
  });
});
