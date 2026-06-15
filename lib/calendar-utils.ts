export const CARD_PALETTES = [
  { bg: "bg-cyan-400/80",    text: "text-cyan-950",    sub: "bg-black/10" },
  { bg: "bg-yellow-300/90",  text: "text-yellow-950",  sub: "bg-black/10" },
  { bg: "bg-sky-400/80",     text: "text-sky-950",     sub: "bg-black/10" },
  { bg: "bg-emerald-400/80", text: "text-emerald-950", sub: "bg-black/10" },
  { bg: "bg-orange-300/90",  text: "text-orange-950",  sub: "bg-black/10" },
  { bg: "bg-pink-400/80",    text: "text-pink-950",    sub: "bg-black/10" },
  { bg: "bg-violet-400/80",  text: "text-violet-950",  sub: "bg-black/10" },
  { bg: "bg-lime-300/90",    text: "text-lime-950",    sub: "bg-black/10" },
  { bg: "bg-teal-400/80",    text: "text-teal-950",    sub: "bg-black/10" },
  { bg: "bg-rose-400/80",    text: "text-rose-950",    sub: "bg-black/10" },
] as const;

export function propertyPalette(propertyId: string) {
  let h = 0;
  for (let i = 0; i < propertyId.length; i++) h = (h * 31 + propertyId.charCodeAt(i)) | 0;
  return CARD_PALETTES[Math.abs(h) % CARD_PALETTES.length];
}
