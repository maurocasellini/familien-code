// lib/docx-builder.js
// Baut das Word-Dokument aus dem Analyse-Rohtext.
// Aus pages/api/generate-docx.js herausgeloest, damit /api/generate-docx (Download)
// und /api/report (Hintergrund-Job) exakt dasselbe Dokument erzeugen.

// pages/api/generate-docx.js
// Generates a downloadable Word document from the analysis text.
// Schweizer Hochdeutsch: alle ß → ss, Umlaute bleiben (ä ö ü Ä Ö Ü).

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  PageBreak, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType,
  TableLayoutType, ImageRun,
} from 'docx';
import { LOGO_PNG_BASE64 } from './logo';

// Nutzbare Seitenbreite (A4 11906 twips minus 2×1440 Rand ≈ 9026; auf 9072 gerundet).
// WICHTIG: Jede Tabelle MUSS columnWidths (Summe = CONTENT_WIDTH) UND layout: FIXED setzen.
// Sonst schreibt die docx-Library gridCol=100 als Platzhalter — Word autofittet das zwar,
// aber Google Docs (und manche Word-Roundtrips) rechnen tblW auf die 100er runter und
// quetschen die Tabelle auf ~1 Zeichen Breite (das war der 68-Seiten-Bug). columnWidths +
// FIXED macht das Grid konsistent und stabil über Word UND Google Docs.
const CONTENT_WIDTH = 9072;

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

// Sprachabhaengige Beschriftungen fuer die im CODE gebauten Tabellen/Boxen
// (diese Texte werden NICHT vom Modell geschrieben, muessen also hier uebersetzt werden).
const DOC_LABELS = {
  de: { jahr: 'JAHR', seelendrang: 'SEELENDRANG', persoenlichkeit: 'PERSÖNLICHKEIT', ausdruck: 'AUSDRUCK', pinnacle: 'PINNACLE', herausforderung: 'Herausforderung', schluessel: 'Schlüssel' },
  en: { jahr: 'YEAR', seelendrang: 'SOUL URGE', persoenlichkeit: 'PERSONALITY', ausdruck: 'EXPRESSION', pinnacle: 'PINNACLE', herausforderung: 'Challenge', schluessel: 'Key' },
  pt: { jahr: 'ANO', seelendrang: 'IMPULSO DA ALMA', persoenlichkeit: 'PERSONALIDADE', ausdruck: 'EXPRESSÃO', pinnacle: 'PINÁCULO', herausforderung: 'Desafio', schluessel: 'Chave' },
};

// Monatsnamen in de/en/pt — damit die Monats-Unterkapitel unabhaengig von der
// Ausgabesprache erkannt werden.
const MONTH_NAMES = 'Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December|Janeiro|Fevereiro|Março|Marco|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro';

