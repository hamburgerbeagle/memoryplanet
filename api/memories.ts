import Airtable from 'airtable';

const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Memories';

const getAirtableBase = () => {
  const missing = [
    !process.env.AIRTABLE_API_KEY && 'AIRTABLE_API_KEY',
    !process.env.AIRTABLE_BASE_ID && 'AIRTABLE_BASE_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`缺少服务端环境变量: ${missing.join(', ')}`);
  }

  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
};

const formatRecord = (record: any) => ({
  id: record.id,
  textContent: record.get('text_content') || '',
  timestamp: record.get('timestamp') || '',
  isApproved: record.get('is_approved') || false,
  userId: record.get('user_id') || '',
  category: record.get('category') || 'Memory',
  userNickname: record.get('user_nickname') || '匿名星星',
});

const getMemories = async (req: any, res: any) => {
  const { userId, category } = req.query;
  let filterByFormula = '{is_approved} = 1';

  if (userId) {
    filterByFormula = `{user_id} = '${userId}'`;
  } else if (category === 'Memory') {
    filterByFormula = `AND({is_approved} = 1, OR({category} = 'Memory', {category} = ''))`;
  } else if (category) {
    filterByFormula = `AND({is_approved} = 1, {category} = '${category}')`;
  }

  const records = await getAirtableBase()(TABLE_NAME)
    .select({
      filterByFormula,
      sort: [{ field: 'timestamp', direction: 'desc' }],
      maxRecords: 100,
    })
    .all();

  res.status(200).json({ records: records.map(formatRecord) });
};

const createMemory = async (req: any, res: any) => {
  const { text, imageUrl, userId, category, userNickname } = req.body || {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '请先写下你的内容' });
  }

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

  const createdRecords = await getAirtableBase()(TABLE_NAME).create([{ fields }], { typecast: true });
  res.status(200).json({ success: true, records: createdRecords });
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      return await getMemories(req, res);
    }

    if (req.method === 'POST') {
      return await createMemory(req, res);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Vercel memories API error:', error);
    return res.status(500).json({
      error: error?.error || error?.message || '服务器内部错误',
      message: error?.message,
    });
  }
}
