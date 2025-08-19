import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Try to query a simple operation
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      test: result,
      tables: tables,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
        POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set',
        PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL ? 'Set' : 'Not set',
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
        POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set',
        PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL ? 'Set' : 'Not set',
      }
    }, { status: 500 });
  }
}