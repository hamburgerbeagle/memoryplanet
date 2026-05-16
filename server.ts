import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Airtable from "airtable";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Memories';
const VALID_CATEGORIES = new Set(['Memory', 'Wish']);

const escapeAirtableString = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const getAttachmentUrl = (record: any) => {
  const attachments = record.get('image_file');
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return '';
  }

  return attachments[0]?.url || attachments[0]?.thumbnails?.large?.url || '';
};

const getAirtableBase = () => {
  const missing = [
    !AIRTABLE_API_KEY && 'AIRTABLE_API_KEY',
    !AIRTABLE_BASE_ID && 'AIRTABLE_BASE_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`缺少服务端环境变量: ${missing.join(', ')}`);
  }

  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID!);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/memories", async (req, res) => {
    const { userId, category } = req.query;
    console.log(`GET /api/memories request received. Filter userId: ${userId || 'none'}, category: ${category || 'all'}`);
    
    try {
      const userIdParam = typeof userId === 'string' ? userId.trim() : '';
      const categoryParam = typeof category === 'string' ? category.trim() : '';
      let filterByFormula = '{is_approved} = 1';
      
      if (userIdParam) {
        filterByFormula = `{user_id} = '${escapeAirtableString(userIdParam)}'`;
      } else if (categoryParam === 'Memory') {
        // Fallback: 默认显示 category 为 Memory 或 未设置 category 的记录
        filterByFormula = `AND({is_approved} = 1, OR({category} = 'Memory', {category} = ''))`;
      } else if (VALID_CATEGORIES.has(categoryParam)) {
        filterByFormula = `AND({is_approved} = 1, {category} = '${categoryParam}')`;
      }

      const records = await getAirtableBase()(TABLE_NAME)
        .select({
          filterByFormula,
          sort: [{ field: 'timestamp', direction: 'desc' }],
          maxRecords: 100
        })
        .all();
      
      console.log(`Successfully fetched ${records.length} records from Airtable`);
      const formatted = records.map(record => ({
        id: record.id,
        textContent: record.get('text_content') || '',
        imageUrl: getAttachmentUrl(record),
        timestamp: record.get('timestamp') || '',
        isApproved: record.get('is_approved') || false,
        userId: record.get('user_id') || '',
        category: record.get('category') || 'Memory',
        userNickname: record.get('user_nickname') || '匿名星星',
      }));

      res.json({ records: formatted, total: formatted.length });
    } catch (error: any) {
      console.error('Airtable Fetch Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/memories", async (req, res) => {
    console.log('POST /api/memories request received', req.body);
    try {
      const { text, userId, category, userNickname } = req.body;
      const trimmedText = typeof text === 'string' ? text.trim() : '';
      const normalizedCategory = VALID_CATEGORIES.has(category) ? category : 'Memory';
      const normalizedUserId = typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';

      if (!trimmedText) {
        return res.status(400).json({ error: '请先写下你的内容' });
      }
      
      const fields: any = {
        text_content: trimmedText,
        is_approved: false,
        user_id: normalizedUserId,
        category: normalizedCategory,
        user_nickname: typeof userNickname === 'string' ? userNickname.trim() : '',
      };

      console.log('Creating record in Airtable with fields:', fields);
      const createdRecords = await getAirtableBase()(TABLE_NAME).create([{ fields }], { typecast: true });
      console.log('Successfully created record:', createdRecords[0].id);
      res.json({ success: true, records: createdRecords });
    } catch (error: any) {
      console.error('Airtable Save Error Details:', error);
      // Return more details to help debug which column is failing
      res.status(500).json({ 
        error: error.error || error.message,
        message: error.message,
        details: error.details || 'Check if column names (text_content, is_approved) match your Airtable exactly.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: '图片太大啦 (最大支持 5MB)' });
    }

    console.error('Unhandled API Error:', error);
    res.status(500).json({ error: error?.message || '服务器内部错误' });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
