
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION_MERGE } from "../constants";
import { InputData, MergedProfile } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please ensure your environment is configured.");
  return new GoogleGenAI({ apiKey });
};

const buildPrompt = (input: InputData) => `
INPUT CONTEXT:
Customer Record (JSON): ${JSON.stringify(input.customerRecord)}

Chat Transcript: "${input.chatTranscript}"

Task: Resolve the final state of the customer data based on the chat. Ensure you capture nuanced intent.
`;

export const summarizeTranscript = async (transcript: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-lite-latest',
      contents: `Summarize this customer support chat transcript in one concise sentence: "${transcript}"`,
      config: { temperature: 0.1 }
    });
    return response.text.trim() || "No summary available.";
  } catch (e) {
    return "Summary generation failed.";
  }
};

export const mergeWithFlash = async (
  input: InputData,
  onUpdate: (text: string) => void,
  onComplete: (json: MergedProfile) => void,
  onError: (err: string) => void
): Promise<void> => {
  try {
    const ai = getClient();
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: buildPrompt(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_MERGE + "\nPerform a quick reasoning check before outputting JSON.",
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 1000 }
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        onUpdate(fullText);
      }
    }

    try {
      const cleaned = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(cleaned);
      onComplete(json);
    } catch (e) {
      onError(`Parse Error: Output was not valid JSON. ${e instanceof Error ? e.message : ''}`);
    }
  } catch (error) {
    onError(error instanceof Error ? `API Error: ${error.message}` : 'Unknown network error occurred.');
  }
};

export const mergeWithProStream = async (
  input: InputData,
  onThinking: (text: string) => void,
  onComplete: (json: MergedProfile) => void,
  onError: (err: string) => void
) => {
  try {
    const ai = getClient();
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: buildPrompt(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_MERGE + "\nAdditionally, provide a short 'reasoning_insight' field explaining the most complex decision you made.",
        temperature: 0.7,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        onThinking(fullText);
      }
    }

    try {
      const cleaned = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(cleaned);
      onComplete(json);
    } catch (e) {
      onError(`Structure Error: Deep reasoning failed to produce expected schema. ${e instanceof Error ? e.message : ''}`);
    }

  } catch (error) {
    onError(error instanceof Error ? `Pro Engine Fault: ${error.message}` : "An unexpected error occurred in the reasoning phase.");
  }
};

export const consolidateResults = async (
  input: InputData,
  flash: MergedProfile,
  pro: MergedProfile
): Promise<MergedProfile> => {
  const ai = getClient();
  const prompt = `
Original Record: ${JSON.stringify(input.customerRecord)}
Chat: ${input.chatTranscript}

Flash Model Proposal: ${JSON.stringify(flash)}
Pro Model Proposal: ${JSON.stringify(pro)}

Task: Compare both models. 
1. If they agree, return that definitive JSON.
2. If they disagree, look at the Chat Transcript and determine the correct Golden Record.
3. If one captured a nuance the other missed, synthesize the best combined result.
4. Ensure updates_applied is comprehensive.

Return STRICT JSON following the MergedProfile schema.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "You are a Master Arbiter for Identity Resolution. Produce the final Golden Record.",
      responseMimeType: 'application/json'
    }
  });

  const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};
