-- FIX DATA: Assign provincial context to user 'João Pedro'
-- This script finds the user by name (or we could use ID from logs: bebaf8a8-882a-4627-83ec-88d9beee5be9)
-- And assigns them to the first available Direcção Provincial found in the DB.

DO $$
DECLARE
    target_user_id uuid := 'bebaf8a8-882a-4627-83ec-88d9beee5be9'; -- ID from debug logs
    dir_id uuid;
    gov_id uuid;
BEGIN
    -- 1. Get a direccao_provincial_id (any, just to fix the user)
    SELECT id INTO dir_id FROM public.direccoes_provinciais LIMIT 1;
    
    -- 2. Get a governo_provincial_id
    SELECT id INTO gov_id FROM public.governo_provincial LIMIT 1;

    IF dir_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
            source_type = 'provincial',
            direccao_provincial_id = dir_id,
            governo_provincial_id = gov_id,
            municipio_id = NULL -- Clear municipal ID if they are provincial
        WHERE id = target_user_id;
        
        RAISE NOTICE 'User % updated with Direccao ID %', target_user_id, dir_id;
    ELSE
        RAISE NOTICE 'No direccao_provincial found to assign!';
    END IF;
END $$;
