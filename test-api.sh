#!/bin/bash

# Test script for AikenComp API

BASE_URL="http://localhost:3000"

echo "=== AikenComp API Test Suite ==="
echo ""

# Test 1: Service Info
echo "1. Testing service info endpoint..."
curl -s "$BASE_URL/" | jq '.'
echo ""

# Test 2: Health Check
echo "2. Testing health check..."
curl -s "$BASE_URL/api/health" | jq '.'
echo ""

# Test 3: Submit Compilation Job
echo "3. Submitting compilation job..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/compile" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "validator my_validator {\n  fn spend(_datum: Data, _redeemer: Data, _context: Data) -> Bool {\n    True\n  }\n}"
  }')

echo "$RESPONSE" | jq '.'
JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')
echo ""

# Test 4: Check Job Status
echo "4. Checking job status (waiting for completion)..."
for i in {1..10}; do
  sleep 1
  STATUS_RESPONSE=$(curl -s "$BASE_URL/api/jobs/$JOB_ID")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  echo "   Attempt $i: Status = $STATUS"
  
  if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ]; then
    echo "$STATUS_RESPONSE" | jq '.'
    break
  fi
done
echo ""

# Test 5: List All Jobs
echo "5. Listing all jobs..."
curl -s "$BASE_URL/api/jobs?limit=10" | jq '.'
echo ""

# Test 6: Queue Statistics
echo "6. Getting queue statistics..."
curl -s "$BASE_URL/api/stats" | jq '.'
echo ""

echo "=== Test Suite Complete ==="
