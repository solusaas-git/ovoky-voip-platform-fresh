import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { cronScheduleService } from '@/lib/services/cronScheduleService';

// GET - Get all cron job schedules
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await cronScheduleService.getAllSchedules();
    
    return NextResponse.json({
      success: true,
      data: schedules,
    });

  } catch (error) {
    console.error('Error fetching cron schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron schedules' },
      { status: 500 }
    );
  }
}

// POST - Update cron job schedule
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobName, schedule, description, enabled } = body;

    switch (action) {
      case 'update':
        if (!jobName) {
          return NextResponse.json({ error: 'Job name is required' }, { status: 400 });
        }

        // Validate cron expression if provided
        if (schedule) {
          const validation = cronScheduleService.validateCronExpression(schedule);
          if (!validation.valid) {
            return NextResponse.json({ 
              error: `Invalid schedule: ${validation.error}` 
            }, { status: 400 });
          }
        }

        const updates: any = {};
        if (schedule !== undefined) updates.schedule = schedule;
        if (description !== undefined) updates.description = description;
        if (enabled !== undefined) updates.enabled = enabled;

        const updatedSchedule = await cronScheduleService.updateSchedule(
          jobName,
          updates,
          currentUser.email
        );

        if (!updatedSchedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'Schedule updated successfully',
          data: updatedSchedule,
        });

      case 'reset':
        if (!jobName) {
          return NextResponse.json({ error: 'Job name is required' }, { status: 400 });
        }

        const resetSchedule = await cronScheduleService.resetToDefault(
          jobName,
          currentUser.email
        );

        if (!resetSchedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'Schedule reset to default successfully',
          data: resetSchedule,
        });

      case 'validate':
        if (!schedule) {
          return NextResponse.json({ error: 'Schedule is required' }, { status: 400 });
        }

        const validation = cronScheduleService.validateCronExpression(schedule);
        
        return NextResponse.json({
          success: true,
          valid: validation.valid,
          error: validation.error,
          description: validation.valid 
            ? cronScheduleService.describeCronExpression(schedule)
            : undefined,
        });

      case 'initialize':
        // Initialize default schedules
        await cronScheduleService.initializeDefaultSchedules(currentUser.email);
        
        return NextResponse.json({
          success: true,
          message: 'Default schedules initialized successfully',
        });

      case 'refresh-all':
        // Refresh all existing schedules with updated defaults (including manual trigger support)
        await cronScheduleService.refreshAllSchedules(currentUser.email);
        
        return NextResponse.json({
          success: true,
          message: 'All schedules refreshed with manual trigger support',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error managing cron schedules:', error);
    return NextResponse.json(
      { error: 'Failed to manage cron schedules' },
      { status: 500 }
    );
  }
} 