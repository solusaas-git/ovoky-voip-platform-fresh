import { connectToDatabase } from '@/lib/db';
import KpiSettingsModel, { IKpiSettings } from '@/models/KpiSettings';
import UserModel from '@/models/User';
import { sendEmail } from '@/lib/emailService';
import { logAndSendEmail } from '@/lib/emailLogger';
import { 
  generateHighCostAlertEmail, 
  generateLowAsrAlertEmail, 
  generateExtremeUsageAlertEmail 
} from '@/lib/emailTemplates/kpiAlerts';

interface KpiData {
  costOfDay: number;
  asr: number;
  totalMinutes: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  currency: string;
}

interface AlertStatus {
  highCostAlert: boolean;
  lowAsrAlert: boolean;
  extremeUsageAlert: boolean;
}

export class KpiAlertService {
  private static instance: KpiAlertService;
  private lastAlertStatus: Map<string, AlertStatus> = new Map();

  private constructor() {}

  public static getInstance(): KpiAlertService {
    if (!KpiAlertService.instance) {
      KpiAlertService.instance = new KpiAlertService();
    }
    return KpiAlertService.instance;
  }

  /**
   * Check KPI thresholds for all users and send alerts if needed
   */
  public async checkAllUsersKpiAlerts(kpiDataByUser: Map<string, KpiData>): Promise<void> {
    try {
      await connectToDatabase();
      
      // Get all admin users with KPI settings
      const adminUsers = await UserModel.find({ role: 'admin' }).lean();
      
      for (const user of adminUsers) {
        const kpiData = kpiDataByUser.get(user._id.toString());
        if (kpiData) {
          await this.checkUserKpiAlerts(user._id.toString(), kpiData, user.name, user.email);
        }
      }
    } catch (error) {
      console.error('Error checking KPI alerts for all users:', error);
    }
  }

