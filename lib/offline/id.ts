// A locally-generated id for a row created while offline. Supabase accepts
// a client-supplied primary key on insert (columns default to
// gen_random_uuid() but that default is only used when the column is
// omitted), so this same id is both what the UI shows immediately and what
// ends up in the database once the insert replays — no swap-the-id step
// needed once connectivity returns.
export function generateLocalId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
