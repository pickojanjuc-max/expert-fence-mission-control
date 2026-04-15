import jsPDF from 'jspdf';

/**
 * Spigot offset rules (mm from panel end to spigot centre)
 */
function spigotOffsetForPanel(widthMm) {
  if (widthMm >= 300 && widthMm <= 650) return 100;
  if (widthMm >= 700 && widthMm <= 1050) return 150;
  if (widthMm >= 1100 && widthMm <= 1350) return 200;
  if (widthMm >= 1400 && widthMm <= 1750) return 250;
  return null;
}

/**
 * Build segment sequence from layout sequence
 */
function buildSegmentSequence(sequence) {
  const seq = [];
  
  for (const seg of sequence) {
    let label = '';
    let len = seg.value || 0;
    let type = seg.kind;

    if (seg.kind === 'PANEL') {
      label = `${Math.round(len)}`;
      type = 'PANEL';
    } else if (seg.kind === 'GATE') {
      label = `${Math.round(len)}MG`;
      type = 'GATE';
    } else if (seg.kind === 'HINGE_GAP') {
      label = `${Math.round(len)}`;
      type = 'HINGE_GAP';
    } else if (seg.kind === 'LATCH_GAP') {
      label = `${Math.round(len)}`;
      type = 'LATCH_GAP';
    } else {
      label = `${Math.round(len)}`;
      type = 'GAP';
    }

    seq.push([type, label, len]);
  }

  return seq;
}

function getShapeType(runs) {
  if (!Array.isArray(runs)) return 'Straight';
  const isSideLabels = runs.length > 1 && runs.every(r => typeof r?.label === 'string' && r.label.startsWith('Side '));
  if (!isSideLabels) return 'Straight';
  if (runs.length === 2) return 'L-shape';
  if (runs.length === 3) return 'U-shape';
  if (runs.length >= 4) return 'Box';
  return 'Straight';
}

function getRunCornerRefs(shape, runIdx) {
  const ref = { start: null, end: null };
  if (shape === 'L-shape') {
    if (runIdx === 0) ref.start = 'A-B';
    if (runIdx === 1) ref.end = 'A-B';
  } else if (shape === 'U-shape') {
    if (runIdx === 0) { ref.start = 'A-B'; ref.end = 'A-C'; }
    if (runIdx === 1) ref.end = 'A-B';
    if (runIdx === 2) ref.start = 'A-C';
  } else if (shape === 'Box') {
    if (runIdx === 0) { ref.start = 'A-B'; ref.end = 'A-C'; }
    if (runIdx === 1) { ref.start = 'B-D'; ref.end = 'A-B'; }
    if (runIdx === 2) { ref.start = 'D-C'; ref.end = 'A-C'; }
    if (runIdx === 3) { ref.start = 'B-D'; ref.end = 'D-C'; }
  }
  return ref;
}

/**
 * Generate setout plan PDF
 * Supports single run (legacy) or array of runs for multi-run sequential display
 */
