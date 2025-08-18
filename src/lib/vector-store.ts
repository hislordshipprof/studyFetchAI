import { Document } from "@langchain/core/documents";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RetrievalQAChain } from "langchain/chains";
import { getEmbeddings } from "./embeddings";
import { initializeLanguageModel } from "./language-model";
import { CUSTOM_PROMPT } from "./prompts";

/**
 * Setup QA system using Memory Vector Store with OpenAI embeddings
 * Modified to avoid native dependency compatibility issues
 */
export async function setupQASystemWithLlamaCloud(documents: Document[], projectName = "pdf_chat") {
  try {
    console.log(`Setting up QA system with ${documents.length} documents`);
    
    // If documents are already chunks, use them directly, otherwise split them
    let textChunks = documents;
    
    // Check if we need to split the documents (if they're too large)
    const needsSplitting = documents.some(doc => doc.pageContent.length > 2000);
    
    if (needsSplitting) {
      console.log('Splitting large documents into chunks...');
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 1000,    // Exact same as chatapp.py line 106
        chunkOverlap: 200   // Exact same as chatapp.py line 106
      });
      textChunks = await textSplitter.splitDocuments(documents);
      console.log(`Created ${textChunks.length} text chunks`);
    }
    
    // Create Memory Vector Store - no native dependencies required
    console.log('Creating Memory Vector Store...');
    const vectorStore = await MemoryVectorStore.fromDocuments(textChunks, getEmbeddings());
    
    const retriever = vectorStore.asRetriever({
      searchType: "mmr",           // Exact same as line 111
      searchKwargs: { fetchK: 8 }, // Exact same as Python: {"k": 4, "fetch_k": 8}
      k: 4                         // Set k parameter separately to match Python exactly
    });
    
    // Exact replication of lines 115-121 from chatapp.py
    console.log('Creating RetrievalQA chain...');
    const qaChain = RetrievalQAChain.fromLLM(
      initializeLanguageModel(),
      retriever,
      {
        prompt: CUSTOM_PROMPT,        // Exact same as line 120
        returnSourceDocuments: true   // Exact same as line 119
      }
    );
    
    console.log('QA system setup completed successfully');
    return qaChain;
    
  } catch (error) {
    console.error(`Error setting up QA system: ${error}`);
    console.error('Error details:', error);
    return null;
  }
}