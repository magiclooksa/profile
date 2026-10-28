import { MongoClient, type Db } from 'mongodb';
import { adoptLegacyGridFiles } from './storage';

/** Connects to MongoDB and makes sure the indexes the API relies on exist. */
export async function connect(uri: string, dbName: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  await Promise.all([
    db.collection('content_history').createIndex({ key: 1, savedAt: -1 }),
    db.collection('messages').createIndex({ createdAt: -1 }),
    db.collection('files').createIndex({ folder: 1, name: 1 }),
    db.collection('files').createIndex({ uploadedAt: -1 }),
    db.collection('files').createIndex({ sourcePath: 1 }, { sparse: true }),
  ]);
  // Files uploaded before the storage module (kept in GridFS) get their details added once.
  const adopted = await adoptLegacyGridFiles(db);
  if (adopted) console.log(`أُضيفت تفاصيل ${adopted} ملف سابق إلى مكتبة الملفات`);
  return { client, db };
}
