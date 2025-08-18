import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Custom prompt template
 * Exact replication of lines 146-169 from chatapp.py
 */
export const CUSTOM_PROMPT_TEMPLATE = `
Use the following pieces of context to answer the user question. If you
don't know the answer, just say that you don't know, don't try to make up an
answer.

{context}

Question: {question}

Please provide your answer in the following JSON format: 
{{
    "answer": "Your detailed answer here",
    "sources": "Direct sentences or paragraphs from the context that support 
        your answers. ONLY RELEVANT TEXT DIRECTLY FROM THE DOCUMENTS. DO NOT 
        ADD ANYTHING EXTRA. DO NOT INVENT ANYTHING."
}}

The JSON must be a valid json format and can be read with json.loads() in
Python. Answer:
`;

export const CUSTOM_PROMPT = new PromptTemplate({
  template: CUSTOM_PROMPT_TEMPLATE,
  inputVariables: ["context", "question"]
});