import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://spssdksmnbytmfjpjxzv.supabase.co',
    'sb_publishable_-_XchJw1CrPShjrcb1OwTw_q_iUzL4v'
  )
}