// Build a year-energies table from JAHR-lines following a JAHRES-TABELLE marker.
function buildYearTable(headerNames, yearLines, tx, lbl) {
  const names = headerNames.split('|').filter(Boolean);
  const hasTwo = names.length >= 2;

  // Header row
  const headerCells = [
    tableCell({ text: lbl.jahr, bold: true, color: C.white, size: 18, bg: C.bgHeader, align: AlignmentType.LEFT, font: 'Raleway' }),
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
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: hasTwo ? [1512, 3780, 3780] : [2268, 6804],
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
function buildNameGrid(cards, tx, lbl) {
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
            new Paragraph({ children: [new TextRun({ text: lbl.seelendrang, bold: true, size: 14, color: C.muted, font: 'Raleway' })], spacing: { before: 60, after: 40 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(sNum), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 0, after: 30 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(sLab), size: 18, color: C.inkSoft, italics: true, font: 'Georgia' })], spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER }),
          ], bg,
        }),
        tableCell({
          text: [
            new Paragraph({ children: [new TextRun({ text: lbl.persoenlichkeit, bold: true, size: 14, color: C.muted, font: 'Raleway' })], spacing: { before: 60, after: 40 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(pNum), bold: true, size: 36, color: C.ink, font: 'Playfair Display' })], spacing: { before: 0, after: 30 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: tx(pLab), size: 18, color: C.inkSoft, italics: true, font: 'Georgia' })], spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER }),
          ], bg,
        }),
        tableCell({
          text: [
            new Paragraph({ children: [new TextRun({ text: lbl.ausdruck, bold: true, size: 14, color: C.muted, font: 'Raleway' })], spacing: { before: 60, after: 40 }, alignment: AlignmentType.CENTER }),
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
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3024, 3024, 3024],
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
function buildPinnacleBox(person, nr, span, num, desc, challenge, tx, lbl) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({
      children: [tableCell({
        text: [
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({ text: `${tx(person)} · ${lbl.pinnacle} ${tx(nr)}   `, bold: true, size: 16, color: C.gold, font: 'Raleway' }),
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
              new TextRun({ text: lbl.herausforderung + ': ', bold: true, size: 18, color: C.gold, font: 'Raleway' }),
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
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [CONTENT_WIDTH],
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
function stripSimpleMarkers(text, lbl) {
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
  t = t.replace(/\[HERAUSFORDERUNG:([^\]]+)\]/g, (_, txt) => `\n**${lbl.herausforderung}:** ${txt}\n`);
  t = t.replace(/\[SCHLUESSEL:([^\]]+)\]/g, (_, txt) => `\n**${lbl.schluessel}:** ${txt}\n`);
  t = t.replace(/\[ZAHL:([^\]]+)\]/g, (_, num) => `\n**⟨ ${num} ⟩**\n`);
  t = t.replace(/\[PJ-HEADER:([^|]+)\|([^|]+)\|([^\]]+)\]/g, (_, titel, zahl, zeitraum) =>
    `\n**${titel.toUpperCase()}** · ${zahl}\n*${zeitraum}*\n`);
  // [QUARTAL] und [MONAT]/[MONAT-HIGHLIGHT] werden block-level in bodyToBlocks gerendert.
  // [HIGHLIGHT-MONAT] bleibt als Fallback (alte Aufzählungs-Darstellung) erhalten.
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

function emitText(text, out, tx, lbl) {
  const cleaned = stripSimpleMarkers(text, lbl);
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
      // Monats-Unterkapitel automatisch erkennen — auch aus alten Bullet-/★-Zeilen
      // Formen:  "•  Monat Jahr (PM X): Text"  /  "★ Monat Jahr (PM X): Text"  /  "**Monat Jahr** (PM X): Text"
      const MON = MONTH_NAMES;
      const mo = line.match(new RegExp(
        `^\\s*(★)?\\s*(?:[-*•]\\s*)?(?:\\*\\*)?\\s*(${MON})\\s+(\\d{4})\\s*(?:\\*\\*)?\\s*\\(PM\\s*([0-9]+)\\)\\s*[:–-]\\s*(.+)$`));
      if (mo) {
        flush();
        const highlight = !!mo[1] || ['11', '22', '33'].includes(mo[4]);
        const rest = mo[5].trim();
        const sen = rest.match(/^(.*?[.!?])\s+(.+)$/);
        const titel = (sen ? sen[1] : rest).replace(/[.!?]+$/, '').replace(/\*\*/g, '').trim();
        const body = sen ? sen[2].trim() : '';
        buildMonthChapter(`${mo[2]} ${mo[3]}`, mo[4], titel, body, highlight, tx).forEach(x => out.push(x));
        return;
      }
      // Quartals-Zwischenüberschrift automatisch erkennen — "Titel (Monat Jahr bis Monat Jahr)"
      const qm = line.match(/^\s*(?:\*\*)?\s*([^*()\n]{3,70}?)\s*(?:\*\*)?\s*\(([^)]*\d{4}[^)]*)\)\s*$/);
      if (qm && !/PM/.test(line) && new RegExp(`(${MON})`).test(qm[2])) {
        flush();
        buildQuartalHeading(qm[1].trim(), qm[2].trim(), tx).forEach(x => out.push(x));
        return;
      }
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
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [4386, 300, 4386],
      borders: { ...noBorder, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
    }));
    blocks.push(new Paragraph({ spacing: { before: 0, after: 150 }, children: [new TextRun({ text: '' })] }));
  }
  return blocks;
}

// Quartal-Zwischenüberschrift — gruppiert die Monats-Unterkapitel darunter.
// Marker: [QUARTAL:Titel|Zeitraum]
function buildQuartalHeading(titel, zeit, tx) {
  return [
    new Paragraph({
      spacing: { before: 400, after: 30 },
      children: [new TextRun({ text: tx(titel), font: 'Playfair Display', size: 30, color: C.rose })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 180 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rosePale, space: 4 } },
      children: [new TextRun({ text: tx(zeit), italics: true, size: 20, color: C.muted, font: 'Georgia' })],
    }),
  ];
}

