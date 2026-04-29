export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const readBody = async (req: any): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return Buffer.from(req.body);
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
    const extension = SUPPORTED_IMAGE_TYPES[contentType];

    if (!extension) {
      return res.status(415).json({ error: '仅支持 JPG、PNG、WebP 或 GIF 图片' });
    }

    if (!process.env.IMGBB_API_KEY) {
      return res.status(500).json({ error: '缺少服务端环境变量: IMGBB_API_KEY' });
    }

    const body = await readBody(req);
    if (body.length === 0) {
      return res.status(400).json({ error: '没有收到图片文件' });
    }

    if (body.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: '图片太大啦 (最大支持 5MB)' });
    }

    const formData = new FormData();
    const imageBlob = new Blob([new Uint8Array(body)], { type: contentType });
    formData.append('image', imageBlob, `memory.${extension}`);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success || !data.data?.url) {
      return res.status(502).json({ error: data.error?.message || '图片上传失败，请稍后再试' });
    }

    return res.status(200).json({ url: data.data.url });
  } catch (error: any) {
    console.error('Vercel image upload API error:', error);
    return res.status(500).json({ error: error?.message || '图片上传失败，请稍后再试' });
  }
}
