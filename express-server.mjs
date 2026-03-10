/**
 * Express server for Hydrogen storefront (EC2 / Node.js deployment)
 *
 * Run: npm run build && npm run start:node
 */
import 'dotenv/config';

// Polyfill Web Cache API for Node (required by Hydrogen context)
if (!globalThis.caches) {
  class NodeCache {
    async match() { return undefined; }
    async put() {}
    async delete() { return false; }
    async keys() { return []; }
  }
  globalThis.caches = {
    open: async () => new NodeCache(),
  };
}
import {createRequestHandler} from '@react-router/express';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import {createHydrogenContext, InMemoryCache} from '@shopify/hydrogen';
import {AppSession} from './app/lib/session.js';
import {CART_QUERY_FRAGMENT} from './app/lib/fragments.js';

const getEnv = () => process.env;

const __dirname = import.meta.dirname;

let vite;
if (process.env.NODE_ENV !== 'production') {
  const {createServer} = await import('vite');
  vite = await createServer({
    server: {middlewareMode: true},
    configFile: 'vite.config.js',
  });
}

const app = express();
app.use(compression());
app.disable('x-powered-by');

// Assets
if (vite) {
  app.use(vite.middlewares);
} else {
  app.use(morgan('tiny'));
  app.use(
    '/assets',
    express.static('dist/client/assets', {immutable: true, maxAge: '1y'}),
  );
}
app.use(express.static('dist/client', {maxAge: '1h'}));
app.get('/favicon.ico', (_req, res) => res.redirect(302, '/favicon.svg'));

// Create Hydrogen context for Node.js
async function getContext(req) {
  const env = getEnv();
  const url = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await getRequestBody(req) : undefined,
  });

  const [cache, session] = await Promise.all([
    Promise.resolve(new InMemoryCache()),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil: () => {},
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {queryFragment: CART_QUERY_FRAGMENT},
    },
    {},
  );

  return hydrogenContext;
}

async function getRequestBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Request handler - use Workers fetch handler (production) or Vite SSR (dev)
async function handleRequest(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      // Production: use the built Oxygen-style fetch handler
      const worker = await import('./dist/server/index.js');
      const env = Object.assign({}, process.env);
      const executionContext = {waitUntil: () => {}};
      const url = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl}`;
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? await getRequestBody(req) : undefined,
      });

      const response = await worker.default.fetch(request, env, executionContext);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    } else {
      // Development: use React Router Express handler
      const context = await getContext(req);
      const handler = createRequestHandler({
        build: () => vite.ssrLoadModule('virtual:react-router/server-build'),
        mode: process.env.NODE_ENV,
        getLoadContext: () => context,
      });
      return handler(req, res, next);
    }
  } catch (error) {
    next(error);
  }
}

app.all('*', handleRequest);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Express server listening on http://localhost:${port}`);
});
