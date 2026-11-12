import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { SyncOperation } from '../types';

let dbInstance: any = null;

// In-memory fallback for web preview or SQLite error
const memoryStore = {
  questions: new Map<string, any>(),
  memories: new Map<string, any>(),
  drawings: new Map<string, any>(),
  loveNotes: new Map<string, any>(),
  photos: new Map<string, any>(),
  messages: new Map<string, any>(),
  queue: new Map<string, SyncOperation>(),
};

async function getDB() {
  if (Platform.OS === 'web') return null;
  if (!dbInstance) {
    try {
      dbInstance = await SQLite.openDatabaseAsync('togetherly.db');
      await initTables(dbInstance);
    } catch {
      dbInstance = null;
    }
  }
  return dbInstance;
}

async function initTables(db: any) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cached_questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT,
      intimacyLevel INTEGER,
      bothAnswered INTEGER,
      payloadJson TEXT,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS cached_memories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      type TEXT,
      mediaUrl TEXT,
      metadata TEXT,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS cached_drawings (
      id TEXT PRIMARY KEY,
      title TEXT,
      canvasData TEXT,
      previewUrl TEXT,
      stickyNotes TEXT,
      isLocalDraft INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS cached_love_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      unlockCondition TEXT,
      theme TEXT,
      isOpened INTEGER,
      isLocalDraft INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS cached_photos (
      id TEXT PRIMARY KEY,
      photoUrl TEXT,
      prompt TEXT,
      caption TEXT,
      isLocalDraft INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS cached_messages (
      id TEXT PRIMARY KEY,
      text TEXT,
      mediaUrl TEXT,
      isRead INTEGER,
      isLocalDraft INTEGER,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS offline_operations_queue (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      data TEXT,
      idempotencyKey TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      retryCount INTEGER NOT NULL DEFAULT 0,
      lastError TEXT
    );
  `);
}

export const offlineStorage = {
  // DAILY QUESTIONS
  saveDailyQuestion: async (question: any) => {
    memoryStore.questions.set(question.id, question);
    const db = await getDB();
    if (!db) return;
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_questions (id, text, category, intimacyLevel, bothAnswered, payloadJson, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          question.id,
          question.text,
          question.category || 'General',
          question.intimacyLevel || 1,
          question.bothAnswered ? 1 : 0,
          JSON.stringify(question),
          Date.now(),
        ]
      );
    } catch {}
  },

  getCachedQuestions: async (): Promise<any[]> => {
    const db = await getDB();
    if (!db) return Array.from(memoryStore.questions.values());
    try {
      const rows: any[] = await db.getAllAsync(`SELECT payloadJson FROM cached_questions ORDER BY updatedAt DESC`);
      return rows.map((r) => JSON.parse(r.payloadJson));
    } catch {
      return Array.from(memoryStore.questions.values());
    }
  },

  // MEMORIES
  saveMemories: async (memories: any[]) => {
    memories.forEach((m) => memoryStore.memories.set(m.id, m));
    const db = await getDB();
    if (!db) return;
    try {
      for (const m of memories) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_memories (id, title, description, date, type, mediaUrl, metadata, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.id, m.title, m.description || '', m.date, m.type, m.mediaUrl || '', m.metadata || '', Date.now()]
        );
      }
    } catch {}
  },

  getCachedMemories: async (): Promise<any[]> => {
    const db = await getDB();
    if (!db) return Array.from(memoryStore.memories.values());
    try {
      const rows: any[] = await db.getAllAsync(`SELECT * FROM cached_memories ORDER BY date DESC`);
      return rows;
    } catch {
      return Array.from(memoryStore.memories.values());
    }
  },

  // DRAWINGS
  saveDrawingDraft: async (id: string, title: string, canvasData: string, previewUrl?: string) => {
    const item = { id, title, canvasData, previewUrl, stickyNotes: '[]', isLocalDraft: 1, updatedAt: Date.now() };
    memoryStore.drawings.set(id, item);
    const db = await getDB();
    if (!db) return;
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_drawings (id, title, canvasData, previewUrl, stickyNotes, isLocalDraft, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, title, canvasData, previewUrl || '', '[]', 1, Date.now()]
      );
    } catch {}
  },

  getCachedDrawings: async (): Promise<any[]> => {
    const db = await getDB();
    if (!db) return Array.from(memoryStore.drawings.values());
    try {
      const rows: any[] = await db.getAllAsync(`SELECT * FROM cached_drawings ORDER BY updatedAt DESC`);
      return rows;
    } catch {
      return Array.from(memoryStore.drawings.values());
    }
  },

  // LOVE NOTES
  saveLoveNoteDraft: async (note: any) => {
    memoryStore.loveNotes.set(note.id, note);
    const db = await getDB();
    if (!db) return;
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_love_notes (id, title, content, unlockCondition, theme, isOpened, isLocalDraft, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id,
          note.title,
          note.content || '',
          note.unlockCondition || 'INSTANT',
          note.theme || 'ROMANTIC',
          note.isOpened ? 1 : 0,
          1,
          Date.now(),
        ]
      );
    } catch {}
  },

  getCachedLoveNotes: async (): Promise<any[]> => {
    const db = await getDB();
    if (!db) return Array.from(memoryStore.loveNotes.values());
    try {
      const rows: any[] = await db.getAllAsync(`SELECT * FROM cached_love_notes ORDER BY updatedAt DESC`);
      return rows;
    } catch {
      return Array.from(memoryStore.loveNotes.values());
    }
  },

  // OFFLINE OPERATIONS QUEUE
  enqueueOperation: async (op: Omit<SyncOperation, 'status' | 'retryCount'>): Promise<SyncOperation> => {
    const fullOp: SyncOperation = {
      ...op,
      status: 'PENDING',
      retryCount: 0,
    };
    memoryStore.queue.set(fullOp.id, fullOp);
    const db = await getDB();
    if (db) {
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO offline_operations_queue (id, endpoint, method, data, idempotencyKey, status, createdAt, retryCount, lastError)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fullOp.id,
            fullOp.endpoint,
            fullOp.method,
            JSON.stringify(fullOp.data || {}),
            fullOp.idempotencyKey,
            fullOp.status,
            fullOp.createdAt,
            fullOp.retryCount,
            fullOp.lastError || '',
          ]
        );
      } catch {}
    }
    return fullOp;
  },

  getPendingOperations: async (): Promise<SyncOperation[]> => {
    const db = await getDB();
    if (!db) {
      return Array.from(memoryStore.queue.values()).filter((op) => op.status === 'PENDING' || op.status === 'FAILED');
    }
    try {
      const rows: any[] = await db.getAllAsync(
        `SELECT * FROM offline_operations_queue WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC`
      );
      return rows.map((r) => ({
        id: r.id,
        endpoint: r.endpoint,
        method: r.method,
        data: r.data ? JSON.parse(r.data) : undefined,
        idempotencyKey: r.idempotencyKey,
        status: r.status,
        createdAt: r.createdAt,
        retryCount: r.retryCount,
        lastError: r.lastError,
      }));
    } catch {
      return Array.from(memoryStore.queue.values()).filter((op) => op.status === 'PENDING' || op.status === 'FAILED');
    }
  },

  updateOperationStatus: async (
    id: string,
    status: SyncOperation['status'],
    error?: string,
    retryIncrement = false
  ) => {
    const existing = memoryStore.queue.get(id);
    if (existing) {
      existing.status = status;
      if (error) existing.lastError = error;
      if (retryIncrement) existing.retryCount += 1;
    }
    const db = await getDB();
    if (!db) return;
    try {
      if (status === 'SYNCED') {
        // Delete synced operations to keep local database lean
        await db.runAsync(`DELETE FROM offline_operations_queue WHERE id = ?`, [id]);
      } else {
        await db.runAsync(
          `UPDATE offline_operations_queue SET status = ?, lastError = ?, retryCount = retryCount + ? WHERE id = ?`,
          [status, error || '', retryIncrement ? 1 : 0, id]
        );
      }
    } catch {}
  },

  getQueueCount: async (): Promise<number> => {
    const db = await getDB();
    if (!db) {
      return Array.from(memoryStore.queue.values()).filter((op) => op.status !== 'SYNCED').length;
    }
    try {
      const row: any = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM offline_operations_queue WHERE status != 'SYNCED'`
      );
      return row?.count || 0;
    } catch {
      return Array.from(memoryStore.queue.values()).filter((op) => op.status !== 'SYNCED').length;
    }
  },
};

