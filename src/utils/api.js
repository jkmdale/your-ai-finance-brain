// utils/api.js

import { supabase } from '../utils/supabaseClient';

export const uploadCSVToClaude = async (file) => { try { const reader = new FileReader();

return new Promise((resolve, reject) => {
  reader.onload = async (event) => {
    try {
      const csvText = event.target.result;
      const user = supabase.auth.getUser();

      if (!user || !user.data || !user.data.user) {
        return reject(new Error('User not authenticated'));
      }

      const accessToken = (await user).data.session.access_token;

      const response = await fetch(
        'https://gzznuwtxyyaqlbbrxsuz.supabase.co/functions/v1/claude-ai-coach',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            input: csvText,
            model: 'claude-3-haiku-20240307',
          }),
        }
      );

      const result = await response.json();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  };

  reader.onerror = (error) => reject(error);
  reader.readAsText(file);
});

} catch (error) { console.error('CSV Upload Error:', error); throw error; } };

