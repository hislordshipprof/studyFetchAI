import { ChatOpenAI } from "@langchain/openai";

//Initialize OpenAI ChatGPT model
export function initializeLanguageModel() {
  return new ChatOpenAI({
    temperature: 0,              
    model: "gpt-4",            
    apiKey: process.env.OPENAI_API_KEY!
  });
}