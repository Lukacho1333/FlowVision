/**
 * Super Admin Authentication Service
 * SECURITY CRITICAL: Completely isolated from client authentication
 * 
 * Features:
 * - Separate database and authentication domain
 * - Multi-factor authentication (TOTP)
 * - Enhanced session security
 * - Comprehensive audit logging
 * - Emergency access controls
 */

import { PrismaClient } from '../generated/super-admin-client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { NextRequest } from 'next/server';

// Initialize Super Admin Prisma Client (separate database)
const superAdminPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SUPER_ADMIN_DATABASE_URL
    }
  }
});

export interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'BILLING';
  department?: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin?: Date;
}

export interface SuperAdminSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: Date;
  mfaVerified: boolean;
}

export interface LoginAttempt {
  email: string;
  success: boolean;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  failureReason?: string;
}

export class SuperAdminAuthService {
  private readonly JWT_SECRET = process.env.SUPER_ADMIN_JWT_SECRET;
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    if (!this.JWT_SECRET) {
      throw new Error('SUPER_ADMIN_JWT_SECRET environment variable is required');
    }
  }

  /**
   * Register a new super admin user (only for initial setup)
   */
  async registerSuperAdmin(data: {
    email: string;
    password: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'BILLING';
    department?: string;
  }): Promise<SuperAdminUser> {
    // Check if super admin already exists (prevent multiple super admins)
    const existingSuperAdmin = await superAdminPrisma.superAdminUser.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin && data.role === 'SUPER_ADMIN') {
      throw new Error('Super admin already exists. Contact existing super admin for additional accounts.');
    }

    // Hash password with high cost factor for super admin security
    const passwordHash = await bcrypt.hash(data.password, 14);

    const user = await superAdminPrisma.superAdminUser.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role,
        department: data.department,
        isActive: true,
        mfaEnabled: false,
      }
    });

    // Log the account creation
    await this.auditLog(user.id, 'SUPER_ADMIN_CREATED', {
      newUserEmail: data.email,
      role: data.role,
      department: data.department
    }, '127.0.0.1', 'System');

    return this.sanitizeUser(user);
  }

  /**
   * Authenticate super admin user with email and password
   */
  async login(
    email: string, 
    password: string, 
    ipAddress: string, 
    userAgent?: string
  ): Promise<{ user: SuperAdminUser; requiresMFA: boolean; sessionToken?: string }> {
    const user = await superAdminPrisma.superAdminUser.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Check if user exists and is active
    if (!user || !user.isActive) {
      await this.logLoginAttempt(email, false, ipAddress, userAgent, 'User not found or inactive');
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.logLoginAttempt(email, false, ipAddress, userAgent, 'Account locked');
      throw new Error('Account is temporarily locked due to multiple failed login attempts');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      // Increment login attempts
      await this.handleFailedLogin(user.id);
      await this.logLoginAttempt(email, false, ipAddress, userAgent, 'Invalid password');
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on successful password verification
    await superAdminPrisma.superAdminUser.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null }
    });

    // Check if MFA is required
    if (user.mfaEnabled) {
      await this.logLoginAttempt(email, true, ipAddress, userAgent, 'Password verified, MFA required');
      return {
        user: this.sanitizeUser(user),
        requiresMFA: true
      };
    }

    // Create session if no MFA required
    const session = await this.createSession(user.id, ipAddress, userAgent, true);
    await this.logLoginAttempt(email, true, ipAddress, userAgent, 'Login successful');

    return {
      user: this.sanitizeUser(user),
      requiresMFA: false,
      sessionToken: session.sessionToken
    };
  }

  /**
   * Verify MFA token and complete login
   */
  async verifyMFA(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ sessionToken: string }> {
    const user = await superAdminPrisma.superAdminUser.findUnique({
      where: { id: userId }
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new Error('MFA not configured for this user');
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step tolerance
    });

    if (!verified) {
      await this.auditLog(userId, 'MFA_VERIFICATION_FAILED', { ipAddress }, ipAddress, userAgent);
      throw new Error('Invalid MFA token');
    }

    // Create session with MFA verified
    const session = await this.createSession(userId, ipAddress, userAgent, true);

    // Update last login
    await superAdminPrisma.superAdminUser.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });

    await this.auditLog(userId, 'MFA_LOGIN_SUCCESS', { ipAddress }, ipAddress, userAgent);

    return { sessionToken: session.sessionToken };
  }

  /**
   * Setup MFA for a user
   */
  async setupMFA(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await superAdminPrisma.superAdminUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `FlowVision Super Admin (${user.email})`,
      issuer: 'FlowVision'
    });

    // Store the secret (not yet enabled)
    await superAdminPrisma.superAdminUser.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 }
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    await this.auditLog(userId, 'MFA_SETUP_INITIATED', {}, '127.0.0.1', 'System');

    return {
      secret: secret.base32,
      qrCodeUrl
    };
  }

  /**
   * Enable MFA after verification
   */
  async enableMFA(userId: string, token: string): Promise<void> {
    const user = await superAdminPrisma.superAdminUser.findUnique({
      where: { id: userId }
    });

    if (!user || !user.mfaSecret) {
      throw new Error('MFA setup not initiated');
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      throw new Error('Invalid MFA token');
    }

    // Enable MFA
    await superAdminPrisma.superAdminUser.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });

    await this.auditLog(userId, 'MFA_ENABLED', {}, '127.0.0.1', 'System');
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string): Promise<SuperAdminUser | null> {
    const session = await superAdminPrisma.superAdminSession.findUnique({
      where: { sessionToken },
      include: { user: true }
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return null;
    }

    // Update last activity
    await superAdminPrisma.superAdminSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    return this.sanitizeUser(session.user);
  }

  /**
   * Create a new session
   */
  private async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    mfaVerified: boolean = false
  ): Promise<SuperAdminSession> {
    const sessionToken = jwt.sign(
      { userId, type: 'super_admin_session' },
      this.JWT_SECRET!,
      { expiresIn: '30m' }
    );

    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    const session = await superAdminPrisma.superAdminSession.create({
      data: {
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        isActive: true,
        expiresAt,
        mfaVerified
      }
    });

    return session;
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await superAdminPrisma.superAdminUser.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    const newAttempts = user.loginAttempts + 1;
    const updateData: any = { loginAttempts: newAttempts };

    // Lock account if max attempts reached
    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
    }

    await superAdminPrisma.superAdminUser.update({
      where: { id: userId },
      data: updateData
    });
  }

  /**
   * Log login attempts for security monitoring
   */
  private async logLoginAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    await this.auditLog(
      'system',
      success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      {
        email,
        ipAddress,
        userAgent,
        failureReason
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Audit logging for all super admin actions
   */
  async auditLog(
    userId: string,
    action: string,
    details: any,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    await superAdminPrisma.superAdminAuditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        userAgent
      }
    });
  }

  /**
   * Logout and invalidate session
   */
  async logout(sessionToken: string): Promise<void> {
    await superAdminPrisma.superAdminSession.update({
      where: { sessionToken },
      data: { isActive: false }
    });
  }

  /**
   * Emergency logout all sessions for a user
   */
  async emergencyLogoutAll(userId: string): Promise<void> {
    await superAdminPrisma.superAdminSession.updateMany({
      where: { userId },
      data: { isActive: false }
    });

    await this.auditLog(userId, 'EMERGENCY_LOGOUT_ALL', {}, '127.0.0.1', 'System');
  }

  /**
   * Sanitize user data for client response
   */
  private sanitizeUser(user: any): SuperAdminUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin
    };
  }

  /**
   * Extract request information for logging
   */
  static extractRequestInfo(request: NextRequest) {
    return {
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || undefined
    };
  }
}

// Export singleton instance
export const superAdminAuth = new SuperAdminAuthService();
