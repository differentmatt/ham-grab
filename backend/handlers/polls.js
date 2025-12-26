import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { docClient, TABLE_NAME } from '../lib/dynamo.js';
import { success, created, badRequest, notFound, forbidden, serverError } from '../lib/response.js';

const DAILY_POLL_LIMIT = 50;

// Helper to get today's date in YYYY-MM-DD format
const getTodayDateKey = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Helper to check and increment daily poll counter
const checkAndIncrementDailyCounter = async () => {
  const today = getTodayDateKey();

  try {
    // Atomically increment the counter
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'COUNTER', SK: `DAILY#${today}` },
      UpdateExpression: 'ADD #count :inc',
      ExpressionAttributeNames: {
        '#count': 'count',
      },
      ExpressionAttributeValues: {
        ':inc': 1,
      },
      ReturnValues: 'ALL_NEW',
    }));

    const newCount = result.Attributes?.count || 0;

    // Check if we exceeded the limit
    if (newCount > DAILY_POLL_LIMIT) {
      // Decrement back since we exceeded
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'COUNTER', SK: `DAILY#${today}` },
        UpdateExpression: 'ADD #count :dec',
        ExpressionAttributeNames: {
          '#count': 'count',
        },
        ExpressionAttributeValues: {
          ':dec': -1,
        },
      }));

      return { exceeded: true, count: newCount - 1 };
    }

    return { exceeded: false, count: newCount };
  } catch (error) {
    console.error('Error checking daily counter:', error);
    throw error;
  }
};

// Helper to check for inappropriate content
const containsInappropriateContent = (text) => {
  const blockedPatterns = [
    /xhamster/i,
    /xvideos/i,
    /pornhub/i,
    /xnxx/i,
    /redtube/i,
    /youporn/i,
    /\bporn\b/i,
    /\bxxx\b/i,
    /\bsex\b/i,
    /\badult\b/i,
  ];

  return blockedPatterns.some(pattern => pattern.test(text));
};

// POST /polls - Create a new poll
export const create = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { title, pollType } = body;

    if (!title?.trim()) {
      return badRequest('Title is required');
    }

    if (!pollType || !['movie', 'other'].includes(pollType)) {
      return badRequest('Invalid poll type');
    }

    // Check for inappropriate content
    if (containsInappropriateContent(title)) {
      return badRequest('Poll title contains inappropriate content');
    }

    // Check daily rate limit
    const { exceeded, count } = await checkAndIncrementDailyCounter();

    if (exceeded) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Daily poll creation limit reached. Please try again tomorrow.',
          dailyLimit: DAILY_POLL_LIMIT,
          currentCount: count,
        }),
      };
    }

    const pollId = nanoid(10);
    const adminToken = nanoid(16);

    const poll = {
      PK: `POLL#${pollId}`,
      SK: 'METADATA',
      pollId,
      adminToken,
      title: title.trim(),
      pollType,
      phase: 'nominating',
      createdAt: Date.now(),
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: poll,
    }));

    return created({
      pollId,
      adminToken,
      title: poll.title,
      pollType: poll.pollType,
      phase: poll.phase,
      dailyPollCount: count,
    });
  } catch (error) {
    return serverError(error);
  }
};

// GET /polls/{pollId} - Get poll with movies and votes
export const get = async (event) => {
  try {
    const { pollId } = event.pathParameters || {};
    const adminToken = event.queryStringParameters?.adminToken;

    if (!pollId) {
      return badRequest('Poll ID is required');
    }

    // Query all items for this poll (metadata, movies, votes)
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `POLL#${pollId}`,
      },
    }));

    const items = result.Items || [];
    const metadata = items.find(item => item.SK === 'METADATA');

    if (!metadata) {
      return notFound('Poll not found');
    }

    const isAdmin = adminToken === metadata.adminToken;
    const movies = items
      .filter(item => item.SK.startsWith('MOVIE#'))
      .map(({ PK, SK, TTL, ...movie }) => movie)
      .sort((a, b) => a.addedAt - b.addedAt);

    const votes = items
      .filter(item => item.SK.startsWith('VOTE#'))
      .map(({ PK, SK, TTL, oddsKey, ...vote }) => vote);

    // Only include votes if closed or admin
    const response = {
      pollId: metadata.pollId,
      title: metadata.title,
      pollType: metadata.pollType || 'movie', // Default to 'movie' for backward compatibility
      phase: metadata.phase,
      createdAt: metadata.createdAt,
      movies,
      voteCount: votes.length,
      isAdmin,
    };

    // Include votes only if poll is closed
    if (metadata.phase === 'closed') {
      response.votes = votes;
    }

    // Include admin token if admin
    if (isAdmin) {
      response.adminToken = metadata.adminToken;
    }

    return success(response);
  } catch (error) {
    return serverError(error);
  }
};

// GET /polls/stats - Get daily poll creation stats
export const getStats = async () => {
  try {
    const today = getTodayDateKey();

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'COUNTER', SK: `DAILY#${today}` },
    }));

    const count = result.Item?.count || 0;

    return success({
      dailyPollCount: count,
      dailyLimit: DAILY_POLL_LIMIT,
      date: today,
    });
  } catch (error) {
    return serverError(error);
  }
};

// PUT /polls/{pollId}/phase - Update poll phase (admin only)
export const updatePhase = async (event) => {
  try {
    const { pollId } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { phase, adminToken } = body;

    if (!pollId) {
      return badRequest('Poll ID is required');
    }

    if (!['nominating', 'voting', 'closed'].includes(phase)) {
      return badRequest('Invalid phase');
    }

    // Get current poll to verify admin token
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POLL#${pollId}`, SK: 'METADATA' },
    }));

    if (!result.Item) {
      return notFound('Poll not found');
    }

    if (result.Item.adminToken !== adminToken) {
      return forbidden('Invalid admin token');
    }

    // Update phase
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POLL#${pollId}`, SK: 'METADATA' },
      UpdateExpression: 'SET phase = :phase',
      ExpressionAttributeValues: {
        ':phase': phase,
      },
    }));

    return success({ phase });
  } catch (error) {
    return serverError(error);
  }
};
