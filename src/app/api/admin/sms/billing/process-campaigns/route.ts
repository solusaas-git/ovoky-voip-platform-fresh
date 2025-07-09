import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import SmsBilling from '@/models/SmsBilling';
import { SMSBillingService } from '@/lib/services/smsBillingService';

/**
 * POST /api/admin/sms/billing/process-campaigns
 * Process billing for all completed campaigns that don't have billing records yet
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    // Find all completed campaigns
    const completedCampaigns = await SmsCampaign.find({
      status: 'completed',
      completedAt: { $exists: true }
    }).select('_id userId name completedAt');

    if (completedCampaigns.length === 0) {
      return NextResponse.json({
        message: 'No completed campaigns found',
        processedCount: 0
      });
    }

    console.log(`📊 Found ${completedCampaigns.length} completed campaigns to check for billing`);

    let processedCount = 0;
    const results = [];

    for (const campaign of completedCampaigns) {
      try {
        // Check if billing already exists for this campaign
        const existingBilling = await SmsBilling.findOne({
          campaignId: campaign._id
        });

        if (existingBilling) {
          console.log(`⏭️ Campaign ${campaign._id} already has billing record, skipping`);
          continue;
        }

        // Process billing for this campaign
        await SMSBillingService.processCampaignBilling(campaign._id.toString());
        
        // Check if billing was created
        const newBilling = await SmsBilling.findOne({
          campaignId: campaign._id
        });
        
        if (newBilling) {
          processedCount++;
          results.push({
            campaignId: campaign._id,
            campaignName: campaign.name,
            status: 'processed',
            billingId: newBilling.id
          });
          console.log(`✅ Created billing for campaign: ${campaign.name} (${campaign._id})`);
        } else {
          results.push({
            campaignId: campaign._id,
            campaignName: campaign.name,
            status: 'skipped',
            reason: 'No delivered messages to bill'
          });
          console.log(`⚠️ Skipped campaign: ${campaign.name} (no delivered messages)`);
        }

      } catch (error) {
        console.error(`❌ Error processing campaign ${campaign._id}:`, error);
        results.push({
          campaignId: campaign._id,
          campaignName: campaign.name,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 Campaign billing processing complete: ${processedCount} campaigns processed`);

    return NextResponse.json({
      message: `Processed ${processedCount} completed campaigns for billing`,
      processedCount,
      totalCampaigns: completedCampaigns.length,
      results
    });

  } catch (error) {
    console.error('Error processing campaign billing:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign billing' },
      { status: 500 }
    );
  }
} 