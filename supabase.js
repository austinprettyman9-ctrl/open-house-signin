import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lubctieveoskgrddipsw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAxMTYsImV4cCI6MjA4NDYxNjExNn0.J2OlbxRFgxk7--GxC0W6P41BLKQxkcEg5M3x1tELB_0';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
