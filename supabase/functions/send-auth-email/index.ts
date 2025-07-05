
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, supabase-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface AuthEmailPayload {
  user: {
    id: string;
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: linear-gradient(to right, #8B5CF6, #EC4899); font-size: 16px; line-height: 1.5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      
      <!-- Header with gradient -->
      <div style="background: linear-gradient(to right, #8B5CF6, #EC4899); padding: 40px 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="https://jkmdale.github.io/SmartFinanceAI/public/icon_512x512.png" alt="SmartFinanceAI logo" width="120" height="120" style="display:block; margin: 0 auto; border-radius: 16px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);" />
        </div>
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SmartFinanceAI</h1>
        <p style="color: #F8FAFC; margin: 8px 0 0 0; font-size: 16px;">${title}</p>
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
                    background: linear-gradient(to right, #8B5CF6, #EC4899); 
                    color: #FFFFFF; 
                    padding: 18px 36px; 
                    text-decoration: none; 
                    border-radius: 12px; 
                    font-weight: 600; 
                    font-size: 16px;
                    box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.4);">
             ${buttonText}
           </a>
        </div>

        <!-- Fallback link -->
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
            Click here if the button doesn't work:
          </p>
          <a href="${buttonUrl}" style="color: #7c3aed; word-break: break-all; font-size: 14px;">${buttonUrl}</a>
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
  console.log('=== SMARTFINANCEAI AUTH EMAIL FUNCTION START ===');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Respond immediately to prevent timeout
    const quickResponse = new Response(JSON.stringify({ 
      success: true, 
      message: 'Email processing initiated'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

    // Process email asynchronously
    processEmailAsync(req);

    return quickResponse;

  } catch (error: any) {
    console.error("❌ EMAIL FUNCTION ERROR ❌", error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Email service temporarily unavailable',
        timestamp: new Date().toISOString(),
        retry_suggested: true
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Process email asynchronously to prevent timeout
async function processEmailAsync(req: Request) {
  try {
    const requestBody = await req.json();
    console.log('Processing email for:', requestBody.user?.email);
    console.log('Full request body:', JSON.stringify(requestBody, null, 2));

    // Handle both the direct payload format and the nested webhook format
    let user, email_data;
    
    if (requestBody.user && requestBody.email_data) {
      user = requestBody.user;
      email_data = requestBody.email_data;
    } else {
      user = { email: requestBody.to };
      email_data = {
        token_hash: requestBody.token_hash,
        redirect_to: requestBody.redirect_to,
        email_action_type: requestBody.email_action_type,
        site_url: requestBody.site_url
      };
    }

    // Validate required fields
    if (!user?.email || !email_data?.token_hash || !email_data?.email_action_type || !email_data?.site_url) {
      console.error('❌ Missing required fields:', {
        hasEmail: !!user?.email,
        hasTokenHash: !!email_data?.token_hash,
        hasActionType: !!email_data?.email_action_type,
        hasSiteUrl: !!email_data?.site_url
      });
      throw new Error('Missing required fields');
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('✅ Resend API key found');

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Build confirmation URL - Use redirect_to instead of site_url for better routing
    const baseUrl = email_data.redirect_to || 'https://a29b8699-11a7-4b06-985f-e3c27ee69b05.lovableproject.com';
    const confirmationUrl = `${email_data.site_url}/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(baseUrl)}`;

    console.log('🔗 Confirmation URL:', confirmationUrl);

    // Get email template
    const emailTemplate = getEmailTemplate(email_data.email_action_type, confirmationUrl, user.email);

    console.log('📧 Sending email to:', user.email);
    console.log('📋 Email subject:', emailTemplate.subject);

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'SmartFinanceAI <noreply@smartfinanceai.app>',
      to: [user.email],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      reply_to: 'SmartFinanceAI <noreply@smartfinanceai.app>'
    });

    console.log('📨 Resend API Response:', JSON.stringify(emailResponse, null, 2));

    if (emailResponse.error) {
      console.error('❌ Resend API Error:', emailResponse.error);
      throw new Error(`Resend API Error: ${JSON.stringify(emailResponse.error)}`);
    }

    console.log('✅ Email sent successfully:', { 
      email_id: emailResponse.data?.id,
      action_type: email_data.email_action_type,
      to: user.email
    });

  } catch (error: any) {
    console.error("❌ ASYNC EMAIL PROCESSING ERROR ❌", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

serve(handler);
