
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface CustomerRecord {
  customer_id: string;
  name: string;
  email: string;
  phone: string | null;
  current_tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  last_updated: string;
}

export interface InputData {
  id: string;
  customerRecord: CustomerRecord;
  chatTranscript: string;
  timestamp: number;
}

export interface MergedProfile {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  current_tier: string;
  latest_sentiment: 'Positive' | 'Neutral' | 'Negative';
  identified_intent: string;
  updates_applied: string[]; 
  confidence_score: number;
  reasoning_insight?: string; // Additional field for the thinking model
}

export interface ModelResolution {
  output: MergedProfile | null;
  logs: string[];
  durationMs: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  thinkingText?: string; // For streaming CoT
}

export interface ProcessedResult {
  id: string;
  input: InputData;
  flash: ModelResolution;
  pro: ModelResolution;
  consolidated?: ModelResolution;
  summary?: string; // Short summary of the chat transcript
}
