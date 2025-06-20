
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== AUTH EMAIL FUNCTION CALLED ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { to, subject, token_hash, redirect_to, email_action_type, site_url }: AuthEmailRequest = requestBody;
    
    console.log('Parsed email data:', {
      to,
      subject,
      email_action_type,
      site_url,
      token_hash: token_hash ? 'present' : 'missing',
      redirect_to
    });

    // Check if Google Workspace credentials are available
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    
    console.log('Gmail credentials available:', {
      user: gmailUser ? 'YES' : 'NO',
      password: gmailPassword ? 'YES' : 'NO'
    });
    
    if (!gmailUser || !gmailPassword) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables must be set');
    }

    const confirmationUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
    console.log('Confirmation URL generated:', confirmationUrl);

    let emailContent = '';
    
    if (email_action_type === 'signup') {
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SmartFinanceAI!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Confirm Your Email Address</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
              Thank you for signing up! Please confirm your email address by clicking the button below to activate your account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Confirm Email Address</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
            </p>
            <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
              ⚠️ This link will expire in 24 hours for security reasons.
            </p>
          </div>
        </div>
      `;
    } else if (email_action_type === 'magiclink') {
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Sign in to SmartFinanceAI</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Your Magic Link</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
              Click the button below to securely sign in to your SmartFinanceAI account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Sign In Securely</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
            </p>
            <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
              ⚠️ This link will expire in 1 hour for security reasons.
            </p>
          </div>
        </div>
      `;
    } else if (email_action_type === 'recovery') {
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
              We received a request to reset your SmartFinanceAI password. Click the button below to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
            </p>
            <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
              ⚠️ This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `;
    }

    console.log('Email content prepared for type:', email_action_type);

    // Create SMTP client for Google Workspace
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

    console.log('Sending email via Google Workspace SMTP...');

    await client.send({
      from: `SmartFinanceAI <${gmailUser}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: emailContent,
    });

    await client.close();

    console.log("Email sent successfully via Google Workspace");

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully via Google Workspace'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("=== ERROR IN SEND-AUTH-EMAIL FUNCTION ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
