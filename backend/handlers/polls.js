import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { docClient, TABLE_NAME, getTTL } from '../lib/dynamo.js';
import { success, created, badRequest, notFound, forbidden, serverError } from '../lib/response.js';

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
      TTL: getTTL(),
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
