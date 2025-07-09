import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { SchedulerService } from '@/services/SchedulerService';

// GET - Get scheduler status
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return information about the Vercel cron migration
    return NextResponse.json({ 
      success: true,
      migrated: true,
      message: 'Scheduler has been migrated to Vercel Cron Jobs',
      vercelCronJobs: [
        {
          name: 'Balance Checks',
          path: '/api/cron/process-balance-checks',
          schedule: '0 */6 * * *',
          description: 'Every 6 hours - Check user balances and send low balance notifications'
        },
        {
          name: 'KPI Alerts',
          path: '/api/cron/process-kpi-alerts', 
          schedule: '0 6 * * *',
          description: 'Daily at 6 AM - Check KPI thresholds and send alerts'
        },
        {
          name: 'Customer Notifications',
          path: '/api/cron/process-customer-notifications',
          schedule: '*/5 * * * *',
          description: 'Every 5 minutes - Execute scheduled customer notifications'
        },
        {
          name: 'Scheduled Billing',
          path: '/api/cron/process-scheduled-billing',
          schedule: '0 2 * * *',
          description: 'Daily at 2 AM - Process pending billing records'
        },
        {
          name: 'Backorder Approvals',
          path: '/api/cron/process-backorder-approvals',
          schedule: '0 1 * * *',
          description: 'Daily at 1 AM - Process approved backorder payments'
        },
        {
          name: 'Cleanup Tasks',
          path: '/api/cron/cleanup-expired-sessions',
          schedule: '0 3 * * *',
          description: 'Daily at 3 AM - Cleanup expired sessions and maintenance'
        }
      ],
      note: 'Internal scheduler is disabled. All tasks are now handled by Vercel Cron Jobs for better reliability and scalability.'
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Handle manual triggers and provide migration info
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Handle manual triggers that still work with the internal service
    const scheduler = SchedulerService.getInstance();

    switch (action) {
      case 'trigger_check':
        try {
          await scheduler.triggerBalanceCheck();
          return NextResponse.json({ 
            success: true, 
            message: 'Manual balance check triggered successfully',
            note: 'This is a manual trigger. Automatic checks are now handled by Vercel Cron Jobs.'
          });
        } catch (error) {
          return NextResponse.json({ 
            error: 'Failed to trigger balance check',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'trigger_kpi_check':
        try {
          await scheduler.triggerKpiAlertCheck();
          return NextResponse.json({ 
            success: true, 
            message: 'Manual KPI alert check triggered successfully',
            note: 'This is a manual trigger. Automatic checks are now handled by Vercel Cron Jobs.'
          });
        } catch (error) {
          return NextResponse.json({ 
            error: 'Failed to trigger KPI check',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'start':
      case 'stop':
      case 'restart':
      case 'update_schedule':
        return NextResponse.json({ 
          success: false,
          migrated: true,
          message: 'Scheduler operations have been migrated to Vercel Cron Jobs',
          info: 'The internal scheduler is no longer used. All scheduled tasks are now handled automatically by Vercel.',
          actions: {
            'Manual Balance Check': 'Use trigger_check action',
            'Manual KPI Check': 'Use trigger_kpi_check action',
            'View Cron Status': 'Check Vercel Functions dashboard',
            'Modify Schedules': 'Update vercel.json and redeploy'
          }
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Available actions: trigger_check, trigger_kpi_check',
          migrated: true,
          message: 'Most scheduler operations have been migrated to Vercel Cron Jobs'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing scheduler:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 