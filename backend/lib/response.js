const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const success = (body) => ({
  statusCode: 200,
  headers,
  body: JSON.stringify(body),
});

export const created = (body) => ({
  statusCode: 201,
  headers,
  body: JSON.stringify(body),
});

export const badRequest = (message) => ({
  statusCode: 400,
  headers,
  body: JSON.stringify({ error: message }),
});

export const notFound = (message = 'Not found') => ({
  statusCode: 404,
  headers,
  body: JSON.stringify({ error: message }),
});

export const forbidden = (message = 'Forbidden') => ({
  statusCode: 403,
  headers,
  body: JSON.stringify({ error: message }),
});

export const serverError = (error) => {
  console.error(error);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ error: 'Internal server error' }),
  };
};