  /**
   * Check KPI thresholds for a specific user and send alerts if needed
   */
  public async checkUserKpiAlerts(
    userId: string, 
    kpiData: KpiData, 
    userName: string, 
    userEmail: string
  ): Promise<void> {
    try {
      await connectToDatabase();
      
      // Get user's KPI settings
      const settings = await KpiSettingsModel.findOne({ userId }).lean() as IKpiSettings | null;
      if (!settings || !settings.enableNotifications) {
        console.log(`⚠️ No KPI settings found or notifications disabled for user ${userId}`);
        return; // No settings or notifications disabled
      }

      console.log(`🔔 Checking KPI alerts for user ${userId} (${userName})`);
      console.log(`📊 KPI Data:`, kpiData);
      console.log(`⚙️ Settings:`, {
        costThresholds: settings.costThresholds,
        asrThresholds: settings.asrThresholds,
        totalMinutesThresholds: settings.totalMinutesThresholds,
        notificationThresholds: settings.notificationThresholds
      });

      const currentDate = new Date().toLocaleDateString();
      const currentAlertStatus: AlertStatus = {
        highCostAlert: false,
        lowAsrAlert: false,
        extremeUsageAlert: false
      };

      // Check high cost alert
      console.log(`💰 Checking High Cost Alert: ${kpiData.costOfDay} > ${settings.costThresholds.medium} = ${kpiData.costOfDay > settings.costThresholds.medium}`);
      console.log(`💰 High Cost Alert enabled: ${settings.notificationThresholds.highCostAlert}`);
      console.log(`💰 Alert already sent: ${this.hasAlertBeenSent(userId, 'highCostAlert')}`);
      
      if (settings.notificationThresholds.highCostAlert && 
          kpiData.costOfDay > settings.costThresholds.medium) {
        currentAlertStatus.highCostAlert = true;
        
        // Only send if we haven't already sent this alert today
        if (!this.hasAlertBeenSent(userId, 'highCostAlert')) {
          console.log(`📧 Sending High Cost Alert to ${userEmail}`);
          await this.sendHighCostAlert(settings, kpiData, userName, userEmail, currentDate, userId);
          console.log(`📧 High cost alert sent to ${userEmail} - Cost: ${kpiData.costOfDay} ${kpiData.currency}`);
        } else {
          console.log(`⏭️ High cost alert already sent today for user ${userId}`);
        }
      } else {
        console.log(`❌ High cost alert not triggered for user ${userId}`);
      }

      // Check low ASR alert
      console.log(`📈 Checking Low ASR Alert: ${kpiData.asr} < ${settings.asrThresholds.fair} = ${kpiData.asr < settings.asrThresholds.fair}`);
      console.log(`📈 Low ASR Alert enabled: ${settings.notificationThresholds.lowAsrAlert}`);
      console.log(`📈 Alert already sent: ${this.hasAlertBeenSent(userId, 'lowAsrAlert')}`);
      
      if (settings.notificationThresholds.lowAsrAlert && 
          kpiData.asr < settings.asrThresholds.fair) {
        currentAlertStatus.lowAsrAlert = true;
        
        // Only send if we haven't already sent this alert today
        if (!this.hasAlertBeenSent(userId, 'lowAsrAlert')) {
          console.log(`📧 Sending Low ASR Alert to ${userEmail}`);
          await this.sendLowAsrAlert(settings, kpiData, userName, userEmail, currentDate, userId);
          console.log(`📧 Low ASR alert sent to ${userEmail} - ASR: ${kpiData.asr.toFixed(1)}%`);
        } else {
          console.log(`⏭️ Low ASR alert already sent today for user ${userId}`);
        }
      } else {
        console.log(`❌ Low ASR alert not triggered for user ${userId}`);
      }

      // Check extreme usage alert
      console.log(`⏱️ Checking Extreme Usage Alert: ${kpiData.totalMinutes} > ${settings.totalMinutesThresholds.heavy} = ${kpiData.totalMinutes > settings.totalMinutesThresholds.heavy}`);
      console.log(`⏱️ Extreme Usage Alert enabled: ${settings.notificationThresholds.extremeUsageAlert}`);
      console.log(`⏱️ Alert already sent: ${this.hasAlertBeenSent(userId, 'extremeUsageAlert')}`);
      
      if (settings.notificationThresholds.extremeUsageAlert && 
          kpiData.totalMinutes > settings.totalMinutesThresholds.heavy) {
        currentAlertStatus.extremeUsageAlert = true;
        
        // Only send if we haven't already sent this alert today
        if (!this.hasAlertBeenSent(userId, 'extremeUsageAlert')) {
          console.log(`📧 Sending Extreme Usage Alert to ${userEmail}`);
          await this.sendExtremeUsageAlert(settings, kpiData, userName, userEmail, currentDate, userId);
          console.log(`📧 Extreme usage alert sent to ${userEmail} - Minutes: ${kpiData.totalMinutes}`);
        } else {
          console.log(`⏭️ Extreme usage alert already sent today for user ${userId}`);
        }
      } else {
        console.log(`❌ Extreme usage alert not triggered for user ${userId}`);
      }

      // Update alert status for this user
      this.lastAlertStatus.set(userId, currentAlertStatus);
      console.log(`📋 Updated alert status for user ${userId}:`, currentAlertStatus);

    } catch (error) {
      console.error(`Error checking KPI alerts for user ${userId}:`, error);
    }
  }

  /**
   * Check if an alert has already been sent today for this user
   */
  private hasAlertBeenSent(userId: string, alertType: keyof AlertStatus): boolean {
    const lastStatus = this.lastAlertStatus.get(userId);
    return lastStatus ? lastStatus[alertType] : false;
  }

