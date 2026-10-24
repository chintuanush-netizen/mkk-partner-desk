import { createClient } from '@supabase/supabase-js';

// Public project URL and anon key. These are safe in the browser: every table is
// protected by row-level security and every change goes through checked functions.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rhyauiovwdnsnaclempy.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeWF1aW92d2Ruc25hY2xlbXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzI2NzEsImV4cCI6MjEwNzY0ODY3MX0.SxYEYy42aTK6DYzSFSCzQApM_HCd2i3uM6j_WnfJCI8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
