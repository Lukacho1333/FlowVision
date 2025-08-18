import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assignedToId: z.string().cuid().optional(),
  priority: z.number().int().min(0).optional(),
  estimatedHours: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isAIGenerated: z.boolean().optional(),
  aiConfidence: z.number().int().min(0).max(100).optional(),
  aiReasoning: z.string().optional(),
});

/**
 * GET /api/solutions/[id]/tasks
 * Get all tasks for a solution
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TaskStatus | null;
    const assignedToId = searchParams.get('assignedToId');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // Verify user has access to the solution
    const solution = await prisma.initiativeSolution.findUnique({
      where: { id: params.id },
      include: {
        initiative: {
          select: {
            id: true,
            ownerId: true,
            title: true,
          },
        },
      },
    });

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    // Check access rights
    if (user.role !== 'ADMIN' && solution.initiative.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build where clause
    const where: any = {
      solutionId: params.id,
    };

    if (status) {
      where.status = status;
    } else if (!includeCompleted) {
      where.status = { not: 'COMPLETED' };
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const tasks = await prisma.solutionTask.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { status: 'asc' }, { createdAt: 'asc' }],
    });

    // Calculate task statistics
    const stats = {
      total: tasks.length,
      byStatus: tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
      totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      averageProgress:
        tasks.length > 0
          ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
          : 0,
      overdueTasks: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
      ).length,
    };

    return NextResponse.json({
      success: true,
      tasks,
      stats,
      solution: {
        id: solution.id,
        title: solution.title,
        initiative: {
          id: solution.initiative.id,
          title: solution.initiative.title,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

/**
 * POST /api/solutions/[id]/tasks
 * Create a new task for a solution
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateTaskSchema.parse(body);

    // Verify user has access to the solution
    const solution = await prisma.initiativeSolution.findUnique({
      where: { id: params.id },
      include: {
        initiative: {
          select: {
            id: true,
            ownerId: true,
            title: true,
          },
        },
      },
    });

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    // Check access rights
    if (user.role !== 'ADMIN' && solution.initiative.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate assigned user if provided
    if (validatedData.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId },
        select: { id: true, name: true },
      });

      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
      }
    }

    // Validate due date
    if (validatedData.dueDate) {
      const dueDate = new Date(validatedData.dueDate);
      const now = new Date();

      if (dueDate <= now) {
        return NextResponse.json({ error: 'Due date must be in the future' }, { status: 400 });
      }
    }

    // Create the task
    const task = await prisma.solutionTask.create({
      data: {
        ...validatedData,
        solutionId: params.id,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        tags: validatedData.tags || [],
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        solution: {
          select: {
            id: true,
            title: true,
            initiative: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      task,
      message: 'Task created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
