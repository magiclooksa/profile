/** The dashboard's addresses live in the URL hash: #/ for the overview, #/doc/<path> for a document. */
export type Route = { readonly name: 'overview' } | { readonly name: 'document'; readonly path: string };

const DOC = '#/doc/';

export const documentHref = (path: string): string => `${DOC}${encodeURIComponent(path)}`;

export function parseRoute(hash: string): Route {
  if (hash.startsWith(DOC)) {
    const path = decodeURIComponent(hash.slice(DOC.length));
    if (path) return { name: 'document', path };
  }
  return { name: 'overview' };
}
