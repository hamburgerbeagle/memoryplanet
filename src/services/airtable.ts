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
        const data = await response.json();
        errorMsg = data.error || data.message || JSON.stringify(data);
      } catch (e) {
        errorMsg = response.statusText;
      }
      console.error('Proxy Fetch Error:', errorMsg);
      return { records: [] };
    }

    const data = await response.json();
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

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '服务器内部错误' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `网络请求失败: ${error.message}` };
  }
};
