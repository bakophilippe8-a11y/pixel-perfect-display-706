ALTER TABLE public.sales_conversations ADD COLUMN automation_epoch integer NOT NULL DEFAULT 0;
ALTER TABLE public.sales_messages ADD COLUMN author text NOT NULL DEFAULT 'system' CHECK (author IN ('client','ai','human','system'));
UPDATE public.sales_messages SET author = CASE WHEN direction='inbound' THEN 'client' WHEN direction='outbound' OR decision IS NOT NULL THEN 'ai' ELSE 'system' END;
CREATE TABLE public.sales_product_views (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, conversation_id uuid NOT NULL REFERENCES public.sales_conversations(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, viewed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(conversation_id,product_id));
GRANT SELECT ON public.sales_product_views TO authenticated; GRANT ALL ON public.sales_product_views TO service_role;
ALTER TABLE public.sales_product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_product_views ON public.sales_product_views FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE FUNCTION public.set_sales_mode(owner_id uuid, conversation uuid, next_status text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.sales_conversations; BEGIN
IF next_status NOT IN ('active','human','closed') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
SELECT * INTO c FROM public.sales_conversations WHERE id=conversation AND user_id=owner_id FOR UPDATE;
IF NOT FOUND THEN RETURN false; END IF;
IF c.opted_out AND next_status='active' THEN RAISE EXCEPTION 'Contact opted out'; END IF;
IF c.status=next_status THEN RETURN true; END IF;
UPDATE public.sales_conversations SET status=next_status,automation_epoch=automation_epoch+1,updated_at=now() WHERE id=c.id;
INSERT INTO public.sales_messages(user_id,conversation_id,direction,content,author,status,decision) VALUES(owner_id,c.id,'decision',next_status,'human','internal',jsonb_build_object('mode',next_status));
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.set_sales_mode(uuid,uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.set_sales_mode(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.commit_sales_decision(owner_id uuid, conversation uuid, expected_epoch integer, result jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.sales_conversations; act text; BEGIN
SELECT * INTO c FROM public.sales_conversations WHERE id=conversation AND user_id=owner_id FOR UPDATE;
IF NOT FOUND OR c.status<>'active' OR c.opted_out OR c.automation_epoch<>expected_epoch THEN RETURN false; END IF;
IF EXISTS(SELECT 1 FROM public.sales_guidelines WHERE user_id=owner_id AND ai_paused) THEN RETURN false; END IF;
act:=result->>'action';
IF act NOT IN ('SEND_MESSAGE','TRANSFER_TO_HUMAN','GENERATE_AD_CAMPAIGN') OR act IS NULL THEN RAISE EXCEPTION 'Invalid decision'; END IF;
IF c.channel<>'internal' THEN RETURN false; END IF;
IF act='TRANSFER_TO_HUMAN' THEN UPDATE public.sales_conversations SET status='human',automation_epoch=automation_epoch+1 WHERE id=c.id; END IF;
IF act='GENERATE_AD_CAMPAIGN' THEN INSERT INTO public.sales_campaigns(user_id,title,facebook_copy,voiceover_script) VALUES(owner_id,c.contact_name,COALESCE(result->>'facebook_copy',''),COALESCE(result->>'voiceover_script','')); END IF;
INSERT INTO public.sales_messages(user_id,conversation_id,direction,content,decision,status,author) VALUES(owner_id,c.id,CASE WHEN act='SEND_MESSAGE' THEN 'outbound' ELSE 'decision' END,COALESCE(NULLIF(result->>'message',''),result->>'reason',''),result,'internal','ai');
UPDATE public.sales_conversations SET updated_at=now() WHERE id=c.id;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.commit_sales_decision(uuid,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.commit_sales_decision(uuid,uuid,integer,jsonb) TO service_role;
CREATE FUNCTION public.touch_sales_conversation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.sales_conversations SET updated_at=greatest(updated_at,NEW.created_at),last_inbound_at=CASE WHEN NEW.direction='inbound' THEN greatest(last_inbound_at,NEW.created_at) ELSE last_inbound_at END WHERE id=NEW.conversation_id AND user_id=NEW.user_id; RETURN NEW; END $$;
CREATE TRIGGER touch_sales_history AFTER INSERT ON public.sales_messages FOR EACH ROW EXECUTE FUNCTION public.touch_sales_conversation();