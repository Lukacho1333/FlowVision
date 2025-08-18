/**
 * Super Admin MFA Setup API
 * SECURITY CRITICAL: Multi-Factor Authentication setup for super admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuth } from '@/lib/super-admin-auth';
import { z } from 'zod';

const setupMFASchema = z.object({
  sessionToken: z.string()
});

const enableMFASchema = z.object({
  sessionToken: z.string(),
  mfaToken: z.string().length(6, 'MFA token must be 6 digits')
});

// POST /super-admin/api/auth/setup-mfa - Generate MFA secret and QR code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = setupMFASchema.parse(body);

    // Validate session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Generate MFA setup
    const mfaSetup = await superAdminAuth.setupMFA(user.id);

    return NextResponse.json({
      success: true,
      secret: mfaSetup.secret,
      qrCodeUrl: mfaSetup.qrCodeUrl,
      instructions: 'Scan the QR code with your authenticator app and enter the 6-digit code to verify'
    });

  } catch (error: any) {
    console.error('MFA setup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'MFA setup failed'
    }, { status: 500 });
  }
}

// PUT /super-admin/api/auth/setup-mfa - Enable MFA after verification
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, mfaToken } = enableMFASchema.parse(body);

    // Validate session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Enable MFA
    await superAdminAuth.enableMFA(user.id, mfaToken);

    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      'MFA_ENABLED_SUCCESS',
      { ipAddress },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'MFA has been successfully enabled for your account'
    });

  } catch (error: any) {
    console.error('MFA enable error:', error);

    const body = await request.json();
    if (body.sessionToken) {
      const user = await superAdminAuth.validateSession(body.sessionToken);
      if (user) {
        const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
        await superAdminAuth.auditLog(
          user.id,
          'MFA_ENABLE_FAILED',
          { error: error.message, ipAddress },
          ipAddress,
          userAgent
        );
      }
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'MFA enable failed'
    }, { status: 400 });
  }
}
