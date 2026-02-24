/** Use for all API route responses so Vercel edge/CDN does not cache and override revalidatePath. */
export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
} as const;
