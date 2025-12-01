# Ham Grab

A ranked choice voting app for group decisions. No login required.

Live at: **https://hamgrab.com**

## Features

- **Create polls** with shareable links (choose movie-specific or general poll types)
- **Two-phase voting**: nomination → voting
- **Ranked choice voting** with instant runoff (supports partial rankings)
- **Movie descriptions** automatically fetched for movie polls (powered by Claude API)
- **Mobile-friendly** responsive design with drag-and-drop
- **No authentication** required - just share a link

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: AWS Lambda, API Gateway, DynamoDB
- **Hosting**: S3 + CloudFront
- **Infrastructure**: AWS SAM (Serverless Application Model)

## Project Structure

```
├── frontend/           # React SPA
│   └── src/
│       ├── components/ # UI components
│       ├── api.ts      # API client
│       ├── rcv.ts      # Ranked choice voting algorithm
│       └── types.ts    # TypeScript types
├── backend/            # AWS Lambda functions
│   ├── handlers/       # API handlers
│   └── lib/            # Shared utilities
├── scripts/            # Dev and deploy scripts
├── template.yaml       # AWS SAM template
└── samconfig.toml      # SAM config (gitignored)
```

## Prerequisites

- Node.js 18+
- Docker (for local Lambda emulation)
- AWS CLI (configured with credentials)
- AWS SAM CLI

### Install SAM CLI

```bash
# macOS
brew install aws-sam-cli

# Other platforms: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

## Local Development

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start dev servers

```bash
./scripts/dev.sh
```

This starts:
- SAM local API on `http://localhost:3001` (Lambda + API Gateway emulation)
- Vite dev server on `http://localhost:3000`

### Alternative: Run separately

Terminal 1 (backend):
```bash
sam local start-api --port 3001 --warm-containers EAGER
```

Terminal 2 (frontend):
```bash
cd frontend
npm run dev
```

## Deployment

### First time setup

```bash
# Configure AWS credentials if not already done
aws configure
```

### Deploy

```bash
./scripts/deploy.sh        # Deploy to dev
./scripts/deploy.sh prod   # Deploy to prod
```

The script will:
1. Build and deploy the SAM stack (Lambda, API Gateway, DynamoDB, S3, CloudFront)
2. Build the frontend
3. Upload to S3
4. Invalidate CloudFront cache

### Manual deployment

```bash
# Build SAM
sam build

# Deploy (first time will prompt for config)
sam deploy --guided

# Get outputs
aws cloudformation describe-stacks --stack-name movie-vote-dev --query "Stacks[0].Outputs"

# Build and deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://YOUR_BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Custom Domain

Custom domain is configured for **production only**:

- **Dev**: Uses CloudFront default URL (*.cloudfront.net)
- **Prod**: Uses custom domain (hamgrab.com)
  1. ACM certificate created in us-east-1 for CloudFront
  2. CloudFront aliases configured conditionally in template.yaml
  3. DNS managed via Cloudflare (DNS-only mode, pointing to CloudFront)

## Environment Variables

### Frontend (.env.local for dev)
```
VITE_API_URL=http://localhost:3001
```

Production uses CloudFront to proxy `/polls*` to API Gateway, so no URL is needed.

### Backend (optional)

Create `.env` or `env.json` in the root directory:

```bash
# .env
ANTHROPIC_API_KEY=your_api_key_here  # Optional: for movie descriptions
```

**Note**: The `ANTHROPIC_API_KEY` is only needed if you want automatic movie descriptions. Without it, movie polls will still work but won't fetch descriptions.

## License

MIT
