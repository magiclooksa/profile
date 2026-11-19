/**
 * The dashboard's API in development (`npm run dashboard`): the same handler as the production
 * server (server/content/contentHandler.ts), without sign-in, since the dev server is local.
 */
import type { Plugin } from 'vite';
import { ContentFiles } from '../../server/content/ContentFiles';
import { CONTENT_API, createContentHandler } from '../../server/content/contentHandler';
import { openGate } from '../../server/http/auth';
import { DevPublisher } from '../../server/publish/Publisher';
import { projectPaths } from '../paths';

export function contentApiPlugin(root: string): Plugin {
  const paths = projectPaths(root);
  const handle = createContentHandler({
    files: new ContentFiles({ data: paths.data, public: paths.public, history: paths.history }),
    publisher: new DevPublisher(root),
    gate: openGate,
  });
  return {
    name: 'magic-look-content-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(CONTENT_API, (req, res) => {
        // Connect strips the mount path; the handler routes on the full one.
        req.url = `${CONTENT_API}${req.url ?? ''}`;
        void handle(req, res);
      });
    },
  };
}
