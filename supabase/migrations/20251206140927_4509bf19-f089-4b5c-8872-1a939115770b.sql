-- Add NOT NULL constraint on models.system_id (orphans already cleaned up)
ALTER TABLE models ALTER COLUMN system_id SET NOT NULL;
ALTER TABLE models ALTER COLUMN project_id SET NOT NULL;

-- Create function to auto-create approval record when system enters pending_approval
CREATE OR REPLACE FUNCTION public.auto_create_approval_record()
RETURNS TRIGGER AS $$
BEGIN
  -- If system is moving to pending_approval and requires_approval is true
  IF NEW.deployment_status = 'pending_approval' 
     AND NEW.requires_approval = true
     AND (OLD.deployment_status IS DISTINCT FROM 'pending_approval') THEN
    
    -- Check if pending approval already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.system_approvals 
      WHERE system_id = NEW.id AND status = 'pending'
    ) THEN
      -- Create approval record
      INSERT INTO public.system_approvals (system_id, status, reason, requested_by)
      VALUES (
        NEW.id, 
        'pending', 
        'Auto-created when system moved to pending_approval',
        NEW.owner_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-approval record creation
DROP TRIGGER IF EXISTS trigger_auto_create_approval ON systems;
CREATE TRIGGER trigger_auto_create_approval
  AFTER UPDATE ON systems
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_approval_record();

-- Also trigger on insert if system is created directly in pending_approval state
DROP TRIGGER IF EXISTS trigger_auto_create_approval_insert ON systems;
CREATE TRIGGER trigger_auto_create_approval_insert
  AFTER INSERT ON systems
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_approval_record();