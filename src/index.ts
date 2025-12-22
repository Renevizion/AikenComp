import dotenv from 'dotenv';
import { ApiServer } from './api/server';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function main() {
  console.log('Starting AikenComp Compilation API...');
  
  const server = new ApiServer(PORT, REDIS_URL);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  await server.start();
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
