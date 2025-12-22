export interface CompilationJob {
  id: string;
  status: JobStatus;
  code: string;
  timestamp: number;
  result?: CompilationResult;
  error?: CompilationError;
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface CompilationResult {
  success: boolean;
  output?: string;
  artifacts?: CompilationArtifacts;
  warnings?: string[];
  duration: number;
}

export interface CompilationArtifacts {
  plutusScript?: string;
  blueprint?: any;
  uplc?: string;
}

export interface CompilationError {
  message: string;
  code?: string;
  details?: any;
  stack?: string;
}

export interface CompilationRequest {
  code: string;
  options?: CompilationOptions;
}

export interface CompilationOptions {
  optimize?: boolean;
  trace?: boolean;
  validate?: boolean;
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  timestamp: number;
  result?: CompilationResult;
  error?: CompilationError;
}
