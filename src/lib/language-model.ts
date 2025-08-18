import { ChatOpenAI } from "@langchain/openai";

/**
 * Initialize OpenAI ChatGPT model
 * Exact replication of lines 83-89 from chatapp.py
 */
export function initializeLanguageModel() {
  return new ChatOpenAI({
    temperature: 0,              // Exact same as line 86
    model: "gpt-4",             // Exact same as line 87
    apiKey: process.env.OPENAI_API_KEY!
  });
}