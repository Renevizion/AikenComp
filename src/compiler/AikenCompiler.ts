import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CompilationOptions, CompilationResult, CompilationArtifacts } from '../types';

const execAsync = promisify(exec);

export class AikenCompiler {
  private cacheDir: string;
  private stdlibPath: string;

  constructor(cacheDir: string = './cache', stdlibPath: string = './stdlib') {
    this.cacheDir = path.resolve(cacheDir);
    this.stdlibPath = path.resolve(stdlibPath);
  }

  async initialize(): Promise<void> {
    // Ensure cache and stdlib directories exist
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(this.stdlibPath, { recursive: true });
    
    // Check if Aiken CLI is available (cross-platform)
    try {
      const command = process.platform === 'win32' ? 'where aiken' : 'which aiken';
      await execAsync(command);
    } catch (error) {
      console.warn('Aiken CLI not found in PATH. Using mock compilation mode.');
    }
  }

  async compile(code: string, options: CompilationOptions = {}): Promise<CompilationResult> {
    const startTime = Date.now();
    const workDir = path.join(this.cacheDir, uuidv4());
    
    try {
      // Create temporary work directory
      await fs.mkdir(workDir, { recursive: true });
      
      // Create Aiken project structure
      await this.setupProjectStructure(workDir, code);
      
      // Run compilation
      const result = await this.runCompilation(workDir, options);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        output: result.output,
        artifacts: result.artifacts,
        warnings: result.warnings,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      throw {
        success: false,
        output: error.message,
        duration,
      };
    } finally {
      // Cleanup work directory
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to cleanup work directory:', cleanupError);
      }
    }
  }

  private async setupProjectStructure(workDir: string, code: string): Promise<void> {
    // Create aiken.toml
    const aikenToml = `
name = "compilation_job"
version = "0.0.0"
plutus = "v2"
compiler = "v1.0.0"

[[dependencies]]
name = "aiken-lang/stdlib"
version = "1.9.0"
source = "github"
`;
    await fs.writeFile(path.join(workDir, 'aiken.toml'), aikenToml.trim());
    
    // Create validators directory and main file
    const validatorsDir = path.join(workDir, 'validators');
    await fs.mkdir(validatorsDir, { recursive: true });
    await fs.writeFile(path.join(validatorsDir, 'contract.ak'), code);
    
    // Link or copy stdlib if available
    try {
      const libDir = path.join(workDir, 'lib');
      await fs.mkdir(libDir, { recursive: true });
    } catch (error) {
      // Ignore if lib directory creation fails
    }
  }

  private async runCompilation(
    workDir: string,
    options: CompilationOptions
  ): Promise<{ output: string; artifacts?: CompilationArtifacts; warnings?: string[] }> {
    try {
      // Validate workDir to prevent command injection
      const normalizedPath = path.normalize(workDir);
      const normalizedCacheDir = path.resolve(this.cacheDir);
      
      if (!normalizedPath.startsWith(normalizedCacheDir)) {
        throw new Error('Invalid work directory');
      }
      
      // Try to use actual Aiken CLI
      const buildCommand = process.platform === 'win32'
        ? `cd /d "${normalizedPath}" && aiken build`
        : `cd "${normalizedPath}" && aiken build`;
      
      const { stdout, stderr } = await execAsync(buildCommand, {
        timeout: 30000, // 30 second timeout
      });
      
      // Parse build output
      const output = stdout + (stderr || '');
      const warnings = this.parseWarnings(output);
      
      // Try to read artifacts
      const artifacts = await this.readArtifacts(normalizedPath);
      
      return {
        output,
        artifacts,
        warnings,
      };
    } catch (error: any) {
      // If Aiken CLI is not available, return mock success
      if (error.code === 'ENOENT' || error.message.includes('aiken: not found') || error.message.includes('is not recognized')) {
        return this.mockCompilation();
      }
      throw error;
    }
  }

  private async readArtifacts(workDir: string): Promise<CompilationArtifacts | undefined> {
    try {
      const plutusJsonPath = path.join(workDir, 'plutus.json');
      const blueprintPath = path.join(workDir, 'plutus-blueprint.json');
      
      const artifacts: CompilationArtifacts = {};
      
      try {
        const plutusData = await fs.readFile(plutusJsonPath, 'utf-8');
        artifacts.plutusScript = plutusData;
      } catch {}
      
      try {
        const blueprintData = await fs.readFile(blueprintPath, 'utf-8');
        artifacts.blueprint = JSON.parse(blueprintData);
      } catch {}
      
      return Object.keys(artifacts).length > 0 ? artifacts : undefined;
    } catch {
      return undefined;
    }
  }

  private parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('warning:') || line.includes('Warning:')) {
        warnings.push(line.trim());
      }
    }
    
    return warnings;
  }

  private mockCompilation(): { output: string; artifacts?: CompilationArtifacts; warnings?: string[] } {
    return {
      output: 'Mock compilation successful (Aiken CLI not available)',
      artifacts: {
        plutusScript: '{"type": "PlutusScriptV2", "description": "Mock compiled script"}',
        blueprint: {
          preamble: {
            title: 'Mock Contract',
            version: '1.0.0',
          },
        },
      },
      warnings: ['Warning: Using mock compilation - Aiken CLI not installed'],
    };
  }
}
