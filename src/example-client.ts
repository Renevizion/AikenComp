/**
 * Example client for interacting with AikenComp API
 */

interface CompilationRequest {
  code: string;
  options?: {
    optimize?: boolean;
    trace?: boolean;
    validate?: boolean;
  };
}

interface JobStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  result?: any;
  error?: any;
}

class AikenCompClient {
  constructor(private baseUrl: string = 'http://localhost:3000') {}

  async compile(code: string, options?: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit job: ${response.statusText}`);
    }

    const data = await response.json();
    return data.jobId;
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    return await response.json();
  }

  async waitForCompletion(
    jobId: string,
    maxWaitTime: number = 60000,
    pollInterval: number = 1000
  ): Promise<JobStatusResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Timeout waiting for compilation to complete');
  }

  async compileAndWait(code: string, options?: any): Promise<JobStatusResponse> {
    const jobId = await this.compile(code, options);
    return await this.waitForCompletion(jobId);
  }
}

// Example usage
async function main() {
  const client = new AikenCompClient();

  const aikenCode = `
validator my_validator {
  fn spend(_datum: Data, _redeemer: Data, _context: Data) -> Bool {
    True
  }
}
  `.trim();

  console.log('Submitting Aiken code for compilation...\n');

  try {
    const result = await client.compileAndWait(aikenCode, {
      optimize: true,
      validate: true,
    });

    console.log('Compilation Result:');
    console.log('Status:', result.status);
    console.log('Job ID:', result.id);

    if (result.status === 'completed') {
      console.log('\nSuccess!');
      console.log('Duration:', result.result?.duration, 'ms');
      console.log('Output:', result.result?.output);
      
      if (result.result?.warnings?.length > 0) {
        console.log('\nWarnings:');
        result.result.warnings.forEach((w: string) => console.log('  -', w));
      }
      
      if (result.result?.artifacts) {
        console.log('\nArtifacts generated:');
        Object.keys(result.result.artifacts).forEach(key => {
          console.log('  -', key);
        });
      }
    } else if (result.status === 'failed') {
      console.log('\nCompilation failed!');
      console.log('Error:', result.error?.message);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { AikenCompClient };
