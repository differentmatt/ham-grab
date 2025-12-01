#!/bin/bash

# Create the polls table in local DynamoDB

ENDPOINT="http://localhost:8000"
TABLE_NAME="movie-vote-polls-local"

echo "Creating table $TABLE_NAME..."

aws dynamodb create-table \
  --endpoint-url $ENDPOINT \
  --table-name $TABLE_NAME \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --no-cli-pager \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Table created successfully"
else
  echo "ℹ️  Table may already exist (this is fine)"
fi
