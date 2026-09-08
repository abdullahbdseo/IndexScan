import express from 'express';
import path from 'path';
import fs from 'fs';

export function createSandboxServer(port = 4001) {
  const app = express();
  const siteDir = path.resolve(process.cwd(), 'server/sandbox/site');

  app.use((req, res, next) => {
    res.setHeader('Server', 'ApexSandboxServer/1.0');
    next();
  });

  app.get('/robots.txt', (req, res) => {
    const p = path.join(siteDir, 'robots.txt');
    if (fs.existsSync(p)) res.type('text/plain').send(fs.readFileSync(p, 'utf-8'));
    else res.status(404).send('Not Found');
  });

  app.get('/sitemap.xml', (req, res) => {
    const p = path.join(siteDir, 'sitemap.xml');
    if (fs.existsSync(p)) res.type('application/xml').send(fs.readFileSync(p, 'utf-8'));
    else res.status(404).send('Not Found');
  });

  app.get('/', (req, res) => {
    const p = path.join(siteDir, 'index.html');
    res.type('text/html').send(fs.readFileSync(p, 'utf-8'));
  });

  app.get('/:page', (req, res) => {
    const pageName = req.params.page.replace(/\.html$/, '');
    const p = path.join(siteDir, `${pageName}.html`);
    if (fs.existsSync(p)) {
      res.type('text/html').send(fs.readFileSync(p, 'utf-8'));
    } else {
      res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Page Not Found</h1></body></html>');
    }
  });

  const server = app.listen(port, () => {
    console.log(`[Sandbox] Live test website listening at http://localhost:${port}`);
  });

  return { app, server };
}
