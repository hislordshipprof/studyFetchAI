// Mock data for testing the AI tutor interface

export const mockPDFContent = {
  "doc_1": {
    title: "Biology Textbook Chapter 5",
    pageCount: 24,
    pages: {
      1: `Chapter 5: Viruses and Bacteria

Introduction to Microorganisms

This chapter explores the fascinating world of microscopic organisms, 
focusing specifically on viruses and bacteria. These tiny life forms 
play crucial roles in our ecosystem and have significant impacts on 
human health and disease.

Learning Objectives:
• Understand what viruses are and how they function
• Learn about bacterial structure and reproduction
• Explore the differences between viruses and bacteria
• Examine their roles in disease and health`,

      5: `What is a Virus?

A virus is a microscopic infectious agent that can only replicate 
inside the living cells of an organism. Viruses are much smaller 
than bacteria and are not considered to be living organisms because 
they cannot reproduce independently.

Key Characteristics of Viruses:
• Composed of genetic material (DNA or RNA)
• Surrounded by a protein coat called a capsid
• Cannot reproduce without a host cell
• Cause various diseases in humans, animals, and plants

Virus Structure:
The basic structure of a virus consists of nucleic acid (genetic 
material) surrounded by a protein coat. Some viruses also have 
an additional outer envelope made of lipids.`,

      18: `Viral Replication Cycle

The viral replication cycle involves multiple stages through which 
a virus reproduces within a host cell:

1. Attachment: The virus binds to specific receptor sites on the 
   host cell surface.

2. Penetration: The virus or its genetic material enters the host cell.

3. Replication: The viral genetic material is replicated using the 
   host cell's machinery.

4. Assembly: New viral components are assembled into complete viruses.

5. Release: New viruses are released from the host cell, often 
   destroying the cell in the process.

This cycle allows viruses to spread from cell to cell and from 
organism to organism, leading to viral infections and diseases.`
    }
  },
  "doc_2": {
    title: "Physics - Quantum Mechanics", 
    pageCount: 45,
    pages: {
      1: `Chapter 1: Introduction to Quantum Physics

Quantum mechanics is a fundamental theory in physics that describes 
the behavior of matter and energy at the atomic and subatomic level. 
It represents one of the most significant scientific discoveries of 
the 20th century.

Historical Development:
• Max Planck's quantum hypothesis (1900)
• Einstein's photoelectric effect (1905)
• Bohr's atomic model (1913)
• Heisenberg's uncertainty principle (1927)
• Schrödinger's wave equation (1926)`,

      23: `Wave-Particle Duality

Wave-particle duality is a fundamental concept in quantum mechanics 
that describes how quantum entities exhibit both wave-like and 
particle-like properties depending on the experimental setup.

Key Experiments:
• Double-slit experiment with electrons
• Photoelectric effect
• Compton scattering

The wave-particle duality principle shows that:
• Light can behave as both waves and particles (photons)
• Matter particles (like electrons) can exhibit wave properties
• The measurement process affects the observed behavior

This duality is central to understanding quantum mechanics and 
has profound implications for our understanding of reality at 
the quantum level.`
    }
  }
};

export const mockAIResponses = {
  "what is a virus": {
    text: "A virus is a microscopic infectious agent that can only replicate inside living cells. Let me show you the relevant section on page 5 where this is explained in detail.",
    annotations: [
      {
        id: "ann_1",
        type: "HIGHLIGHT" as const,
        pageNumber: 5,
        coordinates: { x: 50, y: 150, width: 400, height: 60 },
        color: "#ffff00",
        opacity: 0.4,
        createdAt: new Date(),
        documentId: "doc_1"
      }
    ],
    navigateTo: 5,
    delay: 2000
  },
  
  "virus structure": {
    text: "Virus structure consists of genetic material (DNA or RNA) surrounded by a protein coat called a capsid. Some viruses also have an outer envelope. I'll highlight this information for you.",
    annotations: [
      {
        id: "ann_2", 
        type: "CIRCLE" as const,
        pageNumber: 5,
        coordinates: { x: 300, y: 400, radius: 50 },
        color: "#ff0000",
        opacity: 0.6,
        createdAt: new Date(),
        documentId: "doc_1"
      }
    ],
    navigateTo: 5,
    delay: 1500
  },
  
  "replication cycle": {
    text: "The viral replication cycle involves multiple stages: attachment, penetration, replication, assembly, and release. Let me take you to page 18 where this process is explained step by step.",
    annotations: [
      {
        id: "ann_3",
        type: "HIGHLIGHT" as const, 
        pageNumber: 18,
        coordinates: { x: 50, y: 200, width: 500, height: 100 },
        color: "#00ff00",
        opacity: 0.3,
        createdAt: new Date(),
        documentId: "doc_1"
      }
    ],
    navigateTo: 18,
    delay: 2500
  },

  "wave particle duality": {
    text: "Wave-particle duality is a fundamental quantum mechanics concept showing that particles can exhibit both wave and particle properties. Let me show you the relevant section.",
    annotations: [
      {
        id: "ann_4",
        type: "HIGHLIGHT" as const,
        pageNumber: 23,
        coordinates: { x: 50, y: 100, width: 450, height: 80 },
        color: "#ff00ff",
        opacity: 0.4,
        createdAt: new Date(),
        documentId: "doc_2"
      }
    ],
    navigateTo: 23,
    delay: 2000
  }
};

export const mockConversations = {
  "doc_1": [
    {
      id: "msg_1",
      role: "user" as const,
      content: "What is a virus?",
      timestamp: new Date("2024-01-15T14:00:00"),
      conversationId: "conv_doc_1"
    },
    {
      id: "msg_2", 
      role: "assistant" as const,
      content: "A virus is a microscopic infectious agent that can only replicate inside living cells...",
      timestamp: new Date("2024-01-15T14:00:05"),
      conversationId: "conv_doc_1",
      metadata: {
        annotations: [
          {
            type: "highlight",
            page: 5,
            coordinates: { x: 50, y: 150, width: 400, height: 60 }
          }
        ],
        navigateTo: 5
      }
    }
  ]
};

// Helper function to get AI response
export function getAIResponse(userInput: string, documentId: string) {
  const input = userInput.toLowerCase();
  
  // Find matching response
  const responseKey = Object.keys(mockAIResponses).find(key => 
    input.includes(key)
  );
  
  if (responseKey) {
    return mockAIResponses[responseKey as keyof typeof mockAIResponses];
  }
  
  // Default response
  return {
    text: `I understand you're asking about "${userInput}". Based on the document content, I can help you find relevant information. Could you be more specific about what you'd like to know?`,
    annotations: [],
    navigateTo: null,
    delay: 1500
  };
}
