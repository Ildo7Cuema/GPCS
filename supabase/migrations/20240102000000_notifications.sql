-- ============================================================================
-- GPCS Media System - Notifications Schema
-- ============================================================================

-- 1. User Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_notifications boolean DEFAULT true,
    upload_notifications boolean DEFAULT true,
    security_alerts boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'upload', 'security'
    read boolean DEFAULT false,
    read_at timestamptz,
    action_url text, -- Optional link to navigate to
    metadata jsonb, -- Extra data (e.g., file_id, user_id who triggered, etc.)
    created_at timestamptz DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for notification_preferences
CREATE POLICY "Users can read own preferences" 
    ON public.notification_preferences 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
    ON public.notification_preferences 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
    ON public.notification_preferences 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- 6. RLS Policies for notifications
CREATE POLICY "Users can read own notifications" 
    ON public.notifications 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
    ON public.notifications 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
    ON public.notifications 
    FOR INSERT 
    WITH CHECK (true); -- Allow inserts (triggered by system/admins)

CREATE POLICY "Users can delete own notifications" 
    ON public.notifications 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 7. Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_title text,
    p_message text,
    p_type text DEFAULT 'info',
    p_action_url text DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
    VALUES (p_user_id, p_title, p_message, p_type, p_action_url, p_metadata)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- 8. Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true, read_at = now()
    WHERE user_id = p_user_id AND read = false;
END;
$$;

-- 9. Trigger to create default preferences when a profile is created
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS on_profile_created_notification_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_notification_prefs
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_notification_preferences();

-- 10. Trigger to create notification on new upload
CREATE OR REPLACE FUNCTION public.notify_on_new_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    uploader_name text;
    admin_id uuid;
BEGIN
    -- Get uploader name
    SELECT full_name INTO uploader_name 
    FROM public.profiles 
    WHERE id = NEW.uploaded_by;
    
    -- Notify admins in the same municipality about new uploads
    FOR admin_id IN 
        SELECT p.id FROM public.profiles p
        LEFT JOIN public.notification_preferences np ON np.user_id = p.id
        WHERE p.role IN ('superadmin', 'admin_municipal')
        AND (p.municipio_id = NEW.municipio_id OR p.role = 'superadmin')
        AND p.id != NEW.uploaded_by
        AND (np.upload_notifications IS NULL OR np.upload_notifications = true)
    LOOP
        PERFORM public.create_notification(
            admin_id,
            'Novo Ficheiro Carregado',
            COALESCE(uploader_name, 'Um utilizador') || ' carregou: ' || NEW.title,
            'upload',
            '/media',
            jsonb_build_object('file_id', NEW.id, 'uploader_id', NEW.uploaded_by)
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new uploads
DROP TRIGGER IF EXISTS on_media_upload_notify ON public.media_files;
CREATE TRIGGER on_media_upload_notify
    AFTER INSERT ON public.media_files
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_upload();
