import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { cronExecutionService } from '@/lib/services/cronExecutionService';

// GET - Get cron job execution summaries
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobName = searchParams.get('job');
    const action = searchParams.get('action');

    // Get execution history for a specific job
    if (jobName && action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const history = await cronExecutionService.getJobExecutionHistory(jobName, limit);
      
      return NextResponse.json({
        success: true,
        data: history,
      });
    }

    // Get recent failures
    if (action === 'failures') {
      const hours = parseInt(searchParams.get('hours') || '24');
      const failures = await cronExecutionService.getRecentFailures(hours);
      
      return NextResponse.json({
        success: true,
        data: failures,
      });
    }

    // Get execution summaries for all jobs (default)
    const summaries = await cronExecutionService.getExecutionSummaries();
    
    return NextResponse.json({
      success: true,
      data: summaries,
    });

  } catch (error) {
    console.error('Error fetching cron execution data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron execution data' },
      { status: 500 }
    );
  }
} 