export const PANEL_SIZES = [];
for (let i = 200; i <= 2000; i += 50) PANEL_SIZES.push(i);

export const HINGE_PANEL_SIZES = [600, 800, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800];

export const GATE_WIDTHS = [750, 834, 890, 1000];

export const GATE_SKU_MAP = {
  750: "08SLG-0750",
  834: "08SLG-0834",
  890: "08SLG-0890",
  1000: "08SLG-1000",
};

export const HINGE_GLASS = {
  polish: "PSC-S155-GG-P",
  satin: "PSC-S155-GG-S",
  black: "PSC-S155-GG-B",
};

export const HINGE_WALL = {
  polish: "PSC-S155-W-P",
  satin: "PSC-S155-W-S",
  black: "PSC-S155-W-B",
};

export const LATCH_MAP = {
  inline_glass_to_glass: { polish: "MR-FLGG-P", satin: "MR-FLGG-S", black: "MR-FLGG-B", matt_white: "MR-FLGG-MW" },
  corner_external: { polish: "MR-FL90E-P", satin: "MR-FL90E-S", black: "MR-FL90E-B", matt_white: "MR-FL90E-MW" },
  corner_internal: { polish: "MR-FL90I-P", satin: "MR-FL90I-S", black: "MR-FL90I-B", matt_white: "MR-FL90I-MW" },
  post_or_wall: { polish: "MR-WGL-P", satin: "MR-WGL-S", black: "MR-WGL-B", matt_white: "MR-WGL-MW" },
};

export const SPIGOT_SKUS = {
  Round: {
    // Round profile uses RIO spigots + RIO dress rings
    spigot: { polish: "RIO-S-P", satin: "RIO-S-S", black: "", matt_white: "RIO-S-MW" },
    ring: { polish: "RIO-DR-P", satin: "RIO-DR-S", black: "", matt_white: "RIO-DR-MW" },
  },
  Square: {
    // Square profile uses POOLMAD spigots
    spigot: { polish: "POOLMAD-S-P", satin: "POOLMAD-S-S", black: "POOLMAD-S-B", matt_white: "POOLMAD-S-MW" },
    // Dress ring family locked to MAD-DR
    ring: { polish: "MAD-DR-P", satin: "MAD-DR-S", black: "MAD-DR-B", matt_white: "MAD-DR-MW" },
  },
};

export const FINISH_LABELS = {
  polish: "Polished",
  satin: "Satin",
  black: "Matt Black",
  matt_white: "Matt White",
};

export const LATCH_LABELS = {
  inline_glass_to_glass: "Inline Glass to Glass",
  corner_external: "Corner External",
  corner_internal: "Corner Internal",
  post_or_wall: "Post or Wall",
};
// --- Balustrade (separate system from pool fencing) ---
// Standard SUMMIT Frameless Balustrade panels (970mm high, 300-1800mm wide)
// Panel SKU template: 970NTG-XXXX (widthPadded)
export const BALUSTRADE_PANEL_PREFIX = "970NTG-";

// MADRID Base Plated Spigots - 4 colour variants
export const BALUSTRADE_SPIGOT_SKUS = {
  Black: "MAD-SBP-B",
  "Matte White": "MAD-SBP-MW",
  Polished: "MAD-SBP-P",
  Satin: "MAD-SBP-S",
};

// MADRID Domical Cover plates - matching colour variants
export const BALUSTRADE_COVER_PLATE_SKUS = {
  Black: "MAD-SDC-B",
  "Matte White": "MAD-SDC-MW",
  Polished: "MAD-SDC-P",
  Satin: "MAD-SDC-S",
};

// Handrail system (SUMMIT 25x21mm RHS) — colour-matched to spigot colour
// Colour code suffixes: B=Black, MW=Matte White, P=Polished, S=Satin
// Rail stock: 5800mm in all 4 colours; 2900mm available in Satin only.
export const BALUSTRADE_HANDRAIL_RAIL_SKUS_5800 = {
  Black: "STG-R5800-2521-B",
  "Matte White": "STG-R5800-2521-MW",
  Polished: "STG-R5800-2521-P",
  Satin: "STG-R5800-2521-S",
};

export const BALUSTRADE_HANDRAIL_RAIL_LENGTH_MM = 5800;

export const BALUSTRADE_HANDRAIL_INLINE_JOINER_SKUS = {
  Black: "STG-2521-J-B",
  "Matte White": "STG-2521-J-MW",
  Polished: "STG-2521-J-P",
  Satin: "STG-2521-J-S",
};

export const BALUSTRADE_HANDRAIL_90_JOINER_SKUS = {
  Black: "STG-2521-90J-B",
  "Matte White": "STG-2521-90J-MW",
  Polished: "STG-2521-90J-P",
  Satin: "STG-2521-90J-S",
};

// Wall plate: Black has only base SKU, other colours likewise.
export const BALUSTRADE_HANDRAIL_WALL_PLATE_SKUS = {
  Black: "STG-2521-WP-B",
  "Matte White": "STG-2521-WP-MW",
  Polished: "STG-2521-WP-P",
  Satin: "STG-2521-WP-S",
};
