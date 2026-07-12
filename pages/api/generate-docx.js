// pages/api/generate-docx.js
// Generates a downloadable Word document from the analysis text.
// Schweizer Hochdeutsch: alle ß → ss, Umlaute bleiben (ä ö ü Ä Ö Ü).

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  PageBreak, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx';

// Colors (matching the on-screen rose/gold palette)
const C = {
  rose: '8B4060',
  roseLight: 'C4849E',
  rosePale: 'F4E4D9',
  gold: 'C4962A',
  goldDeep: '9A6F22',
  ink: '1C1714',
  inkSoft: '5A4A40',
  muted: '9A8A80',
  bgTable: 'F9EDE3',
  bgTableAlt: 'FFFAF5',
  bgHeader: '8B4060',
  white: 'FFFFFF',
};

// Inline markdown: **bold** and *italic* → TextRun array
function parseInlineRuns(text, tx) {
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const runs = [];
  let last = 0; let m;
  while ((m = re.exec(text)) !== null) {
    const tok = m[0];
    if (m.index > last) runs.push(new TextRun({ text: tx(text.slice(last, m.index)), font: 'Georgia' }));
    if (tok.startsWith('**')) runs.push(new TextRun({ text: tx(tok.slice(2, -2)), bold: true, font: 'Georgia' }));
    else runs.push(new TextRun({ text: tx(tok.slice(1, -1)), italics: true, font: 'Georgia' }));
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: tx(text.slice(last)), font: 'Georgia' }));
  return runs.length ? runs : [new TextRun({ text: tx(text), font: 'Georgia' })];
}

// Cell helper
function tableCell({ text, bold = false, italic = false, color, size = 20, bg, align = AlignmentType.LEFT, font = 'Georgia', vAlign = 'center', colSpan }) {
  const children = Array.isArray(text)
    ? text
    : [new Paragraph({
        children: [new TextRun({ text: String(text || ''), bold, italics: italic, color, size, font })],
        alignment: align,
        spacing: { before: 60, after: 60 },
      })];
  return new TableCell({
    children,
    ...bg ? { shading: { type: ShadingType.SOLID, color: bg, fill: bg } } : {},
    margins: { top: 120, bottom: 120, left: 200, right: 200 },
    verticalAlign: vAlign,
    ...colSpan ? { columnSpan: colSpan } : {},
  });
}

