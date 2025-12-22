# AikenComp

A standalone Aiken compilation API service with job queue management and status tracking. This service provides a REST API for compiling Aiken smart contracts outside of a sandbox environment.

## Features

- 🚀 **Standalone Compilation API**: REST API for Aiken smart contract compilation
- 📦 **Pre-cached Stdlib**: Integrated Aiken standard library support
- 🔄 **Job Queue System**: Bull-based job queue with Redis for handling compilation requests
- 📊 **Status Tracking**: Real-time compilation status tracking and progress monitoring
- ⚠️ **Error Reporting**: Comprehensive error reporting with detailed compilation messages
- 🐳 **Docker Support**: Containerized deployment with Docker Compose

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  REST API   │────▶│  Job Queue   │────▶│   Aiken     │
│  (Express)  │     │   (Bull)     │     │  Compiler   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │  (Storage)   │
                    └──────────────┘
```

## Installation

### Prerequisites

- Node.js 18+ 
- Redis server
- (Optional) Aiken CLI for actual compilation

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start Redis (if not running)
redis-server

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### 1. Service Information
```http
GET /
```

Returns service metadata and available endpoints.

**Response:**
```json
{
  "service": "AikenComp Compilation API",
  "version": "1.0.0",
  "description": "Standalone Aiken compilation API with job queue and status tracking",
  "endpoints": {
    "health": "/api/health",
    "compile": "POST /api/compile",
    "jobStatus": "GET /api/jobs/:jobId",
    "jobs": "GET /api/jobs",
    "stats": "GET /api/stats"
  }
}
```

#### 2. Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1703261234567,
  "service": "AikenComp Compilation API"
}
```

#### 3. Submit Compilation Job
```http
POST /api/compile
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "validator my_validator {\n  fn spend(_datum: Data, _redeemer: Data, _context: Data) -> Bool {\n    True\n  }\n}",
  "options": {
    "optimize": true,
    "trace": false,
    "validate": true
  }
}
```

**Response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Compilation job submitted",
  "statusUrl": "/api/jobs/123e4567-e89b-12d3-a456-426614174000"
}
```

#### 4. Get Job Status
```http
GET /api/jobs/:jobId
```

**Response (Completed):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "timestamp": 1703261234567,
  "result": {
    "success": true,
    "output": "Compilation successful",
    "artifacts": {
      "plutusScript": "{...}",
      "blueprint": {...}
    },
    "warnings": [],
    "duration": 1234
  }
}
```

**Response (Failed):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "failed",
  "timestamp": 1703261234567,
  "error": {
    "message": "Compilation failed",
    "code": "SYNTAX_ERROR",
    "details": {...}
  }
}
```

#### 5. List All Jobs
```http
GET /api/jobs?limit=50&offset=0
```

**Response:**
```json
{
  "jobs": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### 6. Queue Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 93,
  "failed": 3,
  "total": 103
}
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `CACHE_DIR` | `./cache` | Compilation cache directory |
| `STDLIB_PATH` | `./stdlib` | Aiken stdlib path |

## Job Statuses

- **pending**: Job is queued and waiting to be processed
- **processing**: Job is currently being compiled
- **completed**: Compilation finished successfully
- **failed**: Compilation failed with errors

## Example Usage

### Using cURL

```bash
# Submit a compilation job
curl -X POST http://localhost:3000/api/compile \
  -H "Content-Type: application/json" \
  -d '{
    "code": "validator my_validator {\n  fn spend(_datum: Data, _redeemer: Data, _context: Data) -> Bool {\n    True\n  }\n}"
  }'

# Check job status
curl http://localhost:3000/api/jobs/{jobId}

# Get queue stats
curl http://localhost:3000/api/stats
```

### Using JavaScript/TypeScript

```typescript
// Submit compilation
const response = await fetch('http://localhost:3000/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `validator my_validator {
      fn spend(_datum: Data, _redeemer: Data, _context: Data) -> Bool {
        True
      }
    }`
  })
});

const { jobId } = await response.json();

// Poll for status
const checkStatus = async () => {
  const statusResponse = await fetch(`http://localhost:3000/api/jobs/${jobId}`);
  const job = await statusResponse.json();
  
  if (job.status === 'completed') {
    console.log('Compilation successful:', job.result);
  } else if (job.status === 'failed') {
    console.error('Compilation failed:', job.error);
  } else {
    setTimeout(checkStatus, 1000); // Check again in 1 second
  }
};

checkStatus();
```

## Development

### Project Structure

```
.
├── src/
│   ├── api/           # Express API server and routes
│   ├── compiler/      # Aiken compiler integration
│   ├── queue/         # Job queue management
│   ├── types/         # TypeScript type definitions
│   └── index.ts       # Application entry point
├── cache/             # Compilation cache directory
├── stdlib/            # Aiken stdlib (pre-cached)
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose setup
└── package.json       # Node.js dependencies
```

### Running Tests

```bash
npm test
```

### Code Style

```bash
npm run lint
```

## Production Deployment

### With Docker

```bash
# Build production image
docker build -t aikencomp .

# Run container
docker run -d \
  -p 3000:3000 \
  -e REDIS_URL=redis://redis:6379 \
  --name aikencomp \
  aikencomp
```

### With Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

## Aiken CLI Integration

The service works in two modes:

1. **With Aiken CLI**: If Aiken is installed, actual compilation will be performed
2. **Mock Mode**: If Aiken is not available, returns mock compilation results for testing

To use actual compilation, install Aiken CLI:

```bash
curl -sSfL https://install.aiken-lang.org | bash
```

## Troubleshooting

### Redis Connection Issues

Ensure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Port Already in Use

Change the port in `.env`:
```
PORT=3001
```

### Compilation Timeouts

Increase timeout in `src/compiler/AikenCompiler.ts`:
```typescript
timeout: 60000, // 60 seconds
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

ISC