// supabase/functions/notify-partner/index.ts
// Deploy with: supabase functions deploy notify-partner

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, workout_label, duration_seconds, display_name } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    )

    // Get my partner_user_id
    const { data: myRow } = await supabase
      .from('user_settings')
      .select('partner_user_id')
      .eq('user_id', user_id)
      .single()

    if (!myRow?.partner_user_id) {
      return new Response(JSON.stringify({ message: 'No partner connected' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get partner's push token
    const { data: partnerRow } = await supabase
      .from('user_settings')
      .select('push_token')
      .eq('user_id', myRow.partner_user_id)
      .single()

    if (!partnerRow?.push_token) {
      return new Response(JSON.stringify({ message: 'Partner has no push token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Format notification
    const senderName = display_name || 'Your partner'
    const workoutName = workout_label || 'a workout'
    const dur = duration_seconds ? Math.round(duration_seconds / 60) : null
    const body = dur
      ? `${workoutName} · ${dur} min`
      : workoutName

    // Send via Expo Push API
    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: partnerRow.push_token,
        sound: 'default',
        title: `${senderName} just finished a workout 💪`,
        body,
        data: { type: 'partner_workout', user_id },
      }),
    })

    const pushResult = await pushResponse.json()

    return new Response(JSON.stringify({ success: true, pushResult }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})