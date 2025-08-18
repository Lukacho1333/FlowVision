import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMultiTenantContext, createTenantWhereClause } from '@/lib/multi-tenant-utils';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Enforce multi-tenant isolation following .cursorrules
    const tenantContext = await getMultiTenantContext(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build filter conditions with MANDATORY tenant isolation
    const where = createTenantWhereClause(tenantContext, {});

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    // Build sort conditions
    let orderBy: any = { createdAt: 'desc' }; // default newest

    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'votes':
        orderBy = { votes: 'desc' };
        break;
      case 'priority':
        orderBy = [
          { priority: 'desc' }, // high first
          { votes: 'desc' },
        ];
        break;
    }

    const ideas = await prisma.idea.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        initiative: {
          select: { id: true, title: true },
        },
      },
      orderBy,
    });

    return NextResponse.json(ideas);
  } catch (error) {
    console.error('Ideas fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority, tags } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        tags: tags || [],
        authorId: session.user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        initiative: {
          select: { id: true, title: true },
        },
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'IDEA_CREATE',
        details: { ideaId: idea.id, title },
      },
    });

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error('Idea creation error:', error);
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
  }
}
