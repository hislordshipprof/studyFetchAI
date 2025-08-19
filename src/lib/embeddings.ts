import { OpenAIEmbeddings } from "@langchain/openai";

// Get OpenAI embeddings

export function getEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small" 
  });
}