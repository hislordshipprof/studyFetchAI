import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendEmail, generateVerificationEmailHTML } from '@/lib/email';
import { randomBytes } from 'crypto';

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = registerSchema.parse(body);
    const { email, password, name } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'USER_EXISTS', message: 'User with this email already exists' } },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0], // Use email prefix as default name
        emailVerificationToken,
        emailVerificationExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    });

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${emailVerificationToken}`;
    const emailHTML = generateVerificationEmailHTML(verificationUrl, user.email);
    
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email - StudyFetch',
        html: emailHTML,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, just log it
    }

    return NextResponse.json(
      { 
        message: 'User created successfully. Please check your email for verification instructions.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input data',
            details: error.errors
          } 
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: { code: 'USER_EXISTS', message: 'User with this email already exists' } },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