// Monats-Unterkapitel — jeder Monat als eigener, klar getrennter Block:
// Eyebrow (MONAT JAHR · PM X) · kursiver Untertitel · Fliesstext, mit Akzentlinie links.
// Marker: [MONAT:Monat Jahr|PM-Zahl|Kurztitel|Fliesstext]
//         [MONAT-HIGHLIGHT:...] für besondere Monate (eigene Lebenszahl, Meisterzahlen).
function buildMonthChapter(monat, zahl, titel, text, highlight, tx) {
  const accent = highlight ? C.gold : C.roseLight;
  const blocks = [];

  const eyebrowRuns = [];
  if (highlight) eyebrowRuns.push(new TextRun({ text: '★  ', size: 16, color: C.gold, font: 'Georgia' }));
  eyebrowRuns.push(new TextRun({
    text: `${tx(monat).toUpperCase()} · PM ${tx(zahl)}`,
    bold: true, size: 15, color: accent, font: 'Raleway',
  }));
  blocks.push(new Paragraph({ spacing: { before: 280, after: 24 }, children: eyebrowRuns }));

  blocks.push(new Paragraph({
    spacing: { before: 0, after: 90 },
    indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: highlight ? 24 : 14, color: accent, space: 14 } },
    children: [new TextRun({ text: tx(titel), font: 'Playfair Display', size: 30, italics: true, color: C.rose })],
  }));

  const proseLines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (proseLines.length) {
    const children = [];
    proseLines.forEach((ln, i) => {
      if (i > 0) children.push(new TextRun({ break: 1 }));
      children.push(...parseInlineRuns(ln, tx));
    });
    blocks.push(new Paragraph({ spacing: { before: 0, after: 150, line: 320 }, indent: { left: 200 }, children }));
  }
  return blocks;
}

// MAIN: parse body text into docx blocks (Paragraphs + Tables)
function bodyToBlocks(bodyText, tx, lbl) {
  const out = [];
  let remaining = bodyText;

  while (remaining.length > 0) {
    const yearTblMatch = remaining.match(/\[JAHRES-TABELLE:([^\]]+)\]([\s\S]*?)(?=\n\n[^\s\[]|\n#|$)/);
    const nameGridMatch = remaining.match(/\[NAMEN-GRID-START\]([\s\S]*?)\[NAMEN-GRID-END\]/);
    const pinnacleMatch = remaining.match(/\[PINNACLE:([^\]]+)\]/);
    const essenzMatch = remaining.match(/\[ESSENZ:([^\]]+)\]/);
    const kartenGridMatch = remaining.match(/\[KARTEN-GRID-START\]([\s\S]*?)\[KARTEN-GRID-END\]/);
    const quartalMatch = remaining.match(/\[QUARTAL:([^|\]]+)\|([^\]]+)\]/);
    const monthMatch = remaining.match(/\[MONAT(-HIGHLIGHT)?:([^\]]+)\]/);

    const candidates = [
      yearTblMatch && { kind: 'year', match: yearTblMatch, index: yearTblMatch.index },
      nameGridMatch && { kind: 'names', match: nameGridMatch, index: nameGridMatch.index },
      pinnacleMatch && { kind: 'pinnacle', match: pinnacleMatch, index: pinnacleMatch.index },
      essenzMatch && { kind: 'essenz', match: essenzMatch, index: essenzMatch.index },
      kartenGridMatch && { kind: 'karten', match: kartenGridMatch, index: kartenGridMatch.index },
      quartalMatch && { kind: 'quartal', match: quartalMatch, index: quartalMatch.index },
      monthMatch && { kind: 'month', match: monthMatch, index: monthMatch.index },
    ].filter(Boolean).sort((a, b) => a.index - b.index);

    if (candidates.length === 0) {
      emitText(remaining, out, tx, lbl);
      break;
    }

    const next = candidates[0];
    if (next.index > 0) emitText(remaining.slice(0, next.index), out, tx, lbl);

    if (next.kind === 'year') {
      const headerNames = next.match[1];
      const yearLines = [...next.match[2].matchAll(/\[JAHR:([^\]]+)\]/g)].map(m => m[1]);
      if (yearLines.length > 0) out.push(buildYearTable(headerNames, yearLines, tx, lbl));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'names') {
      const inner = next.match[1] || '';
      const cards = [...inner.matchAll(/\[NAMEN-CARD:([^\]]+)\]/g)].map(m => m[1]);
      if (cards.length > 0) out.push(buildNameGrid(cards, tx, lbl));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'pinnacle') {
      const parts = next.match[1].split('|');
      out.push(buildPinnacleBox(parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || '', parts[5] || '', tx, lbl));
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
    } else if (next.kind === 'quartal') {
      buildQuartalHeading(next.match[1].trim(), next.match[2].trim(), tx).forEach(b => out.push(b));
      remaining = remaining.slice(next.index + next.match[0].length);
    } else if (next.kind === 'month') {
      const highlight = !!next.match[1];
      const parts = next.match[2].split('|');
      buildMonthChapter(
        (parts[0] || '').trim(), (parts[1] || '').trim(), (parts[2] || '').trim(),
        parts.slice(3).join('|').trim(), highlight, tx,
      ).forEach(b => out.push(b));
      remaining = remaining.slice(next.index + next.match[0].length);
    }
  }
  return out;
}

