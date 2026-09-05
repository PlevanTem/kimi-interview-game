/** Local art review only. Preview never reads, overwrites or clears a normal save. */
export function previewAct(url?: string): 1 | 2 | null {
  if (!url && typeof window === 'undefined') return null;
  const parsed = new URL(url ?? window.location.href);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return null;
  const act = parsed.searchParams.get('preview');
  return act === 'lotus' ? 1 : act === 'cyclops' ? 2 : null;
}
