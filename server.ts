import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Airtable from "airtable";

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Airtable Configuration
const API_KEY = 'patAlPYd4gaRb7er6.9c43c444398ad35a0e6b0e13f80184fafa5dc81f1203adf0b005fe7a5c6b55d8';
const BASE_ID = 'appRrfzauUm7FORyx';
const TABLE_NAME = 'Memories';

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

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

      const records = await base(TABLE_NAME)
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
      const createdRecords = await base(TABLE_NAME).create([{ fields }], { typecast: true });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