// Build a year-energies table from JAHR-lines following a JAHRES-TABELLE marker.
function buildYearTable(headerNames, yearLines, tx) {
  const names = headerNames.split('|').filter(Boolean);
  const hasTwo = names.length >= 2;

  // Header row
  const headerCells = [
    tableCell({ text: 'JAHR', bold: true, color: C.white, size: 18, bg: C.bgHeader, align: AlignmentType.LEFT, font: 'Raleway' }),
    tableCell({ text: tx(names[0] || '').toUpperCase(), bold: true, color: C.white, size: 18, bg: C.bgHeader, align: AlignmentType.LEFT, font: 'Raleway' }),
  ];
  if (hasTwo) headerCells.push(tableCell({ text: tx(names[1]).toUpperCase(), bold: true, color: C.white, size: 18, bg: C.bgHeader, align: AlignmentType.LEFT, font: 'Raleway' }));
  const rows = [new TableRow({ tableHeader: true, children: headerCells })];

  yearLines.forEach((line, idx) => {
    const parts = line.split('|');
    const year = parts[0] || '';
    const v1 = parts[1] || '';
    const v2 = parts[2] || '';
    const bg = idx % 2 === 0 ? C.bgTable : C.bgTableAlt;
    const [num1, ...label1Rest] = v1.split('·');
    const label1 = label1Rest.join('·').trim();
    const [num2, ...label2Rest] = v2.split('·');
    const label2 = label2Rest.join('·').trim();

    const cells = [
      tableCell({ text: tx(year), italic: true, color: C.rose, size: 24, font: 'Playfair Display', bg }),
      tableCell({
        text: [
          new Paragraph({ children: [new TextRun({ text: tx(num1), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 80, after: 30 } }),
          ...(label1 ? [new Paragraph({ children: [new TextRun({ text: tx(label1), size: 18, color: C.inkSoft, font: 'Georgia' })], spacing: { before: 0, after: 80 } })] : []),
        ],
        bg,
      }),
    ];
    if (hasTwo) {
      cells.push(tableCell({
        text: [
          new Paragraph({ children: [new TextRun({ text: tx(num2), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 80, after: 30 } }),
          ...(label2 ? [new Paragraph({ children: [new TextRun({ text: tx(label2), size: 18, color: C.inkSoft, font: 'Georgia' })], spacing: { before: 0, after: 80 } })] : []),
        ],
        bg,
      }));
    }
    rows.push(new TableRow({ children: cells }));
  });

  return new Table({
    rows,
    width: { size: 9072, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.gold },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gold },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.rosePale },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });
}

// Build a name-grid table from NAMEN-CARD entries
function buildNameGrid(cards, tx) {
  const rows = [];
  cards.forEach((cardBody, idx) => {
    const p = cardBody.split('|');
    const name = p[0] || '';
    const role = p[1] || '';
    const sNum = p[2] || ''; const sLab = p[3] || '';
    const pNum = p[4] || ''; const pLab = p[5] || '';
    const aNum = p[6] || ''; const aLab = p[7] || '';
    const desc = p[8] || '';
    const bg = idx % 2 === 0 ? C.bgTable : C.bgTableAlt;

    rows.push(new TableRow({
      children: [tableCell({
        text: [new Paragraph({
          children: [
            new TextRun({ text: tx(name), bold: true, size: 32, color: C.rose, font: 'Playfair Display' }),
            new TextRun({ text: '   ', font: 'Georgia' }),
            new TextRun({ text: tx(role), italics: true, size: 18, color: C.muted, font: 'Georgia' }),
          ],
          spacing: { before: 80, after: 40 },
        })],
        bg, colSpan: 3,
      })],
    }));

    rows.push(new TableRow({
      children: [
        tableCell({
          text: [
            new Paragraph({ children: [new TextRun({ text: 'SEELENDRANG', bold: true, size: 14, color: C.muted, font: 'Raleway' })], spacing: { before: 60, after: 40 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(sNum), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 0, after: 30 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(sLab), size: 18, color: C.inkSoft, italics: true, font: 'Georgia' })], spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER }),
          ], bg,
        }),
        tableCell({
          text: [
            new Paragraph({ children: [new TextRun({ text: 'PERSÖNLICHKEIT', bold: true, size: 14, color: C.muted, font: 'Raleway' })], spacing: { before: 60, after: 40 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(pNum), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 0, after: 30 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(pLab), size: 18, color: C.inkSoft, italics: true, font: 'Georgia' })], spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER }),
          ], bg,
        }),
        tableCell({
          text: [
            new Paragraph({ children: [new TextRun({ text: 'AUSDRUCK', bold: true, size: 14, color: C.muted, font: 'Raleway' })], spacing: { before: 60, after: 40 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(aNum), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 0, after: 30 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(aLab), size: 18, color: C.inkSoft, italics: true, font: 'Georgia' })], spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER }),
          ], bg,
        }),
      ],
    }));

    if (desc) {
      rows.push(new TableRow({
        children: [tableCell({
          text: [new Paragraph({ children: [new TextRun({ text: tx(desc), italics: true, size: 18, color: C.inkSoft, font: 'Georgia' })], spacing: { before: 60, after: 100 }, alignment: AlignmentType.CENTER })],
          bg, colSpan: 3,
        })],
      }));
    }
  });

  return new Table({
    rows,
    width: { size: 9072, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.gold },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gold },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.rosePale },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: C.rosePale },
    },
  });
}

// Pinnacle box — like the PDF style
function buildPinnacleBox(person, nr, span, num, desc, challenge, tx) {
  return new Table({
    width: { size: 9072, type: WidthType.DXA },
    rows: [new TableRow({
      children: [tableCell({
        text: [
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({ text: `${tx(person)} · PINNACLE ${tx(nr)}   `, bold: true, size: 16, color: C.gold, font: 'Raleway' }),
              new TextRun({ text: tx(span), italics: true, size: 16, color: C.muted, font: 'Georgia' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [new TextRun({ text: tx(num), bold: true, size: 56, color: C.rose, font: 'Playfair Display' })],
          }),
          ...(desc ? [new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [new TextRun({ text: tx(desc), size: 22, color: C.ink, font: 'Georgia' })],
          })] : []),
          ...(challenge ? [new Paragraph({
            spacing: { before: 80, after: 100 },
            children: [
              new TextRun({ text: 'Herausforderung: ', bold: true, size: 18, color: C.gold, font: 'Raleway' }),
              new TextRun({ text: tx(challenge), size: 20, color: C.inkSoft, italics: true, font: 'Georgia' }),
            ],
          })] : []),
        ],
        bg: C.bgTable,
      })],
    })],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: C.gold },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold },
      left: { style: BorderStyle.SINGLE, size: 24, color: C.gold },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });
}

