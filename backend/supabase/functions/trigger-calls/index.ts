// Supabase Edge Function: trigger-calls
// Deploys to: supabase/functions/trigger-calls/index.ts
// This function receives a call request and uses Twilio to make a voice call to the donor.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      callLogId,
      donorPhone,
      donorName,
      bloodGroup,
      hospitalName,
      hospitalCity,
    } = await req.json();

    // Twilio credentials from Supabase secrets
    const TWILIO_ACCOUNT_SID = Deno.env.get("account_sid");
    const TWILIO_AUTH_TOKEN  = Deno.env.get("auth_token");
    const TWILIO_FROM_NUMBER = Deno.env.get("from_number"); // Your Twilio number e.g. +15551234567

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      throw new Error("Twilio credentials not configured in Supabase secrets.");
    }

    // The voice message TwiML — Twilio will read this aloud to the donor
    const voiceMessage = `
      Hello ${donorName}! 
      This is an urgent message from BloodLink. 
      ${hospitalName} in ${hospitalCity} urgently needs ${bloodGroup} blood. 
      You are a matching donor! 
      Please visit the BloodLink website and click I am ready to donate. 
      Your contribution can save a life today. 
      Thank you!
    `.trim()

    // Build TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">${voiceMessage}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-IN">This message will repeat once.</Say>
  <Say voice="alice" language="en-IN">${voiceMessage}</Say>
</Response>`;

    // Encode TwiML as a data URI for Twilio (or host it publicly)
    // Twilio accepts inline TwiML via the Twiml parameter
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    const formData = new URLSearchParams();
    formData.append("To",     donorPhone);       // donor's phone, e.g. +919876543210
    formData.append("From",   TWILIO_FROM_NUMBER);
    formData.append("Twiml",  twiml);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    // Update call_log with Twilio SID and status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callStatus = twilioData.sid ? "initiated" : "failed";
    await supabase
      .from("call_logs")
      .update({
        twilio_sid: twilioData.sid || null,
        status:     callStatus,
      })
      .eq("id", callLogId);

    return new Response(
      JSON.stringify({ success: !!twilioData.sid, sid: twilioData.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
