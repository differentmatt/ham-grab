#!/bin/bash
set -e

STAGE=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🚀 Deploying Movie Vote ($STAGE)"

# Build and deploy SAM stack
echo "📦 Building SAM application..."
sam build

echo "☁️  Deploying to AWS..."
sam deploy \
  --stack-name movie-vote-$STAGE \
  --parameter-overrides Stage=$STAGE AnthropicApiKey="${ANTHROPIC_API_KEY:-}" \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# Get outputs
echo "📋 Getting stack outputs..."
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name movie-vote-$STAGE \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucket'].OutputValue" \
  --output text \
  --region $REGION)

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
  --stack-name movie-vote-$STAGE \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text \
  --region $REGION)

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name movie-vote-$STAGE \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text \
  --region $REGION)

# Build frontend (API is proxied through CloudFront, so no URL needed)
echo "🔨 Building frontend..."
cd frontend
echo "VITE_API_URL=" > .env.production
npm run build

# Deploy frontend to S3
echo "📤 Uploading to S3..."
aws s3 sync dist/ s3://$FRONTEND_BUCKET --delete --region $REGION

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*" > /dev/null

echo ""
echo "✅ Deployment complete!"
if [ "$STAGE" = "prod" ]; then
  echo "🌐 Frontend: https://hamgrab.com"
  echo "🌐 Frontend (CloudFront): $FRONTEND_URL"
else
  echo "🌐 Frontend: $FRONTEND_URL"
fi
echo ""
echo "Note: CloudFront may take a few minutes to propagate globally."
