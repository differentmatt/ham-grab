import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import Anthropic from '@anthropic-ai/sdk';
import { docClient, TABLE_NAME } from '../lib/dynamo.js';
import { success, created, badRequest, notFound, forbidden, serverError } from '../lib/response.js';

// Fetch movie description from Anthropic API with timeout
// Returns: { success: true, description: string } | { success: false, attempted: true } | null
async function fetchMovieDescription(movieTitle) {
  // Skip if no API key configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('No Anthropic API key configured, skipping description fetch');
    return null;
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 5000, // 5 second timeout
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Provide a single sentence description of the movie "${movieTitle}". Just the description, no preamble.`
      }]
    });

    const description = message.content[0]?.text?.trim();

    if (!description) {
      return { success: false, attempted: true };
    }

    // Check if the response indicates the AI doesn't know the movie
    const unknownPhrases = [
      "don't have any information",
      "don't have information",
      "no information",
      "not familiar",
      "don't know",
      "cannot find",
      "can't find",
      "unable to provide",
      "not aware of"
    ];

    const lowerDesc = description.toLowerCase();
    const isUnknown = unknownPhrases.some(phrase => lowerDesc.includes(phrase));

    if (isUnknown) {
      console.log(`Movie "${movieTitle}" not recognized by AI`);
      return { success: false, attempted: true };
    }

    return { success: true, description };
  } catch (error) {
    // Log but don't throw - graceful degradation
    console.error('Failed to fetch movie description:', error.message);
    return { success: false, attempted: true };
  }
}

// POST /polls/{pollId}/movies - Add a movie
export const add = async (event) => {
  try {
    const { pollId } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { title, addedBy } = body;

    if (!pollId) {
      return badRequest('Poll ID is required');
    }

    if (!title?.trim()) {
      return badRequest('Movie title is required');
    }

    if (!addedBy?.trim()) {
      return badRequest('Your name is required');
    }

    // Check poll exists and is in nominating phase
    const pollResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POLL#${pollId}`, SK: 'METADATA' },
    }));

    if (!pollResult.Item) {
      return notFound('Poll not found');
    }

    if (pollResult.Item.phase !== 'nominating') {
      return badRequest('Poll is not accepting nominations');
    }

    // Check for duplicate movies (case insensitive)
    const moviesResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `POLL#${pollId}`,
        ':sk': 'MOVIE#',
      },
    }));

    const normalizedTitle = title.trim().toLowerCase();
    const existingMovie = moviesResult.Items?.find(
      movie => movie.title.toLowerCase() === normalizedTitle
    );

    if (existingMovie) {
      return badRequest(`"${existingMovie.title}" has already been added`);
    }

    // Check if poll already has 20 entries
    const movieCount = moviesResult.Items?.length || 0;
    if (movieCount >= 20) {
      return badRequest('Poll already has the maximum of 20 entries');
    }

    const movieId = nanoid(10);
    const addedAt = Date.now();

    // Fetch movie description from Anthropic API only if poll type is 'movie'
    const isMoviePoll = pollResult.Item.pollType === 'movie';
    const descriptionResult = isMoviePoll ? await fetchMovieDescription(title.trim()) : null;

    const movie = {
      PK: `POLL#${pollId}`,
      SK: `MOVIE#${movieId}`,
      movieId,
      title: title.trim(),
      addedBy: addedBy.trim(),
      addedAt,
    };

    // Add description if successfully fetched (only for movie polls)
    if (descriptionResult?.success) {
      movie.description = descriptionResult.description;
      movie.descriptionFetchedAt = addedAt;
    } else if (descriptionResult?.attempted) {
      // Mark that we tried but failed (so we don't retry)
      movie.descriptionAttempted = true;
      movie.descriptionAttemptedAt = addedAt;
    }

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: movie,
    }));

    const response = {
      movieId,
      title: movie.title,
      addedBy: movie.addedBy,
      addedAt: movie.addedAt,
    };

    // Include description in response if available
    if (movie.description) {
      response.description = movie.description;
      response.descriptionFetchedAt = movie.descriptionFetchedAt;
    }

    return created(response);
  } catch (error) {
    return serverError(error);
  }
};

// DELETE /polls/{pollId}/movies/{movieId} - Remove a movie (admin only)
export const remove = async (event) => {
  try {
    const { pollId, movieId } = event.pathParameters || {};
    const adminToken = event.queryStringParameters?.adminToken;

    if (!pollId || !movieId) {
      return badRequest('Poll ID and Movie ID are required');
    }

    // Check poll exists and verify admin
    const pollResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POLL#${pollId}`, SK: 'METADATA' },
    }));

    if (!pollResult.Item) {
      return notFound('Poll not found');
    }

    if (pollResult.Item.adminToken !== adminToken) {
      return forbidden('Invalid admin token');
    }

    if (pollResult.Item.phase !== 'nominating') {
      return badRequest('Can only remove movies during nomination phase');
    }

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POLL#${pollId}`, SK: `MOVIE#${movieId}` },
    }));

    return success({ deleted: true });
  } catch (error) {
    return serverError(error);
  }
};
