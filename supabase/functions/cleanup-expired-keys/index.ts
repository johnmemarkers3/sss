import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting cleanup of expired access keys...')

    // Delete expired access keys
    // Delete keys where expires_at is not null and less than current time
    const { data: deletedKeys, error } = await supabase
      .from('access_keys')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .select('id, key, expires_at')

    if (error) {
      console.error('Error deleting expired keys:', error)
      throw error
    }

    const deletedCount = deletedKeys?.length || 0
    console.log(`Cleanup completed. Deleted ${deletedCount} expired keys.`)

    // Log the deleted keys for audit purposes
    if (deletedKeys && deletedKeys.length > 0) {
      console.log('Deleted keys:', deletedKeys.map(k => ({
        id: k.id,
        key: k.key,
        expires_at: k.expires_at
      })))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        message: `Удалено ${deletedCount} просроченных ключей`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})