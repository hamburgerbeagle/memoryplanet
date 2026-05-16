import Airtable from 'airtable';

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
  imageUrl: getAttachmentUrl(record),
  timestamp: record.get('timestamp') || '',
  isApproved: record.get('is_approved') || false,
  userId: record.get('user_id') || '',
  category: record.get('category') || 'Memory',
  userNickname: record.get('user_nickname') || '匿名星星',
});

const getMemories = async (req: any, res: any) => {
  const { userId, category } = req.query;
  const userIdParam = typeof userId === 'string' ? userId.trim() : '';
  const categoryParam = typeof category === 'string' ? category.trim() : '';
  let filterByFormula = '{is_approved} = 1';

  if (userIdParam) {
    filterByFormula = `{user_id} = '${escapeAirtableString(userIdParam)}'`;
  } else if (categoryParam === 'Memory') {
    filterByFormula = `AND({is_approved} = 1, OR({category} = 'Memory', {category} = ''))`;
  } else if (VALID_CATEGORIES.has(categoryParam)) {
    filterByFormula = `AND({is_approved} = 1, {category} = '${categoryParam}')`;
  }

  const records = await getAirtableBase()(TABLE_NAME)
    .select({
      filterByFormula,
      sort: [{ field: 'timestamp', direction: 'desc' }],
      maxRecords: 100,
    })
    .all();

  res.status(200).json({ records: records.map(formatRecord), total: records.length });
};

const createMemory = async (req: any, res: any) => {
  const { text, userId, category, userNickname } = req.body || {};
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
