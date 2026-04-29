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
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
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

  // API Routes
  app.post("/api/upload-image", express.raw({ type: 'image/*', limit: '5mb' }), async (req, res) => {
    try {
      const contentType = (req.headers['content-type'] || '').split(';')[0].toLowerCase();
      const extension = SUPPORTED_IMAGE_TYPES[contentType];

      if (!extension) {
        return res.status(415).json({ error: '仅支持 JPG、PNG、WebP 或 GIF 图片' });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: '没有收到图片文件' });
      }

      if (!IMGBB_API_KEY) {
        return res.status(500).json({ error: '缺少服务端环境变量: IMGBB_API_KEY' });
      }

      const formData = new FormData();
      const imageBlob = new Blob([new Uint8Array(req.body)], { type: contentType });
      formData.append('image', imageBlob, `memory.${extension}`);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.data?.url) {
        return res.status(502).json({ error: data.error?.message || '图片上传失败，请稍后再试' });
      }

      res.json({ url: data.data.url });
    } catch (error: any) {
      console.error('Image Upload Error:', error);
      res.status(500).json({ error: error.message || '图片上传失败，请稍后再试' });
    }
  });

  app.get("/api/memories", async (req, res) => {
    const { userId, category } = req.query;
    console.log(`GET /api/memories request received. Filter userId: ${userId || 'none'}, category: ${category || 'all'}`);
    
    try {
      let filterByFormula = '{is_approved} = 1';
      
      if (userId) {
        filterByFormula = `{user_id} = '${userId}'`;
      } else if (category === 'Memory') {
        // Fallback: 默认显示 category 为 Memory 或 未设置 category 的记录
        filterByFormula = `AND({is_approved} = 1, OR({category} = 'Memory', {category} = ''))`;
      } else if (category) {
        filterByFormula = `AND({is_approved} = 1, {category} = '${category}')`;
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
        timestamp: record.get('timestamp') || '',
        isApproved: record.get('is_approved') || false,
        userId: record.get('user_id') || '',
        category: record.get('category') || 'Memory',
        userNickname: record.get('user_nickname') || '匿名星星',
      }));

      res.json({ records: formatted });
    } catch (error: any) {
      console.error('Airtable Fetch Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/memories", async (req, res) => {
    console.log('POST /api/memories request received', req.body);
    try {
      const { text, imageUrl, userId, category, userNickname } = req.body;
      
      const fields: any = {
        text_content: text,
        is_approved: false,
        user_id: userId || 'anonymous',
        category: category || 'Memory',
        user_nickname: userNickname || '',
      };

      if (imageUrl) {
        fields.image_file = [{ url: imageUrl }];
      }

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