export function generateSetoutPlanPDF(config) {
  // Handle both legacy (single config) and new (array of configs) formats
  const runs = Array.isArray(config) ? config : [config];
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 28;
  const drawLeft = margin;
  const drawRight = pageW - margin;
  const titleBlockHeight = 55;
  const drawBottom = margin + titleBlockHeight;

  const drawTitleBlock = () => {
    const tbY = margin + 10;
    const tbH = 44;
    const tbW = pageW - 2 * margin;

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, tbY, tbW, tbH);
    doc.line(margin + 42, tbY, margin + 42, tbY + tbH);
    doc.line(margin + 42, tbY + 22, margin + tbW, tbY + 22);
    doc.line(margin + 360, tbY, margin + 360, tbY + tbH);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('01', margin + 21, tbY + 22, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Title: Glass Pool Fence Setout', margin + 48, tbY + 32);
    doc.text('Name: Expert Fence', margin + 48, tbY + 15);
    doc.text('Scale: FIT TO PAPER', margin + 368, tbY + 32);
    doc.text('Note: All dimensions are in mm', margin + 368, tbY + 15);
  };

  const drawShapeGuidePage = (shape) => {
    const left = margin + 50;
    const right = pageW - margin - 50;
    const top = drawBottom + 30;
    const bottom = pageH - margin - 45;
    const drawW = right - left;
    const drawH = bottom - top;

    const lengths = runs.map(r => Math.max(1, Number(r.totalRun || 0)));
    const lenA = lengths[0] || 1;
    const lenB = lengths[1] || lenA;
    const lenC = lengths[2] || lenB;
    const lenD = lengths[3] || lenA;

    const runsGeom = [];
    const corners = [];

    if (shape === 'L-shape') {
      runsGeom.push({ runIdx: 0, p0: [0, 0], p1: [lenA, 0] });
      runsGeom.push({ runIdx: 1, p0: [0, 0], p1: [0, -lenB] });
      corners.push({ name: 'A-B', pt: [0, 0], ox: -24, oy: -16 });
    } else if (shape === 'U-shape') {
      runsGeom.push({ runIdx: 0, p0: [0, 0], p1: [lenA, 0] });
      runsGeom.push({ runIdx: 1, p0: [0, 0], p1: [0, -lenB] });
      runsGeom.push({ runIdx: 2, p0: [lenA, 0], p1: [lenA, -lenC] });
      corners.push({ name: 'A-B', pt: [0, 0], ox: -24, oy: -16 });
      corners.push({ name: 'A-C', pt: [lenA, 0], ox: 18, oy: -16 });
    } else if (shape === 'Box') {
      const wTop = lenD;
      runsGeom.push({ runIdx: 0, p0: [0, 0], p1: [lenA, 0] });
      runsGeom.push({ runIdx: 1, p0: [0, 0], p1: [0, -lenB] });
      runsGeom.push({ runIdx: 2, p0: [lenA, 0], p1: [lenA, -lenC] });
      runsGeom.push({ runIdx: 3, p0: [0, -lenB], p1: [wTop, -lenB] });
      corners.push({ name: 'A-B', pt: [0, 0], ox: -24, oy: -16 });
      corners.push({ name: 'A-C', pt: [lenA, 0], ox: 18, oy: -16 });
      corners.push({ name: 'B-D', pt: [0, -lenB], ox: -24, oy: 18 });
      corners.push({ name: 'D-C', pt: [wTop, -lenB], ox: 18, oy: 18 });
    }

    const allPts = runsGeom.flatMap(r => [r.p0, r.p1]);
    const minX = Math.min(...allPts.map(p => p[0]));
    const maxX = Math.max(...allPts.map(p => p[0]));
    const minY = Math.min(...allPts.map(p => p[1]));
    const maxY = Math.max(...allPts.map(p => p[1]));
    const shapeW = Math.max(1, maxX - minX);
    const shapeH = Math.max(1, maxY - minY);
    const scale = Math.min((drawW * 0.75) / shapeW, (drawH * 0.75) / shapeH);

    const tx = left + drawW / 2 - ((minX + maxX) / 2) * scale;
    const ty = top + drawH / 2 - ((minY + maxY) / 2) * scale;
    const mapPt = ([x, y]) => [tx + x * scale, ty + y * scale];
    const modelCx = tx + ((minX + maxX) / 2) * scale;
    const modelCy = ty + ((minY + maxY) / 2) * scale;

    const thick = 4;
    const spigotInset = 20;
    const drawRun = (runIdx, p0, p1) => {
      const run = runs[runIdx];
      if (!run) return;
      const seq = buildSegmentSequence(run.layoutSequence || []);
      const total = Math.max(1, Number(run.totalRun || 1));
      const [x0, y0] = mapPt(p0);
      const [x1, y1] = mapPt(p1);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const isHorizontal = Math.abs(dx) >= Math.abs(dy);

      let cursor = 0;
      for (const [type, _lbl, len] of seq) {
        const segStart = cursor;
        const segEnd = cursor + len;
        cursor = segEnd;

        const sx = x0 + (segStart / total) * dx;
        const sy = y0 + (segStart / total) * dy;
        const ex = x0 + (segEnd / total) * dx;
        const ey = y0 + (segEnd / total) * dy;

        if (type === 'PANEL' || type === 'GATE') {
          const color = type === 'GATE' ? [239, 68, 68] : [59, 130, 246];
          doc.setFillColor(...color);
          doc.setDrawColor(...color);
          if (isHorizontal) {
            const x = Math.min(sx, ex);
            const w = Math.max(Math.abs(ex - sx), 2);
            doc.rect(x, sy - thick / 2, w, thick, 'FD');

            if (type === 'PANEL' && w >= 2 * spigotInset + 6) {
              doc.setFillColor(107, 114, 128);
              doc.rect(x + spigotInset - 1, sy - 6, 2, 12, 'F');
              doc.rect(x + w - spigotInset - 1, sy - 6, 2, 12, 'F');
              doc.setFillColor(...color);
            }

            if (type === 'PANEL' && Math.abs(ex - sx) >= 34) {
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(30, 58, 95);
              doc.text(`${Math.round(len)}`, (sx + ex) / 2, sy - 12, { align: 'center' });
              doc.setTextColor(0, 0, 0);
            }
          } else {
            const y = Math.min(sy, ey);
            const h = Math.max(Math.abs(ey - sy), 2);
            doc.rect(sx - thick / 2, y, thick, h, 'FD');

            if (type === 'PANEL' && h >= 2 * spigotInset + 6) {
              doc.setFillColor(107, 114, 128);
              doc.rect(sx - 6, y + spigotInset - 1, 12, 2, 'F');
              doc.rect(sx - 6, y + h - spigotInset - 1, 12, 2, 'F');
              doc.setFillColor(...color);
            }

            if (type === 'PANEL' && Math.abs(ey - sy) >= 36) {
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(30, 58, 95);
              doc.text(`${Math.round(len)}`, sx + 16, (sy + ey) / 2, { align: 'left' });
              doc.setTextColor(0, 0, 0);
            }
          }
        }
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      if (isHorizontal) {
        const runY = (y0 + y1) / 2;
        const lblY = runY < modelCy ? runY - 24 : runY + 24;
        doc.text(run.label || `Side ${String.fromCharCode(65 + runIdx)}`, (x0 + x1) / 2, lblY, { align: 'center' });
      } else {
        const runX = (x0 + x1) / 2;
        const lblX = runX < modelCx ? runX - 24 : runX + 24;
        doc.text(run.label || `Side ${String.fromCharCode(65 + runIdx)}`, lblX, (y0 + y1) / 2, { align: 'center' });
      }
    };

    for (const r of runsGeom) drawRun(r.runIdx, r.p0, r.p1);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    for (const c of corners) {
      const [cx, cy] = mapPt(c.pt);
      const labelY = cy < modelCy ? cy - 18 : cy + 24;
      doc.text(`CNR ${c.name}`, cx, labelY, { align: 'center' });
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${shape} Guide (panels + gates only)`, left, top - 8);
  };
  
  // Layout: 2 runs per page max
  const runsPerPage = 2;
  const runHeight = (pageH - drawBottom - margin) / runsPerPage;  // Vertical space per run
  const shapeType = getShapeType(runs);
  const hasGuidePage = shapeType !== 'Straight';

  // Draw first page
  drawTitleBlock();
  if (hasGuidePage) {
    drawShapeGuidePage(shapeType);
    doc.addPage();
    drawTitleBlock();
  }

  // Process each run, adding pages as needed
  for (let runIdx = 0; runIdx < runs.length; runIdx++) {
    // Add new page if this run starts a new page
    if (runIdx > 0 && runIdx % runsPerPage === 0) {
      doc.addPage();
      drawTitleBlock();
    }
    
    const config = runs[runIdx];
    const {
      layoutSequence = [],
      totalRun = 9230,
      label = `Run ${runIdx + 1}`
    } = config;

    // Convert sequence to segments
    const seq = buildSegmentSequence(layoutSequence);

    // Correct rounding
    let seqSum = seq.reduce((sum, [_, __, len]) => sum + len, 0);
    if (seq.length > 0 && Math.abs(seqSum - totalRun) > 0.5) {
      const [t, lbl, ln] = seq[seq.length - 1];
      seq[seq.length - 1] = [t, lbl, ln + (totalRun - seqSum)];
    }

    // Calculate position within current page (0 or 1 position on page)
    const posOnPage = runIdx % runsPerPage;
    const fenceY = drawBottom + 20 + (posOnPage * runHeight) + 50;  // Position within allocated space
    const overallDimY = fenceY + 85;  // More spacing
    const segmentDimY = fenceY + 40;  // Better separation
    const lineLeft = drawLeft + 60;
    const lineRight = drawRight - 30;
    const lineW = Math.max(lineRight - lineLeft, 10);
    const scale = lineW / Math.max(totalRun, 1);

    // Side label (left side, above fence line)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, drawLeft + 5, fenceY - 20);

    // Main fence line — BLACK
    doc.setLineWidth(1.4);
    doc.setDrawColor(0, 0, 0);
    doc.line(lineLeft, fenceY, lineRight, fenceY);

    // Corner refs at actual run ends (for shaped layouts)
    if (hasGuidePage) {
      const refs = getRunCornerRefs(shapeType, runIdx);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      if (refs.start) doc.text(`CNR ${refs.start}`, lineLeft - 14, fenceY + 2, { align: 'right' });
      if (refs.end) doc.text(`CNR ${refs.end}`, lineRight + 14, fenceY + 2, { align: 'left' });
    }

    // Overall top dimension
    doc.setLineWidth(0.8);
    doc.setDrawColor(0, 0, 0);
    doc.line(lineLeft, overallDimY, lineRight, overallDimY);
    doc.line(lineLeft, overallDimY - 5, lineLeft, overallDimY + 5);
    doc.line(lineRight, overallDimY - 5, lineRight, overallDimY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${Math.round(totalRun)}`, (lineLeft + lineRight) / 2, overallDimY + 22, { align: 'center' });

    // Segment labels and spigots
    let x = lineLeft;
    const runningPoints = [0];
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    for (const [segType, segLabel, segLen] of seq) {
      const nx = x + segLen * scale;
      const segMid = (x + nx) / 2;

      // Segment marker
      if (segType === 'GATE') {
        doc.setLineWidth(2.2);
        doc.line(x, fenceY + 1.5, nx, fenceY + 1.5);
        doc.setLineWidth(0.8);
      } else {
        // Panel segment marker removed
      }

      // Dimension guide
      doc.setDrawColor(0, 0, 0);
      doc.line(x, segmentDimY, nx, segmentDimY);
      doc.line(x, segmentDimY - 3, x, segmentDimY + 3);
      doc.line(nx, segmentDimY - 3, nx, segmentDimY + 3);
      doc.setDrawColor(0, 0, 0);
      doc.text(segLabel, segMid, segmentDimY + 18, { align: 'center' });

      // Spigots for panels
      if (segType === 'PANEL') {
        const wMm = Math.round(segLen);
        const spOff = spigotOffsetForPanel(wMm);
        if (spOff && segLen - 2 * spOff > 0) {
          const c1 = x + spOff * scale;
          const c2 = nx - spOff * scale;
          doc.setDrawColor(24, 88, 214);
          doc.setFillColor(24, 88, 214);
          doc.circle(c1, fenceY, 2.5, 'FD');
          doc.circle(c2, fenceY, 2.5, 'FD');
          doc.setDrawColor(0);
          runningPoints.push((c1 - lineLeft) / scale);
          runningPoints.push((c2 - lineLeft) / scale);
        }
      }

      x = nx;
    }

    // Build running points for this run (independent, not cumulative)
    const runUniquePoints = [...new Set(runningPoints.map(v => Math.round(v + 1e-6)))].sort((a, b) => a - b);

    // Running measure chain — alternate above/below fence
    const labelFont = 7;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(labelFont);

    for (let i = 0; i < runUniquePoints.length; i++) {
      const r = runUniquePoints[i];
      const rx = lineLeft + r * scale;
      const txt = i === 0 ? '0' : `${Math.round(r)}`;
      
      // Alternate: even measurements above fence, odd measurements below
      const isAbove = i % 2 === 0;
      const textY = isAbove ? (fenceY - 20) : (fenceY + 24);
      const lineEndY = isAbove ? (fenceY - 16) : (fenceY + 16);
      
      // Draw vertical tick at fence line
      doc.setLineWidth(0.7);
      doc.line(rx, fenceY - 3, rx, fenceY + 3);
      
      // Draw measurement line from fence to text (same length above and below)
      doc.setLineWidth(0.4);
      doc.line(rx, fenceY, rx, lineEndY);
      
      // Draw text
      doc.text(txt, rx, textY, { align: 'center' });
    }
  }

  // Add footer note with page info
  const detailPages = Math.ceil(runs.length / runsPerPage);
  const totalPages = detailPages + (hasGuidePage ? 1 : 0);
  if (totalPages > 1) {
    for (let p = 0; p < totalPages; p++) {
      doc.setPage(p + 1);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${p + 1} of ${totalPages}`, pageW - margin - 30, pageH - margin + 5);
    }
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

/**
 * Trigger PDF download
 */
export function downloadSetoutPlanPDF(config, filename = 'setout_plan.pdf') {
  const blob = generateSetoutPlanPDF(config);
  const url = URL.createObjectURL(blob);

  // On mobile, open in a new tab so the calculator stays intact.
  // On desktop, trigger a download.
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.open(url, '_blank');
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
