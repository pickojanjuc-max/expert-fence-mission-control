// Balustrade-specific SKU mappings
// MADRID Base Plated Spigots - one product family with 4 colour variants
export const BALUSTRADE_SPIGOT_SKUS = {
  "Black": "MAD-SBP-B",
  "Matte White": "MAD-SBP-MW",
  "Polished": "MAD-SBP-P",
  "Satin": "MAD-SBP-S",
};

export const BALUSTRADE_COLOURS = ["Black", "Matte White", "Polished", "Satin"];

// Default finishes for balustrade
export function getDefaultBalustradeFinishes() {
  return {
    spigotColour: "Satin",
    handrailOn: false,
  };
}
