console.log('Airtable Service Initializing (Proxy Mode)');

export interface MemoryRecord {
  id: string;
  textContent: string;
  timestamp: string;
  isApproved: boolean;
  userId: string;
  category: string;
  userNickname: string;
}

const readJsonResponse = async (response: Response) => {
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  if (!text) {
    return {};
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(text);
  }

  throw new Error(
    `API 返回了非 JSON 内容 (${response.status} ${response.statusText})，请确认当前页面是通过 npm run dev 启动的 Express 服务访问，而不是 Vite/静态预览。`
  );
};

export const fetchMemories = async (params: { userId?: string, category?: string } = {}, retries = 3): Promise<{ records: MemoryRecord[] }> => {
  const { userId, category } = params;
  console.log(`--- Fetching Memories via Proxy (User: ${userId || 'all'}, Cat: ${category || 'all'}, Attempts left: ${retries}) ---`);
  
  try {
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('userId', userId);
    if (category) queryParams.append('category', category);
    
    const url = `/api/memories?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      let errorMsg = 'Unknown error';
      try {
        const data = await readJsonResponse(response);
        errorMsg = data.error || data.message || JSON.stringify(data);
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : response.statusText;
      }
      console.error('Proxy Fetch Error:', errorMsg);
      return { records: [] };
    }

    const data = await readJsonResponse(response);
    return data;
  } catch (error: any) {
    console.error('Network Error (Proxy Fetch):', error.message || error);
    
    if (retries > 0) {
      console.log('Retrying fetch in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchMemories(params, retries - 1);
    }
    
    return { records: [] };
  }
};

export const saveMemory = async (text: string, userId: string, category: string, userNickname: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> => {
  console.log('--- Saving Memory/Wish via Proxy ---');
  
  try {
    const response = await fetch('/api/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, imageUrl, userId, category, userNickname })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      return { success: false, error: data.error || '服务器内部错误' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `网络请求失败: ${error.message}` };
  }
};
