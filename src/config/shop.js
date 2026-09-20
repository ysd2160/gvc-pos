// Frontend ke default shop settings. Naam / GST / bill-output backend (/api/shop)
// se aakar overwrite ho jaate hain - asli settings backend/config/shop.js mein hain.
export const SHOP_DEFAULTS = {
  key: "cafe",
  name: "Good Vibes Cafe",
  emoji: "☕",
  logoUrl: "/logos/logo.png",
  gstEnabled: false,
  output: { thermal: true, pdf: false, whatsapp: false },
  orderType: true, // Dine-in / Takeaway option billing par
};
