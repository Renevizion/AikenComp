import { AikenCompiler } from '../compiler/AikenCompiler';

describe('AikenCompiler', () => {
  let compiler: AikenCompiler;

  beforeEach(() => {
    compiler = new AikenCompiler('/tmp/test-cache', '/tmp/test-stdlib');
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(compiler.initialize()).resolves.not.toThrow();
    });
  });

  describe('compilation', () => {
    it('should compile simple Aiken code', async () => {
      await compiler.initialize();
      
      const result = await compiler.compile(
        'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should return compilation output', async () => {
      await compiler.initialize();
      
      const result = await compiler.compile(
        'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }'
      );

      expect(result.output).toBeDefined();
      expect(typeof result.output).toBe('string');
    });

    it('should include warnings in result', async () => {
      await compiler.initialize();
      
      const result = await compiler.compile(
        'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }'
      );

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include artifacts in result', async () => {
      await compiler.initialize();
      
      const result = await compiler.compile(
        'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }'
      );

      expect(result.artifacts).toBeDefined();
    });

    it('should respect compilation options', async () => {
      await compiler.initialize();
      
      const result = await compiler.compile(
        'validator test { fn spend(_d: Data, _r: Data, _c: Data) -> Bool { True } }',
        { optimize: true, validate: true }
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
