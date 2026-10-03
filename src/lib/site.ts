/**
 * Shared site/contact constants for NaumiCrowns.
 * Leaf module — import from here anywhere (no circular deps).
 */
export const SITE = {
  name: 'NaumiCrowns',
  domain: 'https://naumicrowns.young-agripreneurs.com',
  /** George first, Naumi second — both hold the identical admin role. */
  adminEmails: ['youngagripreneurs.ng@gmail.com', 'teffokgothatso9@gmail.com'],
  naumiPhone: '+27 79 751 9677',
  whatsapp: 'https://wa.me/27797519677',
} as const;
