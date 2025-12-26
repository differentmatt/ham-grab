import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { docClient, TABLE_NAME } from '../lib/dynamo.js';
import { success, created, badRequest, notFound, serverError } from '../lib/response.js';

// POST /polls/{pollId}/votes - Submit or update a vote
export const submit = async (event) => {
  try {
    const { pollId } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { oddsKey, nickname, rankings } = body;

    if (!pollId) {
      return badRequest('Poll ID is required');
    }

    if (!oddsKey) {
      return badRequest('Voter key is required');
    }

    if (!nickname?.trim()) {
      return badRequest('Nickname is required');
    }

    if (!Array.isArray(rankings) || rankings.length === 0) {
      return badRequest('Rankings are required');
    }

    // Check poll exists and is in voting phase
    const pollResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POLL#${pollId}`, SK: 'METADATA' },
    }));

    if (!pollResult.Item) {
      return notFound('Poll not found');
    }

    if (pollResult.Item.phase !== 'voting') {
      return badRequest('Poll is not accepting votes');
    }

    // Get all movies to validate rankings
    const moviesResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `POLL#${pollId}`,
        ':sk': 'MOVIE#',
      },
    }));

    const validMovieIds = new Set((moviesResult.Items || []).map(m => m.movieId));
    const validRankings = rankings.filter(id => validMovieIds.has(id));

    if (validRankings.length === 0) {
      return badRequest('No valid movies in rankings');
    }

    // Delete existing vote from this oddsKey (if any)
    const existingVotes = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'oddsKey = :oddsKey',
      ExpressionAttributeValues: {
        ':pk': `POLL#${pollId}`,
        ':sk': 'VOTE#',
        ':oddsKey': oddsKey,
      },
    }));

    for (const existingVote of existingVotes.Items || []) {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: existingVote.PK, SK: existingVote.SK },
      }));
    }

    // Create new vote
    const voteId = nanoid(10);

    const vote = {
      PK: `POLL#${pollId}`,
      SK: `VOTE#${voteId}`,
      voteId,
      oddsKey, // Used to identify browser, not exposed in results
      nickname: nickname.trim(),
      rankings: validRankings,
      submittedAt: Date.now(),
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: vote,
    }));

    return created({
      voteId,
      nickname: vote.nickname,
      rankings: vote.rankings,
    });
  } catch (error) {
    return serverError(error);
  }
};
