
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
    const { to, subject, token_hash, redirect_to, email_action_type, site_url }: AuthEmailRequest = await req.json();
    
    console.log('Sending auth email:', { to, subject, email_action_type });

    const confirmationUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    let emailContent = '';
    
    if (email_action_type === 'signup') {
      emailContent = `
        <h2>Welcome to SmartFinanceAI!</h2>
        <p>Please confirm your email address by clicking the link below:</p>
        <a href="${confirmationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${confirmationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `;
    } else if (email_action_type === 'magiclink') {
      emailContent = `
        <h2>Sign in to SmartFinanceAI</h2>
        <p>Click the link below to sign in:</p>
        <a href="${confirmationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${confirmationUrl}</p>
        <p>This link will expire in 1 hour.</p>
      `;
    } else if (email_action_type === 'recovery') {
      emailContent = `
        <h2>Reset your SmartFinanceAI password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${confirmationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${confirmationUrl}</p>
        <p>This link will expire in 1 hour.</p>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "SmartFinanceAI <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
