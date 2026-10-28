import { MongoClient, type Db } from 'mongodb';

/** Connects to MongoDB and makes sure the indexes the API relies on exist. */
export async function connect(uri: string, dbName: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  await Promise.all([
    db.collection('content_history').createIndex({ key: 1, savedAt: -1 }),
    db.collection('messages').createIndex({ createdAt: -1 }),
    db.collection('media.files').createIndex({ uploadDate: -1 }),
    db.collection('media.files').createIndex({ 'metadata.sourcePath': 1 }, { sparse: true }),
  ]);
  return { client, db };
}
