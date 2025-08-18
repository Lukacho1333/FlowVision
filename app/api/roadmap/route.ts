import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMultiTenantContext, createTenantWhereClause } from '@/lib/multi-tenant-utils';

// Force dynamic server-side rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Enforce multi-tenant isolation following .cursorrules
    const tenantContext = await getMultiTenantContext(request);

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'timeline';
    const phase = searchParams.get('phase');
    const team = searchParams.get('team');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter conditions with MANDATORY organizationId isolation
    const where = createTenantWhereClause(tenantContext, {});

    if (phase) {
      where.phase = phase;
    }

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({
          timelineStart: {
            gte: new Date(startDate),
          },
        });
      }
      if (endDate) {
        where.AND.push({
          timelineEnd: {
            lte: new Date(endDate),
          },
        });
      }
    }

    // Add team filter if specified
    let teamFilter: any = {};
    if (team) {
      teamFilter = {
        assignments: {
          some: {
            team: {
              name: team,
            },
          },
        },
      };
      where.AND = where.AND || [];
      where.AND.push(teamFilter);
    }

    const initiatives = await prisma.initiative.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        assignments: {
          include: {
            team: {
              select: { id: true, name: true, department: true, capacity: true, skills: true },
            },
          },
        },
      },
      orderBy: [{ priorityScore: 'desc' }, { timelineStart: 'asc' }],
    });

    // Calculate timeline metrics
    const now = new Date();
    const metrics = {
      totalInitiatives: initiatives.length,
      activeInitiatives: initiatives.filter((i) => i.status === 'In Progress').length,
      completedInitiatives: initiatives.filter((i) => i.status === 'Done').length,
      overdueMilestones: initiatives.reduce((acc, init) => {
        const overdue = init.milestones.filter(
          (m) => m.status !== 'completed' && new Date(m.dueDate) < now
        ).length;
        return acc + overdue;
      }, 0),
      totalBudget: initiatives.reduce((acc, init) => acc + (init.budget || 0), 0),
      totalHours: initiatives.reduce((acc, init) => acc + (init.estimatedHours || 0), 0),
    };

    // Prepare roadmap data based on view type
    let roadmapData: any = {
      initiatives,
      metrics,
    };

    if (view === 'timeline') {
      // Group initiatives by quarter for timeline view
      const quarters = initiatives.reduce((acc: any, init) => {
        if (init.timelineStart) {
          const quarter = `Q${Math.floor(init.timelineStart.getMonth() / 3) + 1} ${init.timelineStart.getFullYear()}`;
          if (!acc[quarter]) {
            acc[quarter] = [];
          }
          acc[quarter].push(init);
        }
        return acc;
      }, {});
      roadmapData.quarters = quarters;
    }

    if (view === 'resource') {
      // Get team utilization data
      const teams = await prisma.team.findMany({
        include: {
          assignments: {
            include: {
              initiative: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  timelineStart: true,
                  timelineEnd: true,
                },
              },
            },
          },
        },
      });

      const teamUtilization = teams.map((team) => {
        const totalAllocated = team.assignments.reduce((acc, assignment) => {
          // Only count active initiatives
          if (
            assignment.initiative.status === 'In Progress' ||
            assignment.initiative.status === 'Prioritize'
          ) {
            return acc + assignment.hoursAllocated;
          }
          return acc;
        }, 0);

        const utilizationPercent =
          team.capacity > 0 ? (totalAllocated / (team.capacity * 4)) * 100 : 0; // 4 weeks per month average

        return {
          ...team,
          totalAllocated,
          utilizationPercent: Math.round(utilizationPercent),
          isOverallocated: utilizationPercent > 100,
        };
      });

      roadmapData.teamUtilization = teamUtilization;
    }

    // Log audit event with tenant isolation
    await prisma.auditLog.create({
      data: {
        userId: tenantContext.userId,
        organizationId: tenantContext.organizationId,
        action: 'ROADMAP_VIEW',
        details: { view, filters: { phase, team, startDate, endDate } },
      },
    });

    return NextResponse.json(roadmapData);
  } catch (error) {
    console.error('Roadmap fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch roadmap data' }, { status: 500 });
  }
}
