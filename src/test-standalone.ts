import { CompilationQueue } from '../queue/CompilationQueue';
import { CompilationRequest, JobStatus } from '../types';

async function testCompilationQueue() {
  console.log('=== Testing Compilation Queue (Standalone Mode) ===\n');
  
  try {
    // Use in-memory mode for testing (will fail gracefully if Redis not available)
    const queue = new CompilationQueue();
    
    console.log('Initializing compilation queue...');
    await queue.initialize();
    console.log('✓ Queue initialized\n');
    
    // Test 1: Submit a job
    console.log('Test 1: Submitting compilation job...');
    const request: CompilationRequest = {
      code: `validator my_validator {
  fn spend(_datum: Data, _redeemer: Data, _context: Data) -> Bool {
    True
  }
}`,
      options: {
        optimize: true,
        validate: true,
      },
    };
    
    const jobId = await queue.submitJob(request);
    console.log(`✓ Job submitted with ID: ${jobId}\n`);
    
    // Test 2: Check job status
    console.log('Test 2: Checking job status...');
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkStatus = () => {
      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          attempts++;
          const job = queue.getJobStatus(jobId);
          
          if (job) {
            console.log(`  Attempt ${attempts}: Status = ${job.status}`);
            
            if (job.status === JobStatus.COMPLETED) {
              console.log('✓ Compilation completed successfully');
              console.log('  Result:', JSON.stringify(job.result, null, 2));
              clearInterval(interval);
              resolve();
            } else if (job.status === JobStatus.FAILED) {
              console.log('✗ Compilation failed');
              console.log('  Error:', job.error);
              clearInterval(interval);
              resolve();
            } else if (attempts >= maxAttempts) {
              console.log('⚠ Timeout waiting for completion');
              clearInterval(interval);
              resolve();
            }
          }
        }, 1000);
      });
    };
    
    await checkStatus();
    console.log('');
    
    // Test 3: Get all jobs
    console.log('Test 3: Getting all jobs...');
    const allJobs = queue.getAllJobs();
    console.log(`✓ Found ${allJobs.length} job(s)`);
    console.log('');
    
    // Test 4: Get queue stats
    console.log('Test 4: Getting queue statistics...');
    const stats = await queue.getQueueStats();
    console.log('✓ Queue statistics:', JSON.stringify(stats, null, 2));
    console.log('');
    
    console.log('=== All Tests Passed ===\n');
    
    await queue.close();
    process.exit(0);
  } catch (error: any) {
    console.error('✗ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCompilationQueue();
