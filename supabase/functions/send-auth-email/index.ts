
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Check if Resend API key is available
    const apiKey = Deno.env.get("RESEND_API_KEY");
    console.log('Resend API key available:', apiKey ? 'YES' : 'NO');
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    const confirmationUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
    console.log('Confirmation URL generated:', confirmationUrl);

    let emailContent = '';
    
    if (email_action_type === 'signup') {
      emailContent = `
        <h2>Welcome to SmartFinanceAI!</h2>
        <p>Please confirm your email address by clicking the link below:</p>
        <a href="${confirmationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      `;
    } else if (email_action_type === 'magiclink') {
      emailContent = `
        <h2>Sign in to SmartFinanceAI</h2>
        <p>Click the link below to sign in:</p>
        <a href="${confirmationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
      `;
    } else if (email_action_type === 'recovery') {
      emailContent = `
        <h2>Reset your SmartFinanceAI password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${confirmationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
      `;
    }

    console.log('Email content prepared for type:', email_action_type);

    const emailPayload = {
      from: "SmartFinanceAI <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: emailContent,
    };

    console.log('Sending email with payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailContent.length
    });

    const emailResponse = await resend.emails.send(emailPayload);

    console.log("Resend response:", JSON.stringify(emailResponse, null, 2));

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(`Resend API error: ${JSON.stringify(emailResponse.error)}`);
    }

    console.log("Email sent successfully with ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      id: emailResponse.data?.id,
      message: 'Email sent successfully'
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
