import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse include parameter from query string
  const { searchParams } = new URL(req.url);
  const includeParam = searchParams.get('include');
  const includes = includeParam ? includeParam.split(',') : [];

  // SECURITY FIX: Always filter by organizationId for tenant isolation  
  // Admin users can access all initiatives in their organization, others only their own
  const whereClause = {
    id: params.id,
    organizationId: user.organizationId, // CRITICAL: Always filter by organization
    ...(user.role === 'ADMIN' ? {} : { ownerId: user.id }) // Admin sees all in their org
  };

  // Build include object based on requested includes
  const includeClause: any = {
    owner: {
      select: {
        name: true,
        email: true,
        role: true,
      },
    },
    cluster: {
      select: {
        id: true,
        name: true,
        category: true,
        severity: true,
      },
    },
    milestones: {
      orderBy: { dueDate: 'asc' },
    },
    comments: {
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
  };

  // Add optional includes
  if (includes.includes('addressedIssues')) {
    includeClause.addressedIssues = {
      select: {
        id: true,
        description: true,
        category: true,
        status: true,
        votes: true,
        heatmapScore: true,
        createdAt: true,
      },
      orderBy: { heatmapScore: 'desc' },
    };
  }

  const initiative = await prisma.initiative.findFirst({
    where: whereClause,
    include: includeClause,
  });

  if (!initiative)
    return NextResponse.json({ error: 'Initiative not found or access denied' }, { status: 404 });
  return NextResponse.json(initiative);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify initiative exists and user has permission to edit
  const existingInitiative = await prisma.initiative.findFirst({
    where: user.role === 'ADMIN' ? { id: params.id } : { id: params.id, ownerId: user.id },
  });

  if (!existingInitiative) {
    return NextResponse.json({ error: 'Initiative not found or access denied' }, { status: 404 });
  }

  const body = await req.json();
  const {
    title,
    problem,
    goal,
    kpis,
    requirements,
    acceptanceCriteria,
    timelineStart,
    timelineEnd,
    status,
    progress,
  } = body ?? {};

  const updated = await prisma.initiative.update({
    where: { id: params.id },
    data: {
      title,
      problem,
      goal,
      kpis,
      requirements,
      acceptanceCriteria,
      timelineStart: timelineStart ? new Date(timelineStart) : null,
      timelineEnd: timelineEnd ? new Date(timelineEnd) : null,
      status,
      progress,
    },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'INITIATIVE_UPDATE', details: { id: params.id } },
  });
  return NextResponse.json(updated);
}
