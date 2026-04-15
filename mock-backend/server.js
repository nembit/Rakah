const http = require('node:http');
const { URL } = require('node:url');

const port = Number(process.env.PORT || 4000);

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return json(res, 400, { error: 'Invalid request URL' });
  }

  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, service: 'mock-backend' });
  }

  if (req.method === 'POST' && url.pathname === '/api/upload') {
    const contentType = String(req.headers['content-type'] || '');
    const body = await readBody(req);

    let mimeType = null;
    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body.toString('utf8') || '{}');
        if (typeof parsed.mimeType === 'string') mimeType = parsed.mimeType;
      } catch {
        // Keep response resilient for malformed payloads.
      }
    } else if (contentType.includes('image/')) {
      mimeType = contentType.split(';')[0];
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return json(res, 200, {
      url: `https://example.invalid/mock-upload/${id}`,
      mimeType,
      mocked: true,
    });
  }

  if (req.method === 'POST' && url.pathname === '/logs') {
    return json(res, 200, { success: true, mocked: true });
  }

  return json(res, 404, { error: 'Not found', path: url.pathname });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[mock-backend] listening on http://0.0.0.0:${port}`);
  console.log('[mock-backend] health endpoint: GET /health');
  console.log('[mock-backend] upload endpoint: POST /api/upload');
  console.log('[mock-backend] logs endpoint: POST /logs');
});
