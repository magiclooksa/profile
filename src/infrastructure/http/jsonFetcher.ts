/** Reads one JSON file by its path inside the data folder. Repositories depend on this, not on fetch. */
export type JsonFetcher = (path: string) => Promise<unknown>;

/** Default fetcher: reads files over HTTP from the site's /data folder. */
export const httpFetcher = (baseUrl: string): JsonFetcher => async (file) => {
  const response = await fetch(`${baseUrl}${file}`);
  if (!response.ok) throw new Error(`تعذّر تحميل ${file} (${response.status})`);
  return response.json() as Promise<unknown>;
};
