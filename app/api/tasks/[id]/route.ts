import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updates
const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.number().int().min(0).optional(),
  estimatedHours: z.number().int().positive().optional(),
  actualHours: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.string().cuid().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/tasks/[id]
 * Get a specific task with full details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.solutionTask.findUnique({
      where: { id: params.id },
      include: {
        solution: {
          include: {
            initiative: {
              select: {
                id: true,
                title: true,
                ownerId: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check access rights
    if (user.role !== 'ADMIN' && task.solution.initiative.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate time tracking
    const timeTracking = {
      isOverdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED',
      daysRemaining: task.dueDate
        ? Math.ceil(
            (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
      hoursVariance:
        task.estimatedHours && task.actualHours ? task.actualHours - task.estimatedHours : null,
      efficiency:
        task.estimatedHours && task.actualHours && task.estimatedHours > 0
          ? Math.round((task.estimatedHours / task.actualHours) * 100)
          : null,
    };

    // Check if task is blocked (simplified since no dependencies exist yet)
    const isBlocked = false;
    const blockingTasks: any[] = [];

    const taskWithDetails = {
      ...task,
      timeTracking,
      isBlocked,
      blockingTasks,
    };

    return NextResponse.json({
      success: true,
      task: taskWithDetails,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateTaskSchema.parse(body);

    // Check if task exists and user has access
    const existingTask = await prisma.solutionTask.findUnique({
      where: { id: params.id },
      include: {
        solution: {
          include: {
            initiative: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check access rights
    if (user.role !== 'ADMIN' && existingTask.solution.initiative.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate assigned user if provided
    if (validatedData.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId },
        select: { id: true },
      });

      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
      }
    }

    // Validate due date if provided
    if (validatedData.dueDate) {
      const dueDate = new Date(validatedData.dueDate);
      // Allow past due dates for updates (user might be updating overdue tasks)
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    // Auto-set completion date when moving to COMPLETED
    if (validatedData.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    // Clear completion date when moving away from COMPLETED
    if (
      validatedData.status &&
      validatedData.status !== 'COMPLETED' &&
      existingTask.status === 'COMPLETED'
    ) {
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.solutionTask.update({
      where: { id: params.id },
      data: updateData,
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
      task: updatedTask,
      message: 'Task updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if task exists and user has access
    const task = await prisma.solutionTask.findUnique({
      where: { id: params.id },
      include: {
        solution: {
          include: {
            initiative: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check access rights (stricter for deletion)
    if (user.role !== 'ADMIN' && task.solution.initiative.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Admin or owner access required for deletion' },
        { status: 403 }
      );
    }

    // Check if other tasks depend on this one (simplified since no dependencies exist yet)
    // Dependencies not implemented yet, so safe to delete

    // Delete the task
    await prisma.solutionTask.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