function buildEssenceBox(text, tx) {
  return new Table({
    width: { size: 9072, type: WidthType.DXA },
    rows: [new TableRow({
      children: [tableCell({
        text: [new Paragraph({
          spacing: { before: 200, after: 200 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: tx(text), italics: true, size: 28, color: C.ink, font: 'Playfair Display' })],
        })],
        bg: C.bgTable,
      })],
    })],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: C.gold },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: C.gold },
      left: { style: BorderStyle.SINGLE, size: 2, color: C.rosePale },
      right: { style: BorderStyle.SINGLE, size: 2, color: C.rosePale },
    },
  });
}

// Strip the simpler markers — render as inline-formatted text
function stripSimpleMarkers(text) {
  let t = text;
  t = t.replace(/\[(PERSON|KARTEN|ASTRO|HS)-GRID-START\]/g, '');
  t = t.replace(/\[(PERSON|KARTEN|ASTRO|HS)-GRID-END\]/g, ''); t = t.replace(/\[HS-(START|END)\]/g, '');
  t = t.replace(/\[PERSON-CARD:([^\]]+)\]/g, (_, body) => {
    const parts = body.split('|');
    return `\n**${parts[0] || ''}: ${parts[1] || ''}**\n${parts[2] || ''} · ${parts[3] || ''}\n${parts[4] || ''}\n*${parts.slice(5).join(' · ')}*\n`;
  });
  t = t.replace(/\[KARTE:([^\]]+)\]/g, (_, body) => {
    const [eyebrow, title, subtitle, desc] = body.split('|');
    return `\n**${title || ''}** — *${eyebrow || ''}*\n${subtitle || ''}\n${desc || ''}\n`;
  });
  t = t.replace(/\[DYNAMIK:([^\]]+)\]/g, (_, body) => {
    const p = body.split('|');
    return `\n**${p[0]}** (${p[1]})  ↔  **${p[2]}** (${p[3]})\n${p[4] || ''}\n`;
  });
  t = t.replace(/\[ASTRO:([^\]]+)\]/g, (_, body) => {
    const [sym, title, txt] = body.split('|');
    return `\n${sym} **${title}**\n${txt || ''}\n`;
  });
  t = t.replace(/\[HERAUSFORDERUNG:([^\]]+)\]/g, (_, txt) => `\n**Herausforderung:** ${txt}\n`);
  t = t.replace(/\[SCHLUESSEL:([^\]]+)\]/g, (_, txt) => `\n**Schlüssel:** ${txt}\n`);
  t = t.replace(/\[ZAHL:([^\]]+)\]/g, (_, num) => `\n**⟨ ${num} ⟩**\n`);
  t = t.replace(/\[PJ-HEADER:([^|]+)\|([^|]+)\|([^\]]+)\]/g, (_, titel, zahl, zeitraum) =>
    `\n**${titel.toUpperCase()}** · ${zahl}\n*${zeitraum}*\n`);
  t = t.replace(/\[QUARTAL:([^|]+)\|([^\]]+)\]/g, (_, titel, zeit) =>
    `\n**${titel}** (${zeit})\n`);
  t = t.replace(/\[HIGHLIGHT-MONAT:([^|]+)\|([^|]+)\|([^\]]+)\]/g, (_, monat, zahl, label) =>
    `  • **${monat}** (PM ${zahl}): ${label}`);
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

