export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

/** Strip HTML tags and control characters from user supplied plain text. */
export function plainText(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export const normalizeQuery = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
