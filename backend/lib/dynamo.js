import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.AWS_SAM_LOCAL === 'true';

// For local development, use a simpler client config
const localConfig = isLocal ? {
  endpoint: 'http://host.docker.internal:8000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
} : {};

const client = new DynamoDBClient(localConfig);

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.POLLS_TABLE || 'movie-vote-polls-local';

// TTL: polls expire after 30 days
export const getTTL = () => Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
