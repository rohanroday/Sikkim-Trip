/** Brand and contact settings in one place. Working name until the brand is chosen (PRD §14 Q7). */
export const site = {
  name: "Sikkim Trip",
  tagline: "One fixed price. Permits handled.",
  description:
    "Fixed-price North Sikkim, Nathula and Pelling trips with live homestay availability. Permits filed by registered Sikkim operators.",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  heroVideo: process.env.NEXT_PUBLIC_HERO_VIDEO ?? "",
};

export function whatsappLink(text: string): string {
  const num = site.supportWhatsapp.replace(/\D/g, "");
  const base = num ? `https://wa.me/${num}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
