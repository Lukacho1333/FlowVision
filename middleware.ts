import { NextRequest, NextResponse } from 'next/server';

// Simple console logger to avoid import issues in middleware
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args)
};

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Enhanced logging for all requests
  const logContext = {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Log API requests with detailed context
  if (request.nextUrl.pathname.startsWith('/api/')) {
    logger.info('API Request',
      request.nextUrl.pathname,
      request.method,
      undefined, // userId will be determined in the API route
      {
        headers: Object.fromEntries(request.headers.entries()),
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        ...logContext,
      }
    );
  }

  // Log GitHub webhook requests
  if (request.nextUrl.pathname.startsWith('/api/github/')) {
    logger.github(
      'GitHub webhook received',
      {
        action: request.headers.get('x-github-event') || 'unknown',
      },
      {
        delivery: request.headers.get('x-github-delivery'),
        signature: request.headers.get('x-hub-signature-256') ? '[PRESENT]' : '[MISSING]',
        ...logContext,
      }
    );
  }

  // Log authentication attempts
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    logger.info('Authentication request', {
      component: 'auth',
      operation: request.nextUrl.pathname.split('/').pop(),
      ...logContext,
    });
  }

  // Log AI service requests
  if (request.nextUrl.pathname.startsWith('/api/ai/')) {
    logger.info('AI service request', {
      component: 'ai',
      operation: request.nextUrl.pathname.split('/').pop(),
      ...logContext,
    });
  }

  // Create response and add timing
  const response = NextResponse.next();

  // Add request ID to response headers for tracing
  response.headers.set('x-request-id', requestId);

  // Add security headers
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');

  // Log response timing
  const duration = Date.now() - startTime;

  if (request.nextUrl.pathname.startsWith('/api/')) {
    logger.info('API Response',
      request.nextUrl.pathname,
      request.method,
      200, // Will be updated by the actual response
      duration,
      { requestId }
    );
  }

  // Performance monitoring for slow requests
  if (duration > 1000) {
    logger.warn(`Slow request detected: ${request.method} ${request.nextUrl.pathname}`, {
      component: 'performance',
      operation: 'slow_request',
      performance: { duration, startTime },
      metadata: logContext,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
