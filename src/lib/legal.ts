/**
 * Fill these in before going live. Anything still in [brackets] is highlighted on the legal pages.
 * The legal pages are templates, not legal advice: have them reviewed by a lawyer.
 */
export const LEGAL = {
  company: "[Company name GmbH]",
  street: "[Street and number]",
  city: "[Postcode City]",
  country: "Germany",
  representative: "[Managing director (Geschäftsführer)]",
  register: "[Amtsgericht City, HRB 000000]",
  vatId: "[DE000000000]",
  email: "[hello@your-domain.com]",
  phone: "[+49 …]",
  lastUpdated: "12 October 2026",
};

export const isPlaceholder = (v: string) => v.startsWith("[");
