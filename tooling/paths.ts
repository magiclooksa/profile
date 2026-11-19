/**
 * Where everything lives, relative to the project root. The one place tooling learns the layout.
 *
 *   pages/         HTML entry points (Vite's root); pages/services/ is generated
 *   public/        files copied as-is into the site: data/, images/, videos/…
 *   public/data/   the content, one JSON file per section
 *   storage/       the server's own files: site releases and earlier versions of documents (not in Git)
 */
import { resolve } from 'node:path';

export const PAGES_DIR = 'pages';
export const PUBLIC_DIR = 'public';
export const DATA_DIR = 'public/data';
export const OUT_DIR = 'dist';
export const STORAGE_DIR = 'storage';

export const projectPaths = (root: string) => ({
  pages: resolve(root, PAGES_DIR),
  public: resolve(root, PUBLIC_DIR),
  data: resolve(root, DATA_DIR),
  out: resolve(root, OUT_DIR),
  src: resolve(root, 'src'),
  releases: resolve(root, STORAGE_DIR, 'releases'),
  history: resolve(root, STORAGE_DIR, 'history'),
  /** An HTML entry point, given its address in the site (e.g. "services/majlis.html"). */
  page: (href: string) => resolve(root, PAGES_DIR, href),
});
