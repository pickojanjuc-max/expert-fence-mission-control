// ─────────────────────────────────────────────────────────────────────
// Scope description helper
//
// Builds the human-readable "scope of work" line shown on client quote
// PDFs, one per calculation. The description is editable per-calc and
// persisted on project_calculations.scope_description.
//
// Also exposes metreage(calculatorType, calculatorState) so other UIs
// (calculator headers, project cards) can show a run length summary.
// ─────────────────────────────────────────────────────────────────────

/** Sum a list of run objects' length_mm, opening_mm, or length fields. */
function sumRunLengthsMM(runs) {
  if (!Array.isArray(runs)) return 0;
  return runs.reduce((total, r) => {
    const n = Number(
      r?.length_mm ?? r?.opening_mm ?? r?.openingMM ?? r?.length ?? 0
    );
    return total + (isFinite(n) ? n : 0);
  }, 0);
}

/** Round mm -> m with 1dp; show whole number if exact. */
function formatMetres(mm) {
  if (!mm || mm <= 0) return '';
  const m = mm / 1000;
  const s = m.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/**
 * Return total linear metres from a calculator's saved state.
 * Returns a string like "8.4" or "" if the state doesn't carry length.
 */
export function metreage(calculatorType, calculatorState) {
  if (!calculatorState) return '';
  const state = calculatorState;

  switch (calculatorType) {
    case 'glass': {
      // Glass pool — runs array with length_mm
      return formatMetres(sumRunLengthsMM(state.runs));
    }
    case 'aluminium': {
      // Aluminium-v2 — runs array with length_mm
      return formatMetres(sumRunLengthsMM(state.runs));
    }
    case 'balustrade': {
      // Glass balustrade — runs with length_mm
      return formatMetres(sumRunLengthsMM(state.runs));
    }
    case 'wire': {
      // Wire — runs with opening_mm / openingMM
      return formatMetres(sumRunLengthsMM(state.runs));
    }
    case 'aire': {
      // Aire+ — runs with length_mm
      return formatMetres(sumRunLengthsMM(state.runs));
    }
    case 'custom-glass': {
      // Custom glass — not a run-based system, metreage doesn't apply
      return '';
    }
    default:
      return '';
  }
}

/** Clean a string like "Polished 316" / "polished" into lowercase adjective. */
function lc(s) {
  return (s == null ? '' : String(s)).trim().toLowerCase();
}

/**
 * Build a default scope description sentence based on calc state.
 * Kept deliberately short — tradie can edit to whatever they want
 * for the specific client.
 */
export function buildDefaultScope(calculatorType, calculatorState, label) {
  const st = calculatorState || {};
  const m = metreage(calculatorType, calculatorState);
  const lengthSuffix = m ? ` Approximately ${m}m.` : '';

  switch (calculatorType) {
    case 'glass': {
      const thick = st.glassThickness || st.thickness || '12';
      const spigot = lc(st.spigotFinish || st.spigot || '');
      const spigotStr = spigot ? `${spigot} spigots, ` : '';
      return `Supply and install frameless glass pool fencing — ${spigotStr}${thick}mm toughened safety glass panels.${lengthSuffix}`.trim();
    }
    case 'aluminium': {
      const style = st.selectedStyle || st.style || 'aluminium';
      const colour = st.colour || '';
      const mount = st.mount || '';
      const parts = [style, colour].filter(Boolean).join(' ').trim();
      const mountStr = mount ? ` ${lc(mount)} mounted,` : '';
      return `Supply and install ${parts} aluminium fencing,${mountStr} including posts, panels and all associated hardware.${lengthSuffix}`.trim();
    }
    case 'balustrade': {
      const thick = st.glassThickness || st.thickness || '12';
      const glassType = st.glassType ? lc(st.glassType) : 'clear toughened';
      const spigotFinish = lc(st.spigotFinish || st.spigot || '');
      const rail = st.topRail || st.rail || '';
      const spigotStr = spigotFinish ? `${spigotFinish} spigots, ` : '';
      const railStr = rail ? `${rail} top rail, ` : '';
      return `Supply and install frameless glass balustrading — ${spigotStr}${railStr}${thick}mm ${glassType} safety glass.${lengthSuffix}`.trim();
    }
    case 'wire': {
      const term = lc(st.terminationStyle || st.termination || '');
      const wireCount = st.selectedWireCount || st.wireCount || '';
      const wireStr = wireCount ? `${wireCount}-wire configuration, ` : '';
      const termStr = term ? `${term} terminations, ` : '';
      return `Supply and install stainless steel wire balustrading — ${wireStr}${termStr}compliant with AS 1170 span/deflection limits.${lengthSuffix}`.trim();
    }
    case 'aire': {
      const colour = st.colour || '';
      const colourStr = colour ? `${colour} ` : '';
      return `Supply and install ${colourStr}AIRE+ aluminium slat fencing, including posts, slats and all associated hardware.${lengthSuffix}`.trim();
    }
    case 'custom-glass': {
      const panels = Array.isArray(st.panels) ? st.panels : [];
      const qty = panels.reduce((n, p) => n + Number(p?.qty || 0), 0);
      const qtyStr = qty > 0 ? `${qty} ` : '';
      return `Supply ${qtyStr}custom-cut toughened glass panels to specified dimensions.`.trim();
    }
    default:
      return label || '';
  }
}