  /**
   * Send high cost alert email
   */
  private async sendHighCostAlert(
    settings: IKpiSettings, 
    kpiData: KpiData, 
    userName: string, 
    userEmail: string, 
    date: string,
    userId?: string
  ): Promise<void> {
    try {
      const avgCostPerCall = kpiData.totalCalls > 0 ? kpiData.costOfDay / kpiData.totalCalls : 0;
      
      const emailData = generateHighCostAlertEmail({
        costOfDay: kpiData.costOfDay,
        threshold: settings.costThresholds.medium,
        currency: kpiData.currency,
        totalCalls: kpiData.totalCalls,
        avgCostPerCall,
        date,
        userName,
        userEmail,
        branding: {
          companyName: 'Sippy Portal',
          primaryColor: '#2563eb',
          fontFamily: 'Arial, sans-serif'
        }
      });

      // Log and send email
      await logAndSendEmail(
        {
          userId: userId || 'system',
          userEmail: userEmail,
          userName: userName,
          notificationType: 'high_cost_alert',
          emailSubject: emailData.subject,
          emailBody: emailData.html
        },
        () => sendEmail({
          to: userEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })
      );
    } catch (error) {
      console.error('Error sending high cost alert:', error);
    }
  }

  /**
   * Send low ASR alert email
   */
  private async sendLowAsrAlert(
    settings: IKpiSettings, 
    kpiData: KpiData, 
    userName: string, 
    userEmail: string, 
    date: string,
    userId?: string
  ): Promise<void> {
    try {
      const emailData = generateLowAsrAlertEmail({
        asr: kpiData.asr,
        threshold: settings.asrThresholds.fair,
        totalCalls: kpiData.totalCalls,
        successfulCalls: kpiData.successfulCalls,
        failedCalls: kpiData.failedCalls,
        date,
        userName,
        userEmail,
        branding: {
          companyName: 'Sippy Portal',
          primaryColor: '#2563eb',
          fontFamily: 'Arial, sans-serif'
        }
      });

      // Log and send email
      await logAndSendEmail(
        {
          userId: userId || 'system',
          userEmail: userEmail,
          userName: userName,
          notificationType: 'low_asr_alert',
          emailSubject: emailData.subject,
          emailBody: emailData.html
        },
        () => sendEmail({
          to: userEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })
      );
    } catch (error) {
      console.error('Error sending low ASR alert:', error);
    }
  }

  /**
   * Send extreme usage alert email
   */
  private async sendExtremeUsageAlert(
    settings: IKpiSettings, 
    kpiData: KpiData, 
    userName: string, 
    userEmail: string, 
    date: string,
    userId?: string
  ): Promise<void> {
    try {
      const avgMinutesPerCall = kpiData.totalCalls > 0 ? kpiData.totalMinutes / kpiData.totalCalls : 0;
      
      const emailData = generateExtremeUsageAlertEmail({
        totalMinutes: kpiData.totalMinutes,
        threshold: settings.totalMinutesThresholds.heavy,
        totalCalls: kpiData.totalCalls,
        avgMinutesPerCall,
        date,
        userName,
        userEmail,
        branding: {
          companyName: 'Sippy Portal',
          primaryColor: '#2563eb',
          fontFamily: 'Arial, sans-serif'
        }
      });

      // Log and send email
      await logAndSendEmail(
        {
          userId: userId || 'system',
          userEmail: userEmail,
          userName: userName,
          notificationType: 'extreme_usage_alert',
          emailSubject: emailData.subject,
          emailBody: emailData.html
        },
        () => sendEmail({
          to: userEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })
      );
    } catch (error) {
      console.error('Error sending extreme usage alert:', error);
    }
  }

  /**
   * Reset alert status (call this at the start of each day)
   */
  public resetDailyAlerts(): void {
    this.lastAlertStatus.clear();
    console.log('🔄 Daily KPI alert status reset');
  }

  /**
   * Get current alert status for debugging
   */
  public getAlertStatus(): Map<string, AlertStatus> {
    return new Map(this.lastAlertStatus);
  }
}

// Export singleton instance
export const kpiAlertService = KpiAlertService.getInstance(); 