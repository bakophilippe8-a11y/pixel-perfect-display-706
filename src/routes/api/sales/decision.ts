import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
export const Route = createFileRoute('/api/sales/decision')({ server: { handlers: { POST: async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const auth = await supabaseAdmin.auth.getUser(authorization.slice(7));
  if (auth.error || !auth.data.user) return new Response('Unauthorized', { status: 401 });
  const payload = await request.json().catch(() => null);
  const body = z.object({ conversationId: z.string().uuid(), message: z.string().trim().min(1).max(10000) }).safeParse(payload);
  if (!body.success) return Response.json({ error: 'Message invalide.' }, { status: 400 });
  const { salesDecision } = await import('@/lib/sales-ai.server');
  return salesDecision(request, auth.data.user.id, body.data.conversationId, body.data.message);
} } } });