const LOCALE_LABELS = {
  de: { brand: 'herzbewegung · Familien-Code', title: 'Deine Seelenlandschaft', footerName: 'Susana · Numerologie & Astrologie', locale: 'de-CH' },
  en: { brand: 'herzbewegung · Family Code', title: 'Your Soul Landscape', footerName: 'Susana · Numerology & Astrology', locale: 'en-GB' },
  pt: { brand: 'herzbewegung · Código Familiar', title: 'A Tua Paisagem da Alma', footerName: 'Susana · Numerologia & Astrologia', locale: 'pt-PT' },
};

// ── STANDARD-GLOSSAR ─────────────────────────────────────────────
// Feste Begriffs-Erklärung, die JEDEM Report am Ende angehängt wird — unabhängig
// vom gewählten Thema/Umfang. So sehen Leser, was das ganze System hergibt, auch
// wenn ihr konkreter Report nicht alle Ebenen enthält. Deterministisch (nicht vom
// Modell geschrieben), damit es immer konsistent und korrekt ist.
const GLOSSARY = {
  de: {
    title: 'Begriffe & Symbole, einfach erklärt',
    intro: 'Zum Nachschlagen: die wichtigsten Begriffe und Zeichen aus allen Analysen von herzbewegung, kurz erklärt. Nicht jede Analyse enthält alle davon, das hängt vom gewählten Thema und Umfang ab. So siehst du auf einen Blick, was die Zahlen und Symbole bedeuten und was in einer vertieften Analyse alles möglich ist.',
    closing: 'Taucht ein Begriff in deiner Analyse nicht auf, gehört er zu einem anderen Thema oder einem grösseren Umfang. Du kannst jede Ebene jederzeit ergänzend dazunehmen.',
    groups: [
      ['Numerologie, deine Zahlen', [
        ['Lebenszahl', 'Die Summe deines ganzen Geburtsdatums, auf eine Ziffer reduziert. Der Grundton deines Lebens, deine Hauptaufgabe und der rote Faden.'],
        ['Seelendrangzahl', 'Aus den Vokalen deines Namens. Was deine Seele im Innersten will und wonach sie sich sehnt.'],
        ['Persönlichkeitszahl', 'Aus den Konsonanten deines Namens. Wie du auf andere wirkst, dein äusseres Auftreten.'],
        ['Ausdruckszahl', 'Aus allen Buchstaben deines vollen Geburtsnamens. Deine Talente und dein natürliches Werkzeug.'],
        ['Geburtstagszahl', 'Nur der Tag deiner Geburt. Eine besondere Gabe, die du mitbringst.'],
        ['Reifezahl', 'Lebenszahl plus Ausdruckszahl. Das Ziel, das ab etwa Mitte 30 immer deutlicher wird.'],
        ['Persönliches Jahr (PJ)', 'Ein Jahres-Zyklus von Geburtstag zu Geburtstag, der die Grundstimmung des Jahres färbt, von 1 (Aufbruch) bis 9 (Abschluss).'],
        ['Persönlicher Monat (PM)', 'Die Färbung des einzelnen Monats innerhalb deines Persönlichen Jahres.'],
        ['Pinnacles (Höhepunkte)', 'Vier grosse Lebensabschnitte mit je eigener Grundenergie und Aufgabe.'],
        ['Challenges (Herausforderungen)', 'Die Lernthemen, die zu den Pinnacles gehören, deine Wachstumskanten.'],
        ['Meisterzahlen (11, 22, 33)', 'Werden nicht weiter reduziert. Hohes Potenzial, aber auch hohe Spannung.'],
        ['Karmische Zahlen', 'Hinweise auf Themen, die aus früheren Mustern zur Reifung anstehen.'],
      ]],
      ['Astrologie, die vier Achsen', [
        ['Aszendent (AC)', 'Der bei deiner Geburt am Osthorizont aufsteigende Punkt. Wie du in die Welt trittst, dein erster Eindruck, dein Tor nach aussen.'],
        ['Deszendent (DC)', 'Der dem Aszendenten gegenüberliegende Punkt. Was du im Anderen suchst, Begegnung und Beziehung.'],
        ['Medium Coeli (MC), die Himmelsmitte', 'Der höchste Punkt deines Geburtsbildes. Deine öffentliche Rolle, deine Berufung, wohin du in der Welt strebst.'],
        ['Imum Coeli (IC), die Himmelstiefe', 'Der dem MC gegenüberliegende, tiefste Punkt. Deine Wurzeln, deine Herkunft, dein Zuhause, deine innere Basis.'],
      ]],
      ['Astrologie, Sonne, Mond & Planeten', [
        ['Sonne', 'Dein Kern, dein Wille, deine Lebenskraft.'],
        ['Mond', 'Dein Gefühl, deine Bedürfnisse, was dich nährt und Geborgenheit gibt.'],
        ['Merkur', 'Denken, Sprechen, Lernen, wie du Informationen verarbeitest.'],
        ['Venus', 'Liebe, Werte, Genuss, was du schön findest.'],
        ['Mars', 'Antrieb, Tatkraft, wie du handelst und dich durchsetzt.'],
        ['Jupiter', 'Wachstum, Sinn, Weite, Vertrauen und Chancen.'],
        ['Saturn', 'Struktur, Verantwortung, Reifung durch Grenzen und Zeit.'],
        ['Mondknoten (Nord & Süd)', 'Deine Entwicklungsrichtung: der Nordknoten zeigt, wohin es geht, der Südknoten das Vertraute und Mitgebrachte.'],
      ]],
      ['Zyklen & Timing', [
        ['Saturn Return', 'Um etwa 29 bis 30 und 58 bis 59 Jahre. Grosse Reifeschwellen, in denen sich Wesentliches neu ordnet.'],
        ['Jupiter-Zyklus', 'Etwa alle 12 Jahre. Phasen von Wachstum und neuen Möglichkeiten.'],
        ['Transite', 'Der aktuelle Stand der Planeten im Verhältnis zu deinem Geburtsbild, das energetische Wetter deiner Zeit.'],
        ['Lebenszyklen & Wendepunkte', 'Grössere Abschnitte und Schwellen im Verlauf deines Lebens.'],
      ]],
      ['Human Design (falls enthalten)', [
        ['Typ', 'Deine energetische Grundausrichtung: Generator, Manifestor, Projektor oder Reflektor.'],
        ['Strategie', 'Wie du stimmig entscheidest und dich bewegst, passend zu deinem Typ.'],
        ['Autorität', 'Deine innere Instanz für verlässliche Entscheidungen.'],
        ['Zentren', 'Neun Energiezentren, entweder definiert (verlässlich) oder offen (lernend und durchlässig).'],
        ['Profil', 'Zwei Zahlen, die deine Rolle und deine Lernweise im Leben beschreiben.'],
      ]],
    ],
  },
  en: {
    title: 'Terms & Symbols, Explained Simply',
    intro: 'For reference: the key terms and symbols from all of herzbewegung’s analyses, briefly explained. Not every analysis contains all of them, it depends on the chosen theme and depth. This way you can see at a glance what the numbers and symbols mean and what a deeper analysis can include.',
    closing: 'If a term does not appear in your analysis, it belongs to another theme or a larger scope. You can add any layer at any time.',
    groups: [
      ['Numerology, your numbers', [
        ['Life Number', 'The sum of your entire birth date, reduced to one digit. The keynote of your life, your main task and common thread.'],
        ['Soul Urge Number', 'From the vowels of your name. What your soul most deeply wants and longs for.'],
        ['Personality Number', 'From the consonants of your name. How you come across to others, your outer presence.'],
        ['Expression Number', 'From all the letters of your full birth name. Your talents and natural tools.'],
        ['Birthday Number', 'Just the day of your birth. A special gift you bring with you.'],
        ['Maturity Number', 'Life Number plus Expression Number. The goal that grows clearer from your mid-thirties on.'],
        ['Personal Year (PY)', 'A yearly cycle from birthday to birthday that colours the mood of the year, from 1 (new beginning) to 9 (completion).'],
        ['Personal Month (PM)', 'The colouring of a single month within your Personal Year.'],
        ['Pinnacles', 'Four major life phases, each with its own core energy and task.'],
        ['Challenges', 'The learning themes tied to the Pinnacles, your growing edges.'],
        ['Master Numbers (11, 22, 33)', 'Not reduced further. High potential, but also high tension.'],
        ['Karmic Numbers', 'Pointers to themes from earlier patterns that are ready to mature.'],
      ]],
      ['Astrology, the four angles', [
        ['Ascendant (AC)', 'The point rising on the eastern horizon at your birth. How you step into the world, your first impression, your gateway outward.'],
        ['Descendant (DC)', 'The point opposite the Ascendant. What you seek in the other, encounter and relationship.'],
        ['Midheaven (MC)', 'The highest point of your chart. Your public role, your calling, where you aim in the world.'],
        ['Imum Coeli (IC)', 'The lowest point, opposite the MC. Your roots, origins, home and inner base.'],
      ]],
      ['Astrology, Sun, Moon & planets', [
        ['Sun', 'Your core, your will, your life force.'],
        ['Moon', 'Your feelings, your needs, what nourishes you.'],
        ['Mercury', 'Thinking, speaking, learning, how you process information.'],
        ['Venus', 'Love, values, pleasure, what you find beautiful.'],
        ['Mars', 'Drive, energy, how you act and assert yourself.'],
        ['Jupiter', 'Growth, meaning, expansion, trust and opportunity.'],
        ['Saturn', 'Structure, responsibility, maturing through limits and time.'],
        ['Lunar Nodes (North & South)', 'Your direction of growth: the North Node shows where you are heading, the South Node the familiar and inherited.'],
      ]],
      ['Cycles & timing', [
        ['Saturn Return', 'Around ages 29 to 30 and 58 to 59. Major thresholds of maturity where the essential reorders itself.'],
        ['Jupiter cycle', 'Roughly every 12 years. Phases of growth and new possibility.'],
        ['Transits', 'The current position of the planets relative to your birth chart, the energetic weather of your time.'],
        ['Life cycles & turning points', 'Larger phases and thresholds across your life.'],
      ]],
      ['Human Design (if included)', [
        ['Type', 'Your basic energetic orientation: Generator, Manifestor, Projector or Reflector.'],
        ['Strategy', 'How you decide and move in alignment with your type.'],
        ['Authority', 'Your inner compass for reliable decisions.'],
        ['Centres', 'Nine energy centres, either defined (reliable) or open (learning and permeable).'],
        ['Profile', 'Two numbers describing your role and way of learning in life.'],
      ]],
    ],
  },
  pt: {
    title: 'Termos & Símbolos, explicados de forma simples',
    intro: 'Para consulta: os principais termos e símbolos de todas as análises da herzbewegung, explicados de forma breve. Nem toda análise contém todos, depende do tema e da profundidade escolhidos. Assim vês num relance o que os números e símbolos significam e o que uma análise mais profunda pode incluir.',
    closing: 'Se um termo não aparece na tua análise, pertence a outro tema ou a um âmbito maior. Podes acrescentar qualquer camada a qualquer momento.',
    groups: [
      ['Numerologia, os teus números', [
        ['Número de Vida', 'A soma de toda a tua data de nascimento, reduzida a um dígito. O tom de base da tua vida, a tua tarefa principal e o fio condutor.'],
        ['Número do Impulso da Alma', 'A partir das vogais do teu nome. O que a tua alma mais profundamente quer e anseia.'],
        ['Número de Personalidade', 'A partir das consoantes do teu nome. Como te mostras aos outros, a tua presença exterior.'],
        ['Número de Expressão', 'A partir de todas as letras do teu nome de nascimento completo. Os teus talentos e ferramentas naturais.'],
        ['Número do Dia de Nascimento', 'Apenas o dia do teu nascimento. Um dom especial que trazes contigo.'],
        ['Número de Maturidade', 'Número de Vida mais Número de Expressão. O objetivo que se torna mais claro a partir dos 35 anos.'],
        ['Ano Pessoal (AP)', 'Um ciclo anual de aniversário a aniversário que colore o clima do ano, de 1 (novo começo) a 9 (conclusão).'],
        ['Mês Pessoal (MP)', 'A cor de cada mês dentro do teu Ano Pessoal.'],
        ['Pináculos', 'Quatro grandes fases de vida, cada uma com a sua energia e tarefa próprias.'],
        ['Desafios', 'Os temas de aprendizagem ligados aos Pináculos, os teus limites de crescimento.'],
        ['Números Mestres (11, 22, 33)', 'Não são reduzidos. Alto potencial, mas também alta tensão.'],
        ['Números Cármicos', 'Indícios de temas de padrões anteriores prontos a amadurecer.'],
      ]],
      ['Astrologia, os quatro ângulos', [
        ['Ascendente (AC)', 'O ponto que sobe no horizonte leste no teu nascimento. Como entras no mundo, a tua primeira impressão, a tua porta para fora.'],
        ['Descendente (DC)', 'O ponto oposto ao Ascendente. O que procuras no outro, encontro e relação.'],
        ['Meio-Céu (MC)', 'O ponto mais alto do teu mapa. O teu papel público, a tua vocação, para onde apontas no mundo.'],
        ['Fundo-do-Céu (IC)', 'O ponto mais baixo, oposto ao MC. As tuas raízes, origem, lar e base interior.'],
      ]],
      ['Astrologia, Sol, Lua & planetas', [
        ['Sol', 'O teu núcleo, a tua vontade, a tua força de vida.'],
        ['Lua', 'Os teus sentimentos, as tuas necessidades, o que te nutre.'],
        ['Mercúrio', 'Pensar, falar, aprender, como processas a informação.'],
        ['Vénus', 'Amor, valores, prazer, o que achas belo.'],
        ['Marte', 'Impulso, energia, como ages e te afirmas.'],
        ['Júpiter', 'Crescimento, sentido, expansão, confiança e oportunidade.'],
        ['Saturno', 'Estrutura, responsabilidade, amadurecimento através de limites e tempo.'],
        ['Nodos Lunares (Norte & Sul)', 'A tua direção de crescimento: o Nodo Norte mostra para onde vais, o Nodo Sul o familiar e herdado.'],
      ]],
      ['Ciclos & timing', [
        ['Retorno de Saturno', 'Por volta dos 29 a 30 e 58 a 59 anos. Grandes limiares de maturidade em que o essencial se reorganiza.'],
        ['Ciclo de Júpiter', 'Aproximadamente a cada 12 anos. Fases de crescimento e novas possibilidades.'],
        ['Trânsitos', 'A posição atual dos planetas em relação ao teu mapa natal, o clima energético do teu tempo.'],
        ['Ciclos de vida & pontos de viragem', 'Fases e limiares maiores ao longo da tua vida.'],
      ]],
      ['Human Design (se incluído)', [
        ['Tipo', 'A tua orientação energética de base: Gerador, Manifestador, Projetor ou Refletor.'],
        ['Estratégia', 'Como decides e te moves em alinhamento com o teu tipo.'],
        ['Autoridade', 'A tua bússola interior para decisões fiáveis.'],
        ['Centros', 'Nove centros de energia, definidos (fiáveis) ou abertos (em aprendizagem e permeáveis).'],
        ['Perfil', 'Dois números que descrevem o teu papel e a tua forma de aprender na vida.'],
      ]],
    ],
  },
};

