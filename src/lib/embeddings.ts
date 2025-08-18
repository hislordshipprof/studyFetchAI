import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Get OpenAI embeddings
 * Exact replication of lines 93-98 from chatapp.py
 */
export function getEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small" // Exact model from line 97
  });
}