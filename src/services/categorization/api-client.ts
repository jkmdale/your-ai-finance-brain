import { supabase } from '@/integrations/supabase/client';
import { CLAUDE_CONFIG } from './config';
import type { ClaudeResponse, CategorizationResult } from '@/types/categorization';

export class ClaudeApiClient {
  private claudeApiKey: string | null = null;

  constructor() {
    this.initializeApiKey();
  }

  private async initializeApiKey() {
    try {
      const { data, error } = await supabase.functions.invoke('claude-api-proxy', {
        body: { action: 'get-api-key' }
      });
      
      if (!error && data?.apiKey) {
        this.claudeApiKey = 'configured'; // Use proxy instead of direct key
      }
    } catch (error) {
      console.warn('Could not retrieve Claude API key from Supabase');
    }
  }

  async callClaude(prompt: string): Promise<CategorizationResult> {
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    const { data: responseData, error } = await supabase.functions.invoke('claude-api-proxy', {
      body: {
        prompt,
        model: CLAUDE_CONFIG.MODEL,
        max_tokens: CLAUDE_CONFIG.MAX_TOKENS
      }
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    const content = responseData?.content?.[0]?.text;
    if (!content) {
      throw new Error('No content in Claude response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  isConfigured(): boolean {
    return this.claudeApiKey !== null;
  }
}