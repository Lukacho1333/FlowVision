import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConfigurationValidator } from '@/lib/config-validator';

/**
 * GET /api/admin/system-config/history
 * Retrieves configuration change history with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const key = searchParams.get('key');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get configuration history
    const history = await ConfigurationValidator.getConfigurationHistory(
      category || undefined,
      key || undefined,
      Math.min(limit, 100) // Cap at 100 for performance
    );

    return NextResponse.json({
      success: true,
      history,
      filters: {
        category: category || null,
        key: key || null,
        limit: Math.min(limit, 100),
      },
    });
  } catch (error) {
    console.error('Error fetching configuration history:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration history' }, { status: 500 });
  }
}