// Baut die Glossar-Blöcke (Überschrift, Intro, Gruppen mit Begriffen, Abschluss).
function buildGlossary(lang, tx) {
  const G = GLOSSARY[lang] || GLOSSARY.de;
  const blocks = [];
  // Seiten-Überschrift wie eine Sektion (Playfair, rose) + Goldlinie
  blocks.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text: tx(G.title), font: 'Playfair Display', size: 40, color: C.rose })],
  }));
  blocks.push(new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text: '', size: 2 })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.gold, space: 4 } },
  }));
  blocks.push(new Paragraph({
    spacing: { before: 0, after: 240, line: 320 },
    children: [new TextRun({ text: tx(G.intro), font: 'Georgia', size: 22, italics: true, color: C.inkSoft })],
  }));
  G.groups.forEach(([groupTitle, entries]) => {
    blocks.push(new Paragraph({
      spacing: { before: 320, after: 120 },
      children: [new TextRun({ text: tx(groupTitle), font: 'Playfair Display', size: 28, color: C.rose })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rosePale, space: 4 } },
    }));
    entries.forEach(([term, expl]) => {
      blocks.push(new Paragraph({
        spacing: { before: 40, after: 80, line: 300 },
        children: [
          new TextRun({ text: tx(term) + ': ', bold: true, font: 'Georgia', size: 21, color: C.ink }),
          new TextRun({ text: tx(expl), font: 'Georgia', size: 21, color: C.inkSoft }),
        ],
      }));
    });
  });
  blocks.push(new Paragraph({
    spacing: { before: 260, after: 120, line: 320 },
    children: [new TextRun({ text: tx(G.closing), font: 'Georgia', size: 20, italics: true, color: C.muted })],
  }));
  return blocks;
}

