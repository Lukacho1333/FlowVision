/**
 * Super Admin Login API
 * SECURITY CRITICAL: Completely isolated authentication system
 * Domain: admin.flowvision.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuth } from '@/lib/super-admin-auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  mfaToken: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Extract request information for security logging
    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
    
    // Validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    
    const { email, password, mfaToken } = validatedData;

    // Attempt login
    const loginResult = await superAdminAuth.login(email, password, ipAddress, userAgent);

    // If MFA is required and token is provided, verify it
    if (loginResult.requiresMFA && mfaToken) {
      const mfaResult = await superAdminAuth.verifyMFA(
        loginResult.user.id,
        mfaToken,
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        user: loginResult.user,
        sessionToken: mfaResult.sessionToken,
        requiresMFA: false
      });
    }

    // If MFA is required but no token provided
    if (loginResult.requiresMFA) {
      return NextResponse.json({
        success: true,
        user: loginResult.user,
        requiresMFA: true,
        message: 'MFA token required'
      });
    }

    // Login successful without MFA
    return NextResponse.json({
      success: true,
      user: loginResult.user,
      sessionToken: loginResult.sessionToken,
      requiresMFA: false
    });

  } catch (error: any) {
    console.error('Super admin login error:', error);

    // Log failed attempt
    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      'system',
      'LOGIN_ERROR',
      { error: error.message, ipAddress },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: false,
      error: error.message || 'Login failed'
    }, { status: 401 });
  }
}

// Middleware to ensure this only runs on super admin domain
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  
  // Only allow access from admin.flowvision.com
  if (!host?.includes('admin.flowvision.com') && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Unauthorized domain' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}
