import nodemailer from 'nodemailer';
import juice from 'juice';
import { appLogger } from '../infrastructure/services/appLogger.js';

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EXCHANGE_HOST || 'localhost',
    port: Number(process.env.EXCHANGE_PORT) || 25,
    secure: false, // False for port 25/587
    auth: {
      user: process.env.POWER_USER || '',
      pass: process.env.EXCHANGE_PASSWORD || '',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Mail options generator with inline CSS
const createMailOptions = (recipient: string, subject: string, html: string) => {
  const rawHtml = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
            direction: rtl;
            text-align: right;
          }
          .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f4f6f8;
            padding: 40px 0;
          }
          .main {
            background-color: #ffffff;
            margin: 0 auto;
            width: 100%;
            max-width: 580px;
            border-spacing: 0;
            font-family: 'Segoe UI', sans-serif;
            color: #171717;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
          }
          .header {
            padding: 32px 0 24px;
            text-align: center;
            background-color: #ffffff;
            border-bottom: 1px solid #f0f0f0;
          }
          .logo-text {
            font-size: 28px; 
            font-weight: 800; 
            text-decoration: none;
            display: inline-block;
          }
          .content {
            padding: 32px 40px;
            font-size: 16px;
            line-height: 1.6;
            color: #334155;
          }
          .code-container {
            margin: 32px 0;
            text-align: center;
            direction: ltr; /* Ensure numbers stay in order */
          }
          .code {
            display: inline-block;
            background-color: #f0f9ff;
            color: #0284c7;
            font-size: 38px;
            font-weight: 700;
            letter-spacing: 8px;
            padding: 20px 48px;
            border-radius: 16px;
            border: 2px dashed #bae6fd;
            font-family: 'Courier New', monospace;
          }
          .footer {
            background-color: #f8fafc;
            padding: 24px;
            text-align: center;
            font-size: 13px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
          }
          h2 {
            color: #0f172a;
            font-weight: 700;
            margin-top: 0;
          }
          .btn {
            display: inline-block;
            background-color: #0284c7;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <table class="main" role="presentation" align="center">
            <tr>
              <td class="header">
                 <div class="logo-text">
                    <span style="color: #0284c7;">electis</span><span style="color: #334155;">Space</span>
                 </div>
              </td>
            </tr>
            <tr>
              <td class="content">
                ${html}
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p style="margin: 0 0 8px;">הודעה זו נשלחה באופן אוטומטי ממערכת electisSpace.</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} Electis. כל הזכויות שמורות.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  const inlineCss = juice(rawHtml);

  return {
    from: process.env.EXCHANGE_NO_REPLY || 'noReply@electis.co.il',
    to: recipient,
    subject: subject,
    html: inlineCss,
  };
};

// Email service
export class EmailService {
  /**
   * Send 2FA verification code email
   */
  static async send2FACode(email: string, code: string, firstName?: string): Promise<void> {
    const name = firstName || 'משתמש/ת';
    const subject = `קוד אימות: ${code} - electisSpace`;
    
    // Fallback to "User" if name contains non-Hebrew characters and looks like a system name, 
    // or just use what is provided. The placeholder implies Hebrew context.
    
    const html = `
      <h2>שלום ${name},</h2>
      
      <p>קיבלנו בקשה להתחברות לחשבונך במערכת <strong>electisSpace</strong>.</p>
      
      <p>כדי להשלים את ההתחברות, יש להזין את קוד האימות הבא:</p>
      
      <div class="code-container">
        <span class="code">${code}</span>
      </div>
      
      <p style="text-align: center; color: #64748b; font-size: 14px;">הקוד תקף ל-10 דקות בלבד.</p>
      
      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">אם לא ביקשת להתחבר, ניתן להתעלם מהודעה זו בבטחה.</p>
    `;

    const transporter = createTransporter();
    const mailOptions = createMailOptions(email, subject, html);

    if (process.env.NODE_ENV === 'test') {
      appLogger.info('Email', `[TEST] Email sent to ${email} with code ${code}`);
      return;
    }

    try {
      await transporter.sendMail(mailOptions);
      appLogger.info('Email', `2FA email sent to ${email}`);
    } catch (error) {
      appLogger.error('Email', 'Error sending 2FA email', { error: String(error) });
      // Don't throw to prevent login blocking on email failure in some cases
    }
  }

  /**
   * Send password reset code email
   */
  static async sendPasswordResetCode(email: string, code: string, firstName?: string): Promise<void> {
    const name = firstName || 'משתמש/ת';
    const html = `
      <h2>שלום ${name},</h2>
      
      <p>קיבלנו בקשה לאיפוס סיסמה עבור חשבונך במערכת <strong>electisSpace</strong>.</p>
      
      <p>להלן קוד האיפוס שלך:</p>
      
      <div class="code-container">
        <span class="code">${code}</span>
      </div>
      
      <p style="text-align: center; color: #64748b; font-size: 14px;">הקוד תקף ל-30 דקות.</p>
      
      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו.</p>
    `;

    const transporter = createTransporter();
    const mailOptions = createMailOptions(email, 'איפוס סיסמה - electisSpace', html);
    
    await transporter.sendMail(mailOptions);
  }

  /**
   * Send password reset notification (admin reset with temporary password)
   */
  static async sendPasswordResetNotification(
    email: string,
    temporaryPassword: string,
    firstName?: string,
    resetByAdmin?: string
  ): Promise<void> {
    const name = firstName || 'משתמש/ת';
    const adminInfo = resetByAdmin ? ` על ידי ${resetByAdmin}` : '';
    
    const html = `
      <h2>שלום ${name},</h2>
      
      <p>הסיסמה שלך במערכת <strong>electisSpace</strong> אופסה${adminInfo}.</p>
      
      <p>להלן הסיסמה הזמנית שלך:</p>
      
      <div class="code-container">
        <span class="code">${temporaryPassword}</span>
      </div>
      
      <div style="background-color: #fff3cd; color: #856404; padding: 12px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <strong>⚠️ חשוב:</strong> יש לשנות את הסיסמה הזמנית בהתחברות הראשונה שלך.
      </div>
      
      <p>המערכת תבקש ממך להגדיר סיסמה חדשה בכניסה הבאה.</p>
    `;

    const transporter = createTransporter();
    const mailOptions = createMailOptions(email, 'איפוס סיסמה - electisSpace', html);
    
    await transporter.sendMail(mailOptions);
  }

  /**
   * Send password changed confirmation email
   */
  static async sendPasswordChangedConfirmation(email: string, firstName?: string): Promise<void> {
    const name = firstName || 'משתמש/ת';
    const html = `
      <h2>שלום ${name},</h2>
      
      <p>הסיסמה שלך במערכת <strong>electisSpace</strong> שונתה בהצלחה.</p>
      
      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">אם לא ביצעת שינוי זה, צור קשר מיידי עם מנהל המערכת.</p>
    `;

    const transporter = createTransporter();
    const mailOptions = createMailOptions(email, 'הסיסמה שונתה - electisSpace', html);
    
    await transporter.sendMail(mailOptions);
  }

  /**
   * Test email configuration
   */
  static async testConnection(): Promise<boolean> {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      appLogger.error('Email', 'Email service connection failed', { error: String(error) });
      return false;
    }
  }
}
