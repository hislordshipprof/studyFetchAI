import { LlamaParseReader } from "llama-cloud-services";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

//Extract documents using LlamaParse for better PDF processing

export async function extractDocumentsWithLlamaParse(file: File) {
  // Create temporary file
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `upload_${Date.now()}.pdf`);
  
  try {
    // Write file to temporary location
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);
    
    // Initialize LlamaParseReader 
    const reader = new LlamaParseReader({
      resultType: "markdown", 
      verbose: true          
    });
    
    // Parse the document
    const documents = await reader.loadData(tempFilePath);
    
    // Convert to LangChain documents for compatibility 
    const langchainDocs: Document[] = [];
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const langchainDoc = new Document({
        pageContent: doc.text,
        metadata: { source: file.name, page: i }
      });
      langchainDocs.push(langchainDoc);
    }
    
    return { langchainDocs, documents };
    
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}