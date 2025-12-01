import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const command = new CreateTableCommand({
  TableName: 'movie-vote-polls-local',
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
  ],
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ],
  BillingMode: 'PAY_PER_REQUEST',
});

try {
  const response = await client.send(command);
  console.log('✅ Table created successfully');
} catch (error) {
  if (error.name === 'ResourceInUseException') {
    console.log('ℹ️  Table already exists');
  } else {
    console.error('❌ Error:', error.message);
  }
}
