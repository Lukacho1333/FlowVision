import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { ConfigurationValidator } from '@/lib/config-validator';

const prisma = new PrismaClient();

/**
 * GET /api/admin/system-config
 * Retrieves all system configurations for admin management
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all configurations
    const configurations = await prisma.systemConfiguration.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      include: {
        updatedUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log the admin access
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_CONFIG_VIEW',
        details: {
          configurationsCount: configurations.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Error fetching system configurations:', error);
    return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/system-config
 * Updates a system configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, value, description, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    // Get the existing configuration
    const existingConfig = await prisma.systemConfiguration.findUnique({
      where: { id },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Validate the new value based on data type
    let validatedValue = value;
    try {
      switch (existingConfig.dataType) {
        case 'number':
          if (typeof value !== 'number') {
            validatedValue = Number(value);
            if (isNaN(validatedValue)) {
              throw new Error('Invalid number value');
            }
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            validatedValue = value === 'true' || value === true;
          }
          break;
        case 'json':
        case 'array':
          // Value should already be parsed JSON from the frontend
          if (typeof value === 'string') {
            validatedValue = JSON.parse(value);
          }
          break;
        case 'string':
          validatedValue = String(value);
          break;
      }
    } catch (error) {
      return NextResponse.json(
        { error: `Invalid value for data type ${existingConfig.dataType}` },
        { status: 400 }
      );
    }

    // Enhanced validation using ConfigurationValidator
    const validationResult = await ConfigurationValidator.validateConfiguration(
      existingConfig.category,
      existingConfig.key,
      validatedValue,
      existingConfig.value
    );

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Configuration validation failed',
          details: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
        },
        { status: 400 }
      );
    }

    // Run configuration tests if available
    const testResult = await ConfigurationValidator.testConfiguration(
      existingConfig.category,
      existingConfig.key,
      validatedValue
    );

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Configuration tests failed',
          details: testResult.errors,
          testResults: testResult.results,
        },
        { status: 400 }
      );
    }

    // Update the configuration
    const updatedConfig = await prisma.systemConfiguration.update({
      where: { id },
      data: {
        value: validatedValue,
        description: description || existingConfig.description,
        isActive: isActive !== undefined ? isActive : existingConfig.isActive,
        updatedBy: session.user.id,
        version: { increment: 1 },
      },
      include: {
        updatedUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Enhanced audit logging with validation results
    await ConfigurationValidator.auditConfigurationChange(
      existingConfig.category,
      existingConfig.key,
      existingConfig.value,
      validatedValue,
      session.user.id,
      validationResult
    );

    // Also log the configuration change with test results
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_CONFIG_UPDATE',
        details: {
          configurationId: id,
          category: existingConfig.category,
          key: existingConfig.key,
          oldValue: existingConfig.value,
          newValue: validatedValue,
          oldVersion: existingConfig.version,
          newVersion: updatedConfig.version,
          validation: {
            valid: validationResult.valid,
            errorsCount: validationResult.errors.length,
            warningsCount: validationResult.warnings.length,
            suggestionsCount: validationResult.suggestions.length,
          },
          testResults: testResult.results,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      configuration: updatedConfig,
      message: 'Configuration updated successfully',
      validation: {
        valid: validationResult.valid,
        warnings: validationResult.warnings,
        suggestions: validationResult.suggestions,
      },
      testResults: testResult.success ? testResult.results : null,
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}

/**
 * POST /api/admin/system-config
 * Creates a new system configuration (if needed)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      category,
      key,
      value,
      dataType,
      description,
      environment = 'all',
      scope = 'global',
    } = await request.json();

    if (!category || !key || value === undefined || !dataType) {
      return NextResponse.json(
        { error: 'Category, key, value, and dataType are required' },
        { status: 400 }
      );
    }

    // Check if configuration already exists
    const existingConfig = await prisma.systemConfiguration.findUnique({
      where: {
        category_key_environment_scope: {
          category,
          key,
          environment,
          scope,
        },
      },
    });

    if (existingConfig) {
      return NextResponse.json({ error: 'Configuration already exists' }, { status: 409 });
    }

    // Create the configuration
    const newConfig = await prisma.systemConfiguration.create({
      data: {
        category,
        key,
        value,
        dataType,
        description,
        environment,
        scope,
        updatedBy: session.user.id,
      },
      include: {
        updatedUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log the configuration creation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_CONFIG_CREATE',
        details: {
          configurationId: newConfig.id,
          category,
          key,
          value,
          environment,
          scope,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      configuration: newConfig,
      message: 'Configuration created successfully',
    });
  } catch (error) {
    console.error('Error creating system configuration:', error);
    return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/system-config
 * Deactivates a system configuration (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    // Soft delete by deactivating
    const updatedConfig = await prisma.systemConfiguration.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: session.user.id,
        version: { increment: 1 },
      },
    });

    // Log the configuration deactivation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_CONFIG_DEACTIVATE',
        details: {
          configurationId: id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating system configuration:', error);
    return NextResponse.json({ error: 'Failed to deactivate configuration' }, { status: 500 });
  }
}

/**
 * Validate scoring thresholds to ensure they are in proper order
 */
function validateScoringThresholds(thresholds: any): boolean {
  if (typeof thresholds !== 'object' || !thresholds) {
    return false;
  }

  const { critical, high, medium, low } = thresholds;

  if (
    typeof critical !== 'number' ||
    typeof high !== 'number' ||
    typeof medium !== 'number' ||
    typeof low !== 'number'
  ) {
    return false;
  }

  // Check that thresholds are in descending order
  if (critical <= high || high <= medium || medium <= low) {
    return false;
  }

  // Check that all values are within valid range (0-100)
  if (
    critical < 0 ||
    critical > 100 ||
    high < 0 ||
    high > 100 ||
    medium < 0 ||
    medium > 100 ||
    low < 0 ||
    low > 100
  ) {
    return false;
  }

  return true;
}
