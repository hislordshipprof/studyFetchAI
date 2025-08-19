import sgMail from '@sendgrid/mail';

// Email service configuration
interface EmailConfig {
  from: string;
  service?: string;
  apiKey?: string;
}

const emailConfig: EmailConfig = {
  from: process.env.EMAIL_FROM || 'noreply@studyfetch.com',
  service: process.env.EMAIL_SERVICE || (process.env.NODE_ENV === 'production' ? 'sendgrid' : 'console'),
  apiKey: process.env.SENDGRID_API_KEY,
};

// Initialize SendGrid if API key is available
if (emailConfig.apiKey) {
  sgMail.setApiKey(emailConfig.apiKey);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    if (emailConfig.service === 'console' || !emailConfig.apiKey) {
      // Development mode or no API key - log email to console
      console.log('\n=== EMAIL SENT (Console Mode) ===');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML: ${html}`);
      console.log('=====================================\n');
      return true;
    }

    if (emailConfig.service === 'sendgrid') {
      // Production mode - send via SendGrid
      const msg = {
        to,
        from: emailConfig.from,
        subject,
        html,
      };

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${to}`);
      return true;
    }

    // Fallback to console
    console.warn('Email service not properly configured. Falling back to console output.');
    console.log('\n=== EMAIL SENT (Fallback) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
    console.log('==============================\n');
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log email to console as fallback
    console.log('\n=== EMAIL FAILED - Console Fallback ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
    console.log('=======================================\n');
    
    return false;
  }
}

export function generateVerificationEmailHTML(verificationUrl: string, userEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email - StudyFetch</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; text-align: center;">StudyFetch</h1>
        
        <h2>Verify Your Email Address</h2>
        
        <p>Hi there!</p>
        
        <p>Thanks for signing up for StudyFetch! To complete your registration and start using our AI-powered study tools, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        
        <p>If the button above doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
        
        <p><strong>This verification link will expire in 24 hours.</strong></p>
        
        <p>If you didn't create an account with StudyFetch, you can safely ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
          This email was sent to ${userEmail}. If you have any questions, please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;
}