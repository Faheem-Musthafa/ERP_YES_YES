import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const supabaseUrl = 'https://ruwkgubpowdshpucmqxc.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1d2tndWJwb3dkc2hwdWNtcXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzk0NjIsImV4cCI6MjA4NzcxNTQ2Mn0.1WevibLUOAsZ5YIJTpRtB0vcP5zl_UYeKUrAgYV6qEE';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
