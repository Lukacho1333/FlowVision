import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConfigurationValidator } from '@/lib/config-validator';

/**
 * POST /api/admin/system-config/validate
 * Validates configuration values without saving them
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role (you may want to allow this for other roles too)
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { category, key, value, existingValue } = body;

    if (!category || !key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: category, key, value' },
        { status: 400 }
      );
    }

    // Validate the configuration
    const validationResult = await ConfigurationValidator.validateConfiguration(
      category,
      key,
      value,
      existingValue
    );

    // Run tests if validation passes
    let testResults = null;
    if (validationResult.valid) {
      const testResult = await ConfigurationValidator.testConfiguration(category, key, value);
      testResults = testResult;
    }

    return NextResponse.json({
      success: true,
      validation: validationResult,
      testResults,
    });
  } catch (error) {
    console.error('Error validating configuration:', error);
    return NextResponse.json({ error: 'Failed to validate configuration' }, { status: 500 });
  }
}
