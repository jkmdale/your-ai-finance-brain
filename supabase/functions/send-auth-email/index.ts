
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  to: string;
  subject: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SMARTFINANCEAI AUTH EMAIL FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestBody = await req.json();
    console.log('Email request received:', {
      to: requestBody.to,
      subject: requestBody.subject,
      email_action_type: requestBody.email_action_type,
      site_url: requestBody.site_url,
      redirect_to: requestBody.redirect_to,
      token_hash: requestBody.token_hash ? 'present' : 'missing'
    });
    
    const { to, subject, token_hash, redirect_to, email_action_type, site_url }: AuthEmailRequest = requestBody;

    // Validate required fields
    if (!to || !token_hash || !email_action_type || !site_url) {
      console.error('Missing required fields:', { to: !!to, token_hash: !!token_hash, email_action_type: !!email_action_type, site_url: !!site_url });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Gmail SMTP configuration
    const gmailUser = "support@smartfinanceai.app";
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    
    console.log('Environment check:', {
      gmailUser,
      hasGmailPassword: !!gmailPassword,
      gmailPasswordLength: gmailPassword ? gmailPassword.length : 0
    });
    
    if (!gmailPassword) {
      console.error('GMAIL_APP_PASSWORD environment variable not set');
      return new Response(JSON.stringify({ 
        error: 'Email configuration error - Gmail App Password not configured',
        debug: 'Please set GMAIL_APP_PASSWORD in Supabase secrets'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Using Gmail SMTP configuration');

    // Build confirmation URL
    const baseUrl = site_url;
    const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to || baseUrl)}`;
    console.log('Confirmation URL generated:', confirmationUrl);

    // Email template function
    const createEmailTemplate = (title: string, content: string, buttonText: string, buttonUrl: string, description: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 24px; color: white;">💰</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SmartFinanceAI</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">${title}</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">${content}</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${description}
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${buttonUrl}" 
                   style="display: inline-block; 
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 16px 32px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: 600; 
                          font-size: 16px;
                          box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);">
                  ${buttonText}
                </a>
              </div>

              <!-- Fallback link -->
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
                  If the button doesn't work, copy and paste this link:
                </p>
                <a href="${buttonUrl}" style="color: #667eea; word-break: break-all; font-size: 14px;">${buttonUrl}</a>
              </div>

              <!-- Security notice -->
              <div style="border-left: 4px solid #f56565; padding-left: 16px; margin: 30px 0;">
                <p style="color: #e53e3e; font-size: 14px; margin: 0; font-weight: 500;">
                  ⚠️ This link will expire for security reasons.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
                © 2024 SmartFinanceAI - Your AI-Powered Financial Assistant
              </p>
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                This email was sent to ${to}. If you didn't request this, you can safely ignore it.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Generate email content based on action type
    let emailContent = '';
    let emailSubject = subject || 'SmartFinanceAI Authentication';
    
    if (email_action_type === 'signup') {
      emailSubject = 'Welcome to SmartFinanceAI - Confirm Your Account';
      emailContent = createEmailTemplate(
        'Welcome to SmartFinanceAI!',
        'Confirm Your Email Address',
        'Confirm Email Address',
        confirmationUrl,
        'Thank you for joining SmartFinanceAI! Please confirm your email address to activate your account and start your journey to smarter financial management.'
      );
    } else if (email_action_type === 'magiclink') {
      emailSubject = 'Your SmartFinanceAI Magic Link';
      emailContent = createEmailTemplate(
        'Sign In to SmartFinanceAI',
        'Your Secure Login Link',
        'Sign In Securely',
        confirmationUrl,
        'Click the button below to securely sign in to your SmartFinanceAI account. This magic link provides instant, passwordless access.'
      );
    } else if (email_action_type === 'recovery') {
      emailSubject = 'Reset Your SmartFinanceAI Password';
      emailContent = createEmailTemplate(
        'Password Reset Request',
        'Reset Your Password',
        'Reset Password',
        confirmationUrl,
        'We received a request to reset your SmartFinanceAI password. Click the button below to create a new secure password for your account.'
      );
    } else {
      emailSubject = `SmartFinanceAI - ${subject || 'Account Action Required'}`;
      emailContent = createEmailTemplate(
        'Account Action Required',
        'Complete Your Action',
        'Continue',
        confirmationUrl,
        'Please click the button below to complete the requested action on your SmartFinanceAI account.'
      );
    }

    console.log('Email template prepared for:', email_action_type);
    console.log('Email subject:', emailSubject);

    try {
      // Create SMTP client
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 587,
          tls: true,
          auth: {
            username: gmailUser,
            password: gmailPassword,
          },
        },
      });

      console.log('SMTP client created, attempting to send email...');

      // Send email
      const emailResult = await client.send({
        from: `SmartFinanceAI <${gmailUser}>`,
        to: to,
        subject: emailSubject,
        content: "auto",
        html: emailContent,
      });

      console.log('Email send result:', emailResult);

      await client.close();
      console.log('SMTP client closed');

      console.log("✅ Email sent successfully via SmartFinanceAI Gmail");

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Authentication email sent successfully',
        email_sent_to: to,
        action_type: email_action_type,
        debug: {
          smtp_server: 'smtp.gmail.com',
          from_email: gmailUser
        }
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });

    } catch (smtpError: any) {
      console.error("❌ SMTP ERROR ❌");
      console.error("SMTP Error details:", smtpError);
      console.error("SMTP Error message:", smtpError.message);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to send email via SMTP',
        details: smtpError.message,
        debug: {
          smtp_server: 'smtp.gmail.com',
          from_email: gmailUser,
          error_type: 'SMTP_ERROR'
        }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("❌ GENERAL ERROR IN SMARTFINANCEAI AUTH EMAIL FUNCTION ❌");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.toString(),
        timestamp: new Date().toISOString(),
        service: 'SmartFinanceAI Auth Email'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
