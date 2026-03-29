import { openDB, type IDBPDatabase } from "idb";
import type { StoredChart } from "./types.js";

const DEFAULT_DB_NAME = "astro-chart-cache";
const DB_VERSION = 1;
const STORE_NAME = "charts";

function openChartDb(dbName: string): Promise<IDBPDatabase> {
  return openDB(dbName, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    },
  });
}

export class ChartCache {
  private readonly dbName: string;

  constructor(dbName = DEFAULT_DB_NAME) {
    this.dbName = dbName;
  }

  private getDb(): Promise<IDBPDatabase> {
    return openChartDb(this.dbName);
  }

  async get(id: string): Promise<StoredChart | undefined> {
    const db = await this.getDb();
    return db.get(STORE_NAME, id) as Promise<StoredChart | undefined>;
  }

  async set(chart: StoredChart): Promise<void> {
    const db = await this.getDb();
    await db.put(STORE_NAME, chart);
  }

  async getAll(): Promise<StoredChart[]> {
    const db = await this.getDb();
    return db.getAll(STORE_NAME) as Promise<StoredChart[]>;
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(STORE_NAME, id);
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    await db.clear(STORE_NAME);
  }

  async count(): Promise<number> {
    const db = await this.getDb();
    return db.count(STORE_NAME);
  }
}

export const chartCache = new ChartCache();
