// ────────────────────────────────────────────────────────────────────
// Direct-update helper for a calculation that is already saved to a
// project.
//
// All six calculator pages use the SaveProjectModal for the first-time
// save (picking a project name, client, etc.). Once a calculation has
// been saved, subsequent saves should just update in-place without
// re-prompting. This helper is the single POST the "Update Project"
// button calls so the behavior stays identical across calculators.
//
// Usage:
//   const res = await updateCalculation({
//     projectId, projectName, calculationId,
//     calculatorType, calculatorState, bomSnapshot,
//     label,
//   });
//   // res = { projectId, projectName, calculationId }
// ────────────────────────────────────────────────────────────────────

export async function updateCalculation({
  projectId,
  projectName,
  calculationId,
  calculatorType,
  calculatorState,
  bomSnapshot,
  label,
}) {
  if (!projectId) throw new Error('updateCalculation: projectId is required');
  if (!calculatorType) throw new Error('updateCalculation: calculatorType is required');

  const payload = {
    project_id: projectId,
    calculation_id: calculationId || undefined,
    calculator_type: calculatorType,
    calculator_state: calculatorState,
    bom_snapshot: bomSnapshot || null,
    label: (label || '').trim(),
    name: projectName || undefined,
  };

  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok || !data.project) {
    throw new Error(data.error || 'Update failed');
  }

  return {
    projectId: data.project.id,
    projectName: data.project.name,
    calculationId: data.calculation?.id || calculationId || null,
  };
}