function headingParagraph(text, depth, tx) {
  const clean = String(text).replace(/[*_`]+/g, '').trim();
  let font = 'Playfair Display', size = 30, color = C.rose, bold = false, before = 320, after = 100;
  if (depth === 3) { font = 'Georgia'; size = 24; color = C.ink; bold = true; before = 240; after = 60; }
  else if (depth >= 4) { font = 'Raleway'; size = 20; color = C.gold; bold = true; before = 200; after = 60; }
  return new Paragraph({
    spacing: { before, after },
    children: [new TextRun({ text: tx(clean), font, size, color, bold })],
  });
}

function emitText(text, out, tx) {
  const cleaned = stripSimpleMarkers(text);
  const blocks = cleaned.split(/\n{2,}/).map(b => b.replace(/\s+$/, '')).filter(b => b.trim());
  blocks.forEach(block => {
    const lines = block.split('\n');
    let buf = [];
    const flush = () => {
      if (!buf.length) return;
      const children = [];
      buf.forEach((ln, i) => {
        if (i > 0) children.push(new TextRun({ break: 1 }));
        children.push(...parseInlineRuns(ln, tx));
      });
      out.push(new Paragraph({ children, spacing: { before: 120, after: 120, line: 320 }, alignment: AlignmentType.LEFT }));
      buf = [];
    };
    lines.forEach(raw => {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) return;
      // Horizontale Linie (---, ***, ___) ueberspringen, nicht literal ausgeben
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flush(); return; }
      // Markdown-Ueberschrift (#, ##, ### ...)
      const h = line.match(/^\s*(#{1,6})\s+(.+)$/);
      if (h) { flush(); out.push(headingParagraph(h[2], h[1].length, tx)); return; }
      // Aufzaehlung (-, *, • am Zeilenanfang)
      const b = line.match(/^\s*[-*•]\s+(.+)$/);
      if (b) {
        flush();
        out.push(new Paragraph({
          spacing: { before: 40, after: 40, line: 300 },
          indent: { left: 360, hanging: 200 },
          children: [new TextRun({ text: '•  ', font: 'Georgia', color: C.gold }), ...parseInlineRuns(b[1], tx)],
        }));
        return;
      }
      buf.push(line);
    });
    flush();
  });
}

// Karten-Grid (Entscheidungsradar etc.) — gestaltete Boxen wie auf der Website:
// Eyebrow · grosser Kursivtitel (Untertitel-Feld) · Titel · kursiver Fliesstext.
// Marker: [KARTE:Eyebrow|Titel|Untertitel|Beschreibung], 2-spaltig.
function buildKartenGrid(cards, tx) {
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };
  const cardCell = (cardBody) => {
    const [eyebrow, titel, untertitel, desc] = (cardBody || '').split('|');
    const paras = [];
    if (eyebrow && eyebrow.trim()) paras.push(new Paragraph({
      children: [new TextRun({ text: tx(eyebrow).toUpperCase(), bold: true, size: 13, color: C.roseLight, font: 'Raleway' })],
      spacing: { before: 40, after: 70 },
    }));
    if (untertitel && untertitel.trim()) paras.push(new Paragraph({
      children: [new TextRun({ text: tx(untertitel), italics: true, size: 36, color: C.rose, font: 'Playfair Display' })],
      spacing: { before: 0, after: 70 },
    }));
    if (titel && titel.trim()) paras.push(new Paragraph({
      children: [new TextRun({ text: tx(titel), size: 22, color: C.ink, font: 'Playfair Display' })],
      spacing: { before: 0, after: 90 },
    }));
    if (desc && desc.trim()) paras.push(new Paragraph({
      children: [new TextRun({ text: tx(desc), italics: true, size: 18, color: C.inkSoft, font: 'Georgia' })],
      spacing: { before: 0, after: 60, line: 300 },
    }));
    if (!paras.length) paras.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    return new TableCell({
      children: paras,
      shading: { type: ShadingType.SOLID, color: C.white, fill: C.white },
      margins: { top: 200, bottom: 200, left: 240, right: 240 },
      verticalAlign: 'top',
      borders: {
        top: { style: BorderStyle.SINGLE, size: 14, color: C.roseLight },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: C.gold },
        left: { style: BorderStyle.SINGLE, size: 2, color: C.gold },
        right: { style: BorderStyle.SINGLE, size: 2, color: C.gold },
      },
    });
  };
  const spacer = () => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
    borders: noBorder, width: { size: 300, type: WidthType.DXA },
  });
  const emptyCell = () => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
    borders: noBorder,
  });

  const blocks = [];
  for (let i = 0; i < cards.length; i += 2) {
    const left = cardCell(cards[i]);
    const right = (i + 1 < cards.length) ? cardCell(cards[i + 1]) : emptyCell();
    blocks.push(new Table({
      rows: [new TableRow({ children: [left, spacer(), right] })],
      width: { size: 9072, type: WidthType.DXA },
      columnWidths: [4386, 300, 4386],
      borders: { ...noBorder, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
    }));
    blocks.push(new Paragraph({ spacing: { before: 0, after: 150 }, children: [new TextRun({ text: '' })] }));
  }
  return blocks;
}

// MAIN: parse body text into docx blocks (Paragraphs + Tables)
function bodyToBlocks(bodyText, tx) {
  const out = [];
  let remaining = bodyText;

  while (remaining.length > 0) {
    const yearTblMatch = remaining.match(/\[JAHRES-TABELLE:([^\]]+)\]([\s\S]*?)(?=\n\n[^\s\[]|\n#|$)/);
    const nameGridMatch = remaining.match(/\[NAMEN-GRID-START\]([\s\S]*?)\[NAMEN-GRID-END\]/);
    const pinnacleMatch = remaining.match(/\[PINNACLE:([^\]]+)\]/);
    const essenzMatch = remaining.match(/\[ESSENZ:([^\]]+)\]/);
    const kartenGridMatch = remaining.match(/\[KARTEN-GRID-START\]([\s\S]*?)\[KARTEN-GRID-END\]/);

    const candidates = [
      yearTblMatch && { kind: 'year', match: yearTblMatch, index: yearTblMatch.index },
      nameGridMatch && { kind: 'names', match: nameGridMatch, index: nameGridMatch.index },
      pinnacleMatch && { kind: 'pinnacle', match: pinnacleMatch, index: pinnacleMatch.index },
      essenzMatch && { kind: 'essenz', match: essenzMatch, index: essenzMatch.index },
      kartenGridMatch && { kind: 'karten', match: kartenGridMatch, index: kartenGridMatch.index },
    ].filter(Boolean).sort((a, b) => a.index - b.index);

    if (candidates.length === 0) {
      emitText(remaining, out, tx);
      break;
    }

    const next = candidates[0];
    if (next.index > 0) emitText(remaining.slice(0, next.index), out, tx);

    if (next.kind === 'year') {
      const headerNames = next.match[1];
      const yearLines = [...next.match[2].matchAll(/\[JAHR:([^\]]+)\]/g)].map(m => m[1]);
      if (yearLines.length > 0) out.push(buildYearTable(headerNames, yearLines, tx));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'names') {
      const inner = next.match[1] || '';
      const cards = [...inner.matchAll(/\[NAMEN-CARD:([^\]]+)\]/g)].map(m => m[1]);
      if (cards.length > 0) out.push(buildNameGrid(cards, tx));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'pinnacle') {
      const parts = next.match[1].split('|');
      out.push(buildPinnacleBox(parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || '', parts[5] || '', tx));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '' })] }));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'essenz') {
      out.push(buildEssenceBox(next.match[1], tx));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'karten') {
      const inner = next.match[1] || '';
      const cards = [...inner.matchAll(/\[KARTE:([^\]]+)\]/g)].map(m => m[1]);
      if (cards.length > 0) buildKartenGrid(cards, tx).forEach(b => out.push(b));
      remaining = remaining.slice(next.index + next.match[0].length);
    }
  }
  return out;
}

export const config = { maxDuration: 30 };

const LOCALE_LABELS = {
  de: { brand: 'herzbewegung · Familien-Code', title: 'Deine Seelenlandschaft', footerName: 'Susana · Numerologie & Astrologie', locale: 'de-CH' },
  en: { brand: 'herzbewegung · Family Code', title: 'Your Soul Landscape', footerName: 'Susana · Numerology & Astrology', locale: 'en-GB' },
  pt: { brand: 'herzbewegung · Código Familiar', title: 'A Tua Paisagem da Alma', footerName: 'Susana · Numerologia & Astrologia', locale: 'pt-PT' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { rawText, name, language, title, subtitle, geburtsdatum, nachname, vorname, analyseTyp, auftragstyp } = req.body || {};
  if (!rawText || typeof rawText !== 'string') return res.status(400).json({ error: 'Missing rawText' });

  const lang = (language === 'en' || language === 'pt') ? language : 'de';
  const L = LOCALE_LABELS[lang];
  const filterText = (s) => {
    let t = String(s || '');
    if (lang === 'de') t = t.replace(/ß/g, 'ss');
    t = t.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, '-');
    return t;
  };

  const displayName = filterText(name || (lang === 'en' ? 'Your Analysis' : lang === 'pt' ? 'A Tua Análise' : 'Deine Analyse'));
  const sections = rawText.split('~~~').map(s => s.trim()).filter(Boolean);

  const children = [];

  // ── COVER PAGE ─────────────────────────────────────────
  children.push(new Paragraph({ spacing: { before: 1800, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '✦', font: 'Georgia', size: 56, color: C.gold })] }));
  children.push(new Paragraph({ spacing: { before: 60, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(L.brand).toUpperCase(), font: 'Raleway', size: 18, color: C.rose })] }));
  children.push(new Paragraph({ spacing: { before: 480, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(title || L.title), font: 'Playfair Display', size: 64, color: C.ink })] }));
  children.push(new Paragraph({ spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: displayName, font: 'Playfair Display', size: 36, italics: true, color: C.rose })] }));
  if (subtitle) children.push(new Paragraph({ spacing: { before: 40, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(subtitle), font: 'Georgia', size: 22, italics: true, color: C.muted })] }));
  children.push(new Paragraph({ spacing: { before: 960 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(new Date().toLocaleDateString(L.locale, { day: '2-digit', month: 'long', year: 'numeric' })), font: 'Georgia', size: 20, color: C.muted })] }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── SECTIONS ──────────────────────────────────────────
  sections.forEach((sec, idx) => {
    const lines = sec.split('\n');
    const firstRaw = (lines[0] || '').trim();
    const firstClean = firstRaw.replace(/^#+\s*/, '').trim();
    // Eine echte Sektions-Ueberschrift ist kurzer Klartext (evtl. mit #), KEIN Marker und keine Prosa.
    const isMarkerLine = /\[[A-Z]/.test(firstRaw);
    const isProseLine = firstClean.length > 70;
    const hasCleanTitle = firstClean.length > 0 && !isMarkerLine && !isProseLine;
    const bodyText = (hasCleanTitle ? lines.slice(1).join('\n') : sec).trim();

    if (hasCleanTitle) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 480, after: 80 },
        children: [new TextRun({ text: filterText(firstClean), font: 'Playfair Display', size: 40, color: C.rose })],
      }));
      children.push(new Paragraph({
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: '', size: 2 })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.gold, space: 4 } },
      }));
    } else {
      children.push(new Paragraph({ spacing: { before: 420 }, children: [new TextRun({ text: '' })] }));
    }

    bodyToBlocks(bodyText, filterText).forEach(b => children.push(b));

    // Ornament between sections — NO notes
    if (idx < sections.length - 1) {
      children.push(new Paragraph({
        spacing: { before: 480, after: 480 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '✦   ✦   ✦', font: 'Georgia', size: 18, color: C.gold })],
      }));
    }
  });

  // ── FOOTER PAGE ──────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(new Paragraph({ spacing: { before: 1200, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '✦', font: 'Georgia', size: 48, color: C.gold })] }));
  children.push(new Paragraph({ spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'herzbewegung', font: 'Playfair Display', size: 40, color: C.rose })] }));
  children.push(new Paragraph({ spacing: { before: 60, after: 60 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: L.footerName, font: 'Georgia', size: 22, color: C.inkSoft, italics: true })] }));
  children.push(new Paragraph({ spacing: { before: 120, after: 60 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'herzbewegung.ch', font: 'Georgia', size: 18, color: C.muted })] }));

  const doc = new Document({
    creator: 'herzbewegung — Familien-Code',
    title: `Familien-Code · ${displayName}`,
    styles: { default: { document: { run: { font: 'Georgia', size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children,
    }],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    // --- Google-Drive-Archiv (nicht blockierend, laeuft VOR dem Senden) ---
    if (nachname || vorname) {
      try {
        const { uploadAnalysis } = require('../../drive');
        await uploadAnalysis({
          buffer, geburtsdatum, nachname, vorname,
          typ: analyseTyp || 'analyse',
          auftragstyp: auftragstyp || undefined,
        });
      } catch (e) {
        console.error('Drive-Archiv fehlgeschlagen:', e.message);
      }
    }
    const safeName = displayName.replace(/[^a-zA-Z0-9_\- ]+/g, '').replace(/\s+/g, '_') || 'Analyse';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Familien-Code_${safeName}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    return res.status(500).json({ error: err.message || 'DOCX generation failed' });
  }
}
