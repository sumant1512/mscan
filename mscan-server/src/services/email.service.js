/**
 * Email Service - OTP Delivery via Gmail SMTP
 */
const nodemailer = require('nodemailer');

// Create transporter - handle if nodemailer is not properly loaded
let transporter;
try {
  transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️  Email service error:', error.message);
      console.log('⚠️  OTP emails will not be sent until email is configured');
    } else {
      console.log('📧 Email service ready');
    }
  });
} catch (error) {
  console.log('⚠️  Email service not configured');
  console.log('⚠️  OTPs will be logged to console instead');
}

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, otp) => {
  // If no transporter, log OTP to console for development
  if (!transporter) {
    console.log(`\n🔐 OTP for ${email}: ${otp}\n`);
    return true;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your TMS Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #007bff; 
              text-align: center;
              padding: 20px;
              background: white;
              border-radius: 5px;
              letter-spacing: 5px;
            }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TMS System Login</h1>
            </div>
            <div class="content">
              <h2>Your One-Time Password</h2>
              <p>Use the following OTP to log in to your account:</p>
              <div class="otp-code">${otp}</div>
              <p><strong>This code will expire in 5 minutes.</strong></p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
              <p>© ${new Date().getFullYear()} TMS System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    // Fallback to console logging for development
    console.log(`\n🔐 OTP for ${email}: ${otp}\n`);
    return true;
  }
};

/**
 * Send welcome email to new customer
 */
const sendWelcomeEmail = async (email, companyName) => {
  // If no transporter, just return success
  if (!transporter) {
    console.log(`📧 Welcome email would be sent to ${email}`);
    return true;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to TMS System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
            .button { 
              display: inline-block;
              background: #007bff;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TMS!</h1>
            </div>
            <div class="content">
              <h2>Your Account Has Been Created</h2>
              <p>Hello ${companyName},</p>
              <p>Your TMS account has been successfully created by our administrator.</p>
              <p>You can now log in to the system using your email address. We use secure OTP (One-Time Password) authentication, so you'll receive a code via email each time you log in.</p>
              <p><strong>Your login email:</strong> ${email}</p>
              <p>To get started, visit the login page and enter your email address to receive an OTP code.</p>
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:4200'}" class="button">Go to Login</a>
            </div>
            <div class="footer">
              <p>If you have any questions, please contact your system administrator.</p>
              <p>© ${new Date().getFullYear()} TMS System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
    // Don't throw error, just log it - welcome email is not critical
    return false;
  }
};

/**
 * Send credit approval notification
 */
const sendCreditApprovalEmail = async (email, companyName, amount) => {
  if (!transporter) {
    console.log(`\n✅ Credit Approved for ${companyName}: ${amount} credits\n`);
    return true;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Credit Request Approved - TMS System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
            .credit-amount { 
              font-size: 28px; 
              font-weight: bold; 
              color: #28a745; 
              text-align: center;
              padding: 20px;
            }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Credit Request Approved</h1>
            </div>
            <div class="content">
              <h2>Good News, ${companyName}!</h2>
              <p>Your credit request has been approved by the administrator.</p>
              <div class="credit-amount">${amount} Credits Added</div>
              <p>You can now use these credits to create coupons and promotional offers in the TMS system.</p>
              <p>Log in to your account to start creating campaigns!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TMS System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Credit approval email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send credit approval email:', error.message);
    return false;
  }
};

/**
 * Send credit rejection notification
 */
const sendCreditRejectionEmail = async (email, companyName, amount, reason) => {
  if (!transporter) {
    console.log(`\n❌ Credit Rejected for ${companyName}: ${amount} credits - Reason: ${reason}\n`);
    return true;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Credit Request Update - TMS System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
            .reason-box { 
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Credit Request Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>Your request for ${amount} credits has been reviewed.</p>
              <div class="reason-box">
                <strong>Administrator Note:</strong><br>
                ${reason}
              </div>
              <p>If you have questions or would like to discuss this decision, please contact your administrator.</p>
              <p>You can submit a new credit request at any time through the TMS system.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TMS System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Credit rejection email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send credit rejection email:', error.message);
    return false;
  }
};

/**
 * Send tenant status change notification
 */
const sendTenantStatusChangeEmail = async (email, companyName, isActive) => {
  if (!transporter) {
    console.log(`\n🔔 Tenant status changed for ${companyName}: ${isActive ? 'Activated' : 'Deactivated'}\n`);
    return true;
  }

  try {
    const statusColor = isActive ? '#28a745' : '#dc3545';
    const statusText = isActive ? 'Account Activated' : 'Account Deactivated';
    const statusIcon = isActive ? '✅' : '⚠️';

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `${statusText} - TMS System`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusIcon} ${statusText}</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>Your TMS account status has been changed to: <strong>${isActive ? 'Active' : 'Inactive'}</strong></p>
              ${isActive 
                ? '<p>You can now access all features of the TMS system. Log in to start managing your campaigns.</p>' 
                : '<p>Your account has been temporarily deactivated. You will not be able to access the system until it is reactivated.</p>'
              }
              <p>If you have any questions, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TMS System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Status change email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send status change email:', error.message);
    return false;
  }
};

/**
 * Send Tenant Admin Welcome Email
 */
const sendTenantAdminWelcomeEmail = async (email, fullName, tenant) => {
  if (!transporter) {
    console.log(`\n📧 Welcome email would be sent to Tenant Admin: ${email} for ${tenant.name}\n`);
    return true;
  }

  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseDomain = process.env.DOMAIN_BASE || 'localhost';
    const port = process.env.NODE_ENV === 'production' ? '' : ':4200';
    const loginUrl = `${protocol}://${tenant.subdomain}.${baseDomain}${port}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Welcome to MScan - You're now a Tenant Admin for ${tenant.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .info-box { background: white; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; }
            .btn { 
              display: inline-block;
              background: #007bff; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .capabilities { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .capabilities li { margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to MScan!</h1>
              <p>You're now a Tenant Admin</p>
            </div>
            <div class="content">
              <p>Hi ${fullName},</p>
              
              <p>You've been added as a <strong>Tenant Admin</strong> for <strong>${tenant.name}</strong> on MScan.</p>
              
              <div class="info-box">
                <h3>📍 Your Login Details:</h3>
                <p><strong>URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                <p><strong>Email:</strong> ${email}</p>
                <p style="margin-top: 15px;">Please use the "Forgot Password" link on the login page to set your password.</p>
              </div>

              <div class="capabilities">
                <h3>✨ As a Tenant Admin, you can:</h3>
                <ul>
                  <li>✓ Create and manage coupons and batches</li>
                  <li>✓ Manage products and templates</li>
                  <li>✓ View analytics and scan reports</li>
                  <li>✓ Configure tenant settings</li>
                  <li>✓ Manage tenant users</li>
                  <li>✓ Request additional credits</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${loginUrl}" class="btn">Login to Dashboard →</a>
              </div>

              <p style="margin-top: 30px;">If you have any questions or need assistance, please contact support.</p>
              
              <p>Best regards,<br>The MScan Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
              <p>© ${new Date().getFullYear()} MScan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Tenant Admin welcome email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Tenant Admin welcome email:', error.message);
    console.log(`\n📧 Tenant Admin welcome email for ${email} (tenant: ${tenant.name})\n`);
    throw error; // Throw to let caller know it failed
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendCreditApprovalEmail,
  sendCreditRejectionEmail,
  sendTenantStatusChangeEmail,
  sendTenantAdminWelcomeEmail
};
