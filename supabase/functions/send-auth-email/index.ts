
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, supabase-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface AuthEmailRequest {
  to: string;
  subject?: string;
  token_hash: string;
  redirect_to?: string;
  email_action_type: string;
  site_url: string;
}

const createEmailTemplate = (
  title: string, 
  content: string, 
  buttonText: string, 
  buttonUrl: string, 
  description: string,
  recipientEmail: string
): string => `
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
          This email was sent to ${recipientEmail}. If you didn't request this, you can safely ignore it.
        </p>
      </div>
    </div>
  </body>
</html>
`;

const getEmailTemplate = (actionType: string, confirmationUrl: string, recipientEmail: string): { subject: string; html: string } => {
  switch (actionType) {
    case 'signup':
      return {
        subject: 'Welcome to SmartFinanceAI - Confirm Your Account',
        html: createEmailTemplate(
          'Welcome to SmartFinanceAI!',
          'Confirm Your Email Address',
          'Confirm Email Address',
          confirmationUrl,
          'Thank you for joining SmartFinanceAI! Please confirm your email address to activate your account and start your journey to smarter financial management.',
          recipientEmail
        )
      };
    
    case 'magiclink':
      return {
        subject: 'Your SmartFinanceAI Magic Link',
        html: createEmailTemplate(
          'Sign In to SmartFinanceAI',
          'Your Secure Login Link',
          'Sign In Securely',
          confirmationUrl,
          'Click the button below to securely sign in to your SmartFinanceAI account. This magic link provides instant, passwordless access.',
          recipientEmail
        )
      };
    
    case 'recovery':
      return {
        subject: 'Reset Your SmartFinanceAI Password',
        html: createEmailTemplate(
          'Password Reset Request',
          'Reset Your Password',
          'Reset Password',
          confirmationUrl,
          'We received a request to reset your SmartFinanceAI password. Click the button below to create a new secure password for your account.',
          recipientEmail
        )
      };
    
    default:
      return {
        subject: 'SmartFinanceAI - Account Action Required',
        html: createEmailTemplate(
          'Account Action Required',
          'Complete Your Action',
          'Continue',
          confirmationUrl,
          'Please click the button below to complete the requested action on your SmartFinanceAI account.',
          recipientEmail
        )
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SMARTFINANCEAI AUTH EMAIL FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // Get webhook secret - this is critical for authentication
    const hookSecret = Deno.env.get("AUTH_EMAIL_HOOK_SECRET");
    console.log('Hook secret configured:', !!hookSecret);

    if (!hookSecret) {
      console.error('AUTH_EMAIL_HOOK_SECRET environment variable not set');
      return new Response(JSON.stringify({ 
        error: 'Authentication configuration error',
        message: 'Webhook secret not configured'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check for Supabase signature header
    const supabaseSignature = req.headers.get('supabase-signature');
    console.log('Supabase signature present:', !!supabaseSignature);
    
    if (!supabaseSignature) {
      console.warn('Missing supabase-signature header');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Missing authentication signature'
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the webhook signature
    if (supabaseSignature !== hookSecret) {
      console.warn('Invalid supabase-signature header');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Webhook authentication successful');
    
    const requestBody = await req.json();
    
    // Log only non-sensitive request details
    console.log('Email request received:', {
      to: requestBody.to,
      email_action_type: requestBody.email_action_type,
      site_url: requestBody.site_url,
      has_redirect_to: !!requestBody.redirect_to,
      has_token_hash: !!requestBody.token_hash
    });
    
    const { to, subject, token_hash, redirect_to, email_action_type, site_url }: AuthEmailRequest = requestBody;

    // Validate required fields
    if (!to || !token_hash || !email_action_type || !site_url) {
      console.error('Missing required fields:', { 
        has_to: !!to, 
        has_token_hash: !!token_hash, 
        has_email_action_type: !!email_action_type, 
        has_site_url: !!site_url 
      });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('Invalid email format:', { email_valid: false });
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable not set');
      return new Response(JSON.stringify({ 
        error: 'Email service configuration error',
        message: 'Please configure email service credentials'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Resend API key configured:', { has_api_key: !!resendApiKey });

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    // Build confirmation URL
    const baseUrl = site_url.endsWith('/') ? site_url.slice(0, -1) : site_url;
    const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to || baseUrl)}`;

    // Get email template based on action type
    const emailTemplate = getEmailTemplate(email_action_type, confirmationUrl, to);
    const finalSubject = subject || emailTemplate.subject;

    console.log('Sending email:', {
      action_type: email_action_type,
      subject: finalSubject,
      to_domain: to.split('@')[1] // Log domain only for privacy
    });

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: 'SmartFinanceAI <onboarding@resend.dev>', // Update this to your verified domain
      to: [to],
      subject: finalSubject,
      html: emailTemplate.html,
    });

    console.log('Email sent successfully:', { 
      email_id: emailResponse.data?.id,
      status: 'sent'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Authentication email sent successfully',
      email_sent: true,
      action_type: email_action_type,
      email_id: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ EMAIL SENDING ERROR ❌");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Don't expose internal error details in production
    const isResendError = error.message?.includes('Resend') || error.name === 'ResendError';
    const userFriendlyMessage = isResendError 
      ? 'Email delivery service temporarily unavailable' 
      : 'Failed to send authentication email';
    
    return new Response(
      JSON.stringify({ 
        error: userFriendlyMessage,
        timestamp: new Date().toISOString(),
        service: 'SmartFinanceAI Auth Email',
        retry_suggested: true
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
