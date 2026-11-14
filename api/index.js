import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const app = require('../server/app.cjs');

export default function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const apiPath = url.searchParams.get('__api_path');

  if (apiPath !== null) {
    url.searchParams.delete('__api_path');
    req.url = `/api/${apiPath}${url.search}`;
  }

  return app(req, res);
}
