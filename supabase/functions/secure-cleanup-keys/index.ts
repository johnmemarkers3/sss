import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting secure cleanup of expired access keys...')

    // 1. Clean up truly expired keys (creation date + 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const { data: expiredKeys, error: selectError } = await supabase
      .from('access_keys')
      .select('id, key, created_at, is_used')
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (selectError) {
      console.error('Error selecting expired keys:', selectError)
      throw selectError
    }

    console.log(`Found ${expiredKeys?.length || 0} expired keys to clean up`)

    if (expiredKeys && expiredKeys.length > 0) {
      // Delete expired keys in batches for safety
      const batchSize = 50
      let deletedCount = 0

      for (let i = 0; i < expiredKeys.length; i += batchSize) {
        const batch = expiredKeys.slice(i, i + batchSize)
        const keyIds = batch.map(key => key.id)

        const { error: deleteError } = await supabase
          .from('access_keys')
          .delete()
          .in('id', keyIds)

        if (deleteError) {
          console.error('Error deleting batch:', deleteError)
          throw deleteError
        }

        deletedCount += batch.length
        console.log(`Deleted batch of ${batch.length} keys, total: ${deletedCount}`)
      }

      console.log(`Successfully deleted ${deletedCount} expired keys`)
    }

    // 2. Clean up orphaned subscription entries (optional)
    const { data: orphanedSubs, error: orphanError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .lt('active_until', new Date().toISOString())

    if (!orphanError && orphanedSubs && orphanedSubs.length > 0) {
      console.log(`Found ${orphanedSubs.length} expired subscriptions`)
      
      // Note: We don't auto-delete subscriptions as users might want to see their history
      // Just log for admin awareness
    }

    // 3. Security audit: Check for any suspicious patterns
    const { data: recentActivity, error: auditError } = await supabase
      .from('access_keys')
      .select('used_by, used_at, created_by, key')
      .not('used_by', 'is', null)
      .gte('used_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    if (!auditError && recentActivity) {
      // Group by user to detect potential abuse
      const userActivity = recentActivity.reduce((acc, activity) => {
        const userId = activity.used_by
        if (!acc[userId]) acc[userId] = 0
        acc[userId]++
        return acc
      }, {} as Record<string, number>)

      // Flag users with excessive key usage (more than 10 keys in 24h)
      const suspiciousUsers = Object.entries(userActivity)
        .filter(([_, count]) => count > 10)
        .map(([userId, count]) => ({ userId, count }))

      if (suspiciousUsers.length > 0) {
        console.warn('Suspicious activity detected:', suspiciousUsers)
        // In production, you might want to send alerts or temporarily suspend users
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed. Deleted ${expiredKeys?.length || 0} expired keys.`,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})