/**
 * Baut den fertigen docx-Buffer. Keine HTTP-Kenntnis, damit sowohl der
 * Download-Endpunkt als auch der Hintergrund-Job dieselbe Logik nutzen.
 * @returns {Promise<{buffer:Buffer, displayName:string, safeName:string}>}
 */
export async function buildDocxBuffer({ rawText, name, language, title, subtitle }) {
  if (!rawText || typeof rawText !== 'string') throw new Error('Missing rawText');

  const lang = (language === 'en' || language === 'pt') ? language : 'de';
  const L = LOCALE_LABELS[lang];
  const LBL = DOC_LABELS[lang];
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
  // Logo statt Ornament und Schriftzug. Das Logo traegt die Marke selbst,
  // darum steht «herzbewegung» auf dem Deckblatt nicht mehr als Text.
  // Faellt das Bild aus, wird auf den bisherigen Schriftzug zurueckgefallen.
  try {
    children.push(new Paragraph({
      spacing: { before: 1500, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: 'png',
        data: Buffer.from(LOGO_PNG_BASE64, 'base64'),
        transformation: { width: 150, height: 150 },
        altText: { title: 'herzbewegung', description: 'herzbewegung Logo', name: 'Logo' },
      })],
    }));
  } catch (e) {
    console.error('Logo konnte nicht eingebettet werden, nutze Schriftzug:', e.message);
    children.push(new Paragraph({ spacing: { before: 1800, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '✦', font: 'Georgia', size: 56, color: C.gold })] }));
    children.push(new Paragraph({ spacing: { before: 60, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(L.brand).toUpperCase(), font: 'Raleway', size: 18, color: C.rose })] }));
  }
  children.push(new Paragraph({ spacing: { before: 480, after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(title || L.title), font: 'Playfair Display', size: 64, color: C.ink })] }));
  children.push(new Paragraph({ spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: displayName, font: 'Playfair Display', size: 36, italics: true, color: C.rose })] }));
  if (subtitle) children.push(new Paragraph({ spacing: { before: 40, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(subtitle), font: 'Georgia', size: 22, italics: true, color: C.muted })] }));
  children.push(new Paragraph({ spacing: { before: 960 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: filterText(new Date().toLocaleDateString(L.locale, { day: '2-digit', month: 'long', year: 'numeric' })), font: 'Georgia', size: 20, color: C.muted })] }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── SECTIONS ──────────────────────────────────────────
  // Klartitel einer Sektion bestimmen (oder '' wenn Marker/Prosa) — gleiche Logik wie unten,
  // damit der Doppel-Titel-Schutz vorausschauen kann.
  const cleanTitleOf = (sec) => {
    const first = (sec.split('\n')[0] || '').trim();
    const clean = first.replace(/^#+\s*/, '').trim();
    if (!clean.length || /\[[A-Z]/.test(first) || clean.length > 70) return '';
    return clean;
  };
  const norm = (s) => s.toLowerCase().replace(/&/g, 'und').replace(/\s+/g, ' ').trim();
  let prevTitleNorm = '';

  sections.forEach((sec, idx) => {
    const lines = sec.split('\n');
    const firstRaw = (lines[0] || '').trim();
    const firstClean = firstRaw.replace(/^#+\s*/, '').trim();
    // Eine echte Sektions-Ueberschrift ist kurzer Klartext (evtl. mit #), KEIN Marker und keine Prosa.
    const isMarkerLine = /\[[A-Z]/.test(firstRaw);
    const isProseLine = firstClean.length > 70;
    const hasCleanTitle = firstClean.length > 0 && !isMarkerLine && !isProseLine;
    const bodyText = (hasCleanTitle ? lines.slice(1).join('\n') : sec).trim();

    // DOPPEL-TITEL-SCHUTZ: Gibt das Modell zwei aufeinanderfolgende Sektionen mit demselben
    // Titel aus (das war die Ursache der "doppelten Titel"), rendern wir die Überschrift +
    // Goldlinie nur EINMAL und lassen den zweiten Titel weg — der Text fliesst nahtlos weiter.
    const titleNorm = hasCleanTitle ? norm(firstClean) : '';
    const isDupTitle = titleNorm && titleNorm === prevTitleNorm;

    if (hasCleanTitle && !isDupTitle) {
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
    } else if (!hasCleanTitle) {
      children.push(new Paragraph({ spacing: { before: 420 }, children: [new TextRun({ text: '' })] }));
    }
    // isDupTitle: bewusst nichts pushen — nahtloser Anschluss an die vorige Sektion.

    if (hasCleanTitle) prevTitleNorm = titleNorm;

    bodyToBlocks(bodyText, filterText, LBL).forEach(b => children.push(b));

    // Ornament zwischen Sektionen — aber NICHT vor einer Sektion, die denselben Titel wie
    // diese trägt (dann würde ein Trenner mitten in einen zusammengehörenden Block fallen).
    if (idx < sections.length - 1) {
      const nextTitleNorm = norm(cleanTitleOf(sections[idx + 1]));
      const nextIsDup = titleNorm && nextTitleNorm === titleNorm;
      if (!nextIsDup) {
        children.push(new Paragraph({
          spacing: { before: 480, after: 480 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '✦   ✦   ✦', font: 'Georgia', size: 18, color: C.gold })],
        }));
      }
    }
  });

  // ── STANDARD-GLOSSAR (immer angehängt, unabhängig vom Thema/Umfang) ──
  children.push(new Paragraph({ children: [new PageBreak()] }));
  buildGlossary(lang, filterText).forEach(b => children.push(b));

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

  const buffer = await Packer.toBuffer(doc);
  const safeName = displayName.replace(/[^a-zA-Z0-9_\- ]+/g, '').replace(/\s+/g, '_') || 'Analyse';
  return { buffer, displayName, safeName };
}
