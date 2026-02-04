# 📖 API & Service Reference

This document provides a reference for the `geminiService.ts` and the associated TypeScript schemas.

## 📡 Service Functions

### `mergeWithFlash`
- **Model**: `gemini-3-flash-preview`
- **Config**: `thinkingBudget: 1000`, `temperature: 0.1`
- **Purpose**: Fast path resolution.
- **Output**: `MergedProfile` JSON.

### `mergeWithProStream`
- **Model**: `gemini-3-pro-preview`
- **Config**: `thinkingBudget: 2000`, `temperature: 0.7`
- **Purpose**: Deep reasoning path with CoT streaming.
- **Output**: `MergedProfile` JSON + `reasoning_insight`.

### `consolidateResults`
- **Model**: `gemini-3-flash-preview`
- **Purpose**: Synthesis of two model outputs into a single Golden Record.
- **Logic**: Conflict resolution and nuance merging.

### `summarizeTranscript`
- **Model**: `gemini-3-flash-lite-latest`
- **Purpose**: Background task to provide context for long-lived history items.

## 🧱 Data Schemas

### `MergedProfile`
The core output schema for all resolution tasks:
```typescript
{
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  current_tier: string;
  latest_sentiment: 'Positive' | 'Neutral' | 'Negative';
  identified_intent: string;
  updates_applied: string[]; // Tracks which fields changed
  confidence_score: number;  // 0.0 to 1.0
  reasoning_insight?: string; 
}
```

### `ModelResolution`
Wraps the output with metadata for the UI:
```typescript
{
  output: MergedProfile | null;
  logs: string[];
  durationMs: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  thinkingText?: string;
}
```

## ⚠️ Error Handling Codes

The system provides specific error messaging for common AI failure modes:
- `Structure Error`: Model failed to adhere to the requested JSON schema.
- `Parse Error`: Response contained non-JSON characters or was truncated.
- `Pro Engine Fault`: High-level API failure during deep thinking cycles.
