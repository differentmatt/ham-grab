#!/bin/bash

# Start both backend (SAM) and frontend (Vite) for local development

# Check for Docker
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Check for SAM CLI
if ! command -v sam &> /dev/null; then
  echo "❌ SAM CLI not found. Install it with:"
  echo "   brew install aws-sam-cli"
  exit 1
fi

echo "🚀 Starting local development environment..."
echo ""

# Load environment variables from .env
# Note: API keys should be stored in .env (not committed to git)
# See .env.example for required variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Generate env.json for SAM from environment variables
# This file is auto-generated and should not contain hardcoded secrets
cat > env.json <<EOF
{
  "CreatePollFunction": {
    "POLLS_TABLE": "movie-vote-polls-local"
  },
  "GetPollFunction": {
    "POLLS_TABLE": "movie-vote-polls-local"
  },
  "GetPollStatsFunction": {
    "POLLS_TABLE": "movie-vote-polls-local"
  },
  "UpdatePollPhaseFunction": {
    "POLLS_TABLE": "movie-vote-polls-local"
  },
  "AddMovieFunction": {
    "POLLS_TABLE": "movie-vote-polls-local",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY:-}"
  },
  "RemoveMovieFunction": {
    "POLLS_TABLE": "movie-vote-polls-local"
  },
  "SubmitVoteFunction": {
    "POLLS_TABLE": "movie-vote-polls-local"
  }
}
EOF

# Start DynamoDB Local
echo "🗄️  Starting DynamoDB Local..."
docker-compose up -d

# Wait for DynamoDB to be ready
sleep 2

# Create table
echo "📋 Setting up local database..."
./scripts/setup-local-db.sh

# Build SAM
echo "📦 Building SAM application..."
sam build

# Start SAM in background
echo "🔧 Starting SAM local API on port 3001..."
sam local start-api \
  --port 3001 \
  --warm-containers EAGER \
  --docker-network movie-vote_movie-vote-network \
  --parameter-overrides "Stage=local" \
  --env-vars env.json \
  &
SAM_PID=$!

# Wait for SAM to be ready
sleep 5

# Start frontend
echo "⚛️  Starting frontend on port 3000..."
cd frontend
npm run dev &
VITE_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $SAM_PID 2>/dev/null
  kill $VITE_PID 2>/dev/null
  echo "💡 DynamoDB Local still running. Stop with: docker-compose down"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "✅ Development servers running:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:3001"
echo "   DynamoDB:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop."

# Wait for both processes
wait
