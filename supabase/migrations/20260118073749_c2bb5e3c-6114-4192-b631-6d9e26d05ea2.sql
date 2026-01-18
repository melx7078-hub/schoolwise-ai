-- Fix function search_path warning
ALTER FUNCTION public.update_updated_at() SET search_path = public;