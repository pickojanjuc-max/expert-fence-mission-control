/**
 * Style configurations — exact replica of PHP $style_config from calculate_quote_v5
 * and JS styleDefs from the inline calculator engine.
 */

export const STYLE_CONFIG = {
  Tubular: {
    post_width_mm: 50.0,
    panel_max_mm: 2450.0,
    gate_cc_mm: 1062.0,
    skus: {
      panel: 'SS-FTP-2450-B',
      bracket: 'SS-BH4-B',
      gate: 'SS-FTG-0975-B',
      gate_hardware: 'ML-TL-TC-H-AT',
      post_standard: { surface: 'SS-1300-BP-B', concrete: 'SS-1800-B' },
      post_corner: { surface: 'SS-1300-BP-B', concrete: 'SS-1800-B' },
      post_gate_heavy: { surface: 'SS-1600-BP-B', concrete: 'SS-2100-B' },
    },
    colours: ['Black', 'Monument', 'White'],
  },
  Blade: {
    post_width_mm: 50.0,
    panel_max_mm: 2200.0,
    gate_cc_mm: 1062.0,
    skus: {
      panel: 'BLA-PNL-2200-1200-B',
      bracket: 'FF-BH-OPEN-4PK-B',
      gate: 'BLA-GATE-0975-1200-B',
      gate_hardware: 'ML-TL-TC-H-AT',
      post_standard: { surface: 'SS-1300-BP-B', concrete: 'SS-1800-B' },
      post_corner: { surface: 'SS-1300-BP-B', concrete: 'SS-1800-B' },
      post_gate_heavy: { surface: 'SS-1600-BP-B', concrete: 'SS-2100-B' },
    },
    colours: ['Black'],
  },
  Barr: {
    post_width_mm: 25.0,
    panel_max_mm: 2205.0,
    gate_cc_mm: 1062.0,
    skus: {
      panel: 'BR-PANEL-2205-1200-B',
      bracket: 'BR-BR25-B-4PK',
      gate: 'BR-GATE-0975-1200-B',
      gate_hardware: 'ML-TL-TC-H-AT',
      post_standard: { surface: 'BR-1280-BP-B', concrete: 'BR-1800-B' },
      post_corner: { surface: 'SS-1300-BP-B', concrete: 'SS-1800-B' },
      post_gate_heavy: { surface: 'SS-1600-BP-B', concrete: 'SS-2100-B' },
    },
    colours: ['Black', 'White'],
  },
};

/** UI style card definitions — using product panel images from glassoutletonline.com.au */
export const STYLE_DEFS = [
  {
    name: 'Tubular',
    img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTP-2450-B.JPG',
    blurb: 'Classic flat-top tubular pool fencing',
  },
  {
    name: 'Blade',
    img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BLA-PNL-2200-1200-B.JPG',
    blurb: 'Modern blade-style aluminium fencing',
  },
  {
    name: 'Barr',
    img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-PANEL-2205-1200-B.JPG',
    blurb: 'Contemporary horizontal bar fencing',
  },
];

/** Shape definitions and their run counts */
export const SHAPE_MAP = {
  Straight: 0, // dynamic — user adds runs
  'L-shape': 2,
  'U-shape': 3,
  Box: 4,
};

/** Default shared corners per shape */
export const SHAPE_CORNER_DEFAULTS = {
  Straight: 0,
  'L-shape': 1,
  'U-shape': 2,
  Box: 4,
};

/** Direction vectors for shaped layouts */
export const SHAPE_DIRS = {
  Straight: [[1, 0]],
  'L-shape': [[1, 0], [0, 1]],
  'U-shape': [[1, 0], [0, 1], [-1, 0]],
  Box: [[1, 0], [0, 1], [-1, 0], [0, -1]],
};

/** Mount types */
export const MOUNT_TYPES = ['Surface', 'Inground'];

/** Gate modes */
export const GATE_MODES = ['Start', 'End', 'Centre', 'Custom'];

/** Gate opening (centre-to-centre) in mm */
export const GATE_OPENING_MM = 1062;
