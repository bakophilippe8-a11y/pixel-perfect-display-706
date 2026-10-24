ALTER TABLE public.sales_campaigns DROP CONSTRAINT IF EXISTS sales_campaigns_status_check;
ALTER TABLE public.sales_campaigns ADD CONSTRAINT sales_campaigns_status_check CHECK (status IN ('draft','approved','rejected','publishing','published','failed'));
ALTER TABLE public.sales_campaigns ADD COLUMN published_at timestamptz, ADD COLUMN facebook_post_id text, ADD COLUMN publish_error text;
CREATE UNIQUE INDEX sales_campaigns_post_unique ON public.sales_campaigns(user_id, facebook_post_id) WHERE facebook_post_id IS NOT NULL;
CREATE FUNCTION public.register_sales_optout(owner_id uuid, conversation uuid, message text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.sales_conversations; BEGIN
SELECT * INTO c FROM public.sales_conversations WHERE id=conversation AND user_id=owner_id FOR UPDATE;
IF NOT FOUND THEN RETURN false; END IF;
INSERT INTO public.sales_messages(user_id,conversation_id,direction,content,author,status) VALUES(owner_id,c.id,'inbound',message,'client','received');
UPDATE public.sales_conversations SET opted_out=true,status='closed',automation_epoch=automation_epoch+1,updated_at=now() WHERE id=c.id;
INSERT INTO public.sales_messages(user_id,conversation_id,direction,content,author,status,decision) VALUES(owner_id,c.id,'decision','closed','system','internal',jsonb_build_object('mode','closed','reason','opt_out'));
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.register_sales_optout(uuid,uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.register_sales_optout(uuid,uuid,text) TO service_role;
