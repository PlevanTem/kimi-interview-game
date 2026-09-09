/** Local art review only. Preview never reads, overwrites or clears a normal save. */
export function previewAct(url?: string): number | null {
  if (!url && typeof window === 'undefined') return null;
  const parsed = new URL(url ?? window.location.href);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return null;
  const act = parsed.searchParams.get('preview');
  const ids = ['prologue','lotus','cyclops','circe','nekyia','sirens','calypso','ithaca'];
  const index = ids.indexOf(act ?? '');
  return index < 0 ? null : index;
}
