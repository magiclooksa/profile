import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiContent } from './api';

const fallback = vi.fn(async (file: string) => ({ from: 'file', file }));
const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); fallback.mockClear() });

describe('ApiContent', () => {
  it('reads sections from the server in one request, and missing ones from the files', async () => {
    const fetchMock = vi.fn(async () => json({ journey: { from: 'db' } }));
    vi.stubGlobal('fetch', fetchMock);
    const content = new ApiContent('/', fallback);
    expect(await content.fetcher('journey.json')).toEqual({ from: 'db' });
    expect(await content.fetcher('levels.json')).toEqual({ from: 'file', file: 'levels.json' });
    expect(await content.online()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the files when there is no server (static hosting)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Not found</html>', { status: 404 })));
    const content = new ApiContent('/', fallback);
    expect(await content.fetcher('journey.json')).toEqual({ from: 'file', file: 'journey.json' });
    expect(await content.online()).toBe(false);
  });

  it('falls back to the files when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }));
    const content = new ApiContent('/', fallback);
    expect(await content.fetcher('company.json')).toEqual({ from: 'file', file: 'company.json' });
  });
});
