import { PrismaClient } from '@prisma/client';

// Global is used here to maintain a cached connection across hot reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to disconnect Prisma (useful for serverless)
export async function disconnectDB() {
  await prisma.$disconnect();
}

// Helper function to check database connection
export async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log(' Database connected successfully');
    return true;
  } catch (error) {
    console.error(' Database connection failed:', error);
    return false;
  }
}

// Export types for use in components
export type { User, Document, Conversation, Message, Annotation } from '@prisma/client';
