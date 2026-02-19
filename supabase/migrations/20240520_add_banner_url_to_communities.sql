-- Add banner_url to communities table
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS banner_url text;

-- Update types if necessary (though usually they are regenerated)
COMMENT ON COLUMN public.communities.banner_url IS 'Custom banner image URL for the community hub';
