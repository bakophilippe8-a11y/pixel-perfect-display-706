export function canSendFreeWhatsApp(lastInbound: string | null, now = Date.now()) {
  if (!lastInbound) return false;
  const elapsed = now - Date.parse(lastInbound);
  return elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
}

export function canAutomate(status: string, optedOut: boolean) {
  return status === 'active' && !optedOut;
}

export const publicationAllowed = () => false;