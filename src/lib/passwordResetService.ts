import { logAndSendEmail } from './emailLogger';
import { generatePasswordResetEmail, PasswordResetEmailData } from './emailTemplates/authNotifications';
import { sendEmail } from './emailService';
import BrandingSettings from '@/models/BrandingSettings';
import User from '@/models/User';
import { connectToDatabase } from './db';

// Interfaces for type safety
interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface VerificationResult {
  valid: boolean;
  user?: UserInfo;
  message: string;
}

// Send password reset email
export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link shortly.'
      };
    }
    
    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // Get branding settings
    const brandingSettings = await BrandingSettings.findOne({});
    const branding = {
      companyName: brandingSettings?.companyName || 'OVOKY',
      companySlogan: brandingSettings?.companySlogan || 'Your trusted communications partner',
      primaryColor: brandingSettings?.primaryColor || '#667eea',
      fontFamily: brandingSettings?.fontFamily || 'Arial, sans-serif',
      supportEmail: brandingSettings?.supportEmail || 'support@ovoky.com',
      websiteUrl: brandingSettings?.websiteUrl || 'https://ovoky.com'
    };
    
    // Create reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    // Prepare email data
    const emailData: PasswordResetEmailData = {
      name: user.name,
      email: user.email,
      resetToken,
      resetUrl,
      branding
    };
    
    // Generate email content
    const htmlContent = generatePasswordResetEmail(emailData);
    
    // Send email with logging
    const emailLogData = {
      userId: (user._id as { toString(): string }).toString(),
      userEmail: user.email,
      userName: user.name,
      notificationType: 'password_reset' as const,
      emailSubject: `Reset Your Password - ${branding.companyName}`,
      emailBody: htmlContent.html,
      metadata: {
        resetTokenSent: true,
        expiresAt: user.passwordResetExpires
      }
    };

    await logAndSendEmail(emailLogData, async () => {
      // Send the actual email using the email service
      await sendEmail({
        to: user.email,
        subject: emailLogData.emailSubject,
        html: htmlContent.html,
        text: htmlContent.text
      });
      return { success: true };
    });
    
    return {
      success: true,
      message: 'Password reset email sent successfully. Please check your email for instructions.'
    };
    
  } catch (error) {
    console.error('Password reset email error:', error);
    throw new Error('Failed to send password reset email. Please try again later.');
  }
};

// Verify password reset token
export const verifyPasswordResetToken = async (token: string): Promise<VerificationResult> => {
  try {
    await connectToDatabase();
    
    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: { $exists: true },
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user || !user.isPasswordResetTokenValid(token)) {
      return {
        valid: false,
        message: 'Invalid or expired password reset token. Please request a new password reset.'
      };
    }
    
    return {
      valid: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      },
      message: 'Token is valid'
    };
    
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      valid: false,
      message: 'Error verifying token. Please try again.'
    };
  }
};

// Reset password with token
export const resetPasswordWithToken = async (
  token: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await connectToDatabase();
    
    // Verify token first
    const verification = await verifyPasswordResetToken(token);
    if (!verification.valid) {
      return {
        success: false,
        message: verification.message
      };
    }
    
    // Find user and update password
    const user = await User.findById(verification.user!.id);
    if (!user) {
      return {
        success: false,
        message: 'User not found. Please request a new password reset.'
      };
    }
    
    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    };
    
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Failed to reset password. Please try again later.'
    };
  }
}; 