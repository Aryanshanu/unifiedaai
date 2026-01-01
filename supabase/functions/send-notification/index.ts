import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface NotificationPayload {
  channel_id?: string;
  type: 'incident' | 'review' | 'alert' | 'drift' | 'digest';
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

interface SlackWebhookPayload {
  text: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
  }>;
}

// Send Slack webhook notification
async function sendSlackNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const severityEmoji = {
      low: '📝',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴'
    };

    const emoji = severityEmoji[payload.severity || 'medium'];

    const slackPayload: SlackWebhookPayload = {
      text: `${emoji} ${payload.title}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${emoji} ${payload.title}` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: payload.message }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Type:*\n${payload.type}` },
            { type: "mrkdwn", text: `*Severity:*\n${payload.severity || 'medium'}` }
          ]
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `_Sent from Fractal RAI-OS at ${new Date().toISOString()}_` }
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-notification] Slack webhook error:', response.status, errorText);
      return { success: false, error: `Slack webhook failed: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('[send-notification] Slack notification error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send email notification (placeholder - would integrate with SendGrid/Resend)
async function sendEmailNotification(
  email: string,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  // For now, log the email that would be sent
  console.log(`[send-notification] Would send email to ${email}:`, {
    subject: payload.title,
    body: payload.message,
    type: payload.type,
    severity: payload.severity
  });

  // TODO: Integrate with email provider (SendGrid, Resend, etc.)
  // For demo purposes, we'll mark this as successful
  return { success: true };
}

serve(async (req) => {
  console.log("[send-notification] Called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    
    if (authError) {
      return authError;
    }

    const { user } = authResult;
    const userClient = authResult.supabase!;
    const serviceClient = getServiceClient();

    const body: NotificationPayload = await req.json();

    if (!body.type || !body.title || !body.message) {
      return new Response(
        JSON.stringify({ error: "type, title, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ channel: string; success: boolean; error?: string }> = [];

    // If specific channel_id provided, send to that channel
    if (body.channel_id) {
      const { data: channel, error: channelError } = await userClient
        .from('notification_channels')
        .select('*')
        .eq('id', body.channel_id)
        .single();

      if (channelError || !channel) {
        return new Response(
          JSON.stringify({ error: "Channel not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!channel.enabled) {
        return new Response(
          JSON.stringify({ error: "Channel is disabled", channel_id: body.channel_id }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const config = channel.config as Record<string, string>;

      if (channel.channel_type === 'slack' && config.webhook_url) {
        const result = await sendSlackNotification(config.webhook_url, body);
        results.push({ channel: channel.name, ...result });
      } else if (channel.channel_type === 'email' && config.email) {
        const result = await sendEmailNotification(config.email, body);
        results.push({ channel: channel.name, ...result });
      }
    } else {
      // Send to all enabled channels for this user matching the notification type
      const { data: channels, error: channelsError } = await userClient
        .from('notification_channels')
        .select('*')
        .eq('enabled', true);

      if (channelsError) {
        console.error('[send-notification] Error fetching channels:', channelsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch notification channels" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!channels || channels.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No enabled notification channels found",
            sent_count: 0
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const channel of channels) {
        const config = channel.config as Record<string, string>;

        try {
          if (channel.channel_type === 'slack' && config.webhook_url) {
            const result = await sendSlackNotification(config.webhook_url, body);
            results.push({ channel: channel.name, ...result });
          } else if (channel.channel_type === 'email' && config.email) {
            const result = await sendEmailNotification(config.email, body);
            results.push({ channel: channel.name, ...result });
          }
        } catch (error) {
          console.error(`[send-notification] Error sending to channel ${channel.name}:`, error);
          results.push({ 
            channel: channel.name, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    // Log notification attempt
    console.log('[send-notification] Results:', results);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        sent_count: successCount,
        failed_count: failCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-notification] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
