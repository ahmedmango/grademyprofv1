/**
 * Returns true when every word in `query` appears somewhere in `text`.
 * Both sides are lower-cased. An empty query always matches.
 *
 *   smartMatch("ahmed al", "Dr. Ahmed Alhayki")  => true
 *   smartMatch("abd sar",  "Dr. Abdulla Sarhan") => true
 */
export function smartMatch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}
