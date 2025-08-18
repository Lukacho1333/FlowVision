import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'LEADER']).optional().default('LEADER'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enhanced logging for debugging
    console.log('Registration attempt with body:', {
      hasEmail: !!body.email,
      hasPassword: !!body.password,
      hasName: !!body.name,
      receivedFields: Object.keys(body || {}),
    });

    const { email, password, name, role } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization and user together
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        organizationId: 'morrison-ae', // For demo, use Morrison AE organization
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        details: { email, name, role },
      },
    });

    return NextResponse.json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
