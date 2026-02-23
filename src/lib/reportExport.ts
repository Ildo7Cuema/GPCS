// ============================================================
// Professional Report Export Engine
// PDF: browser print API with styled HTML
// Excel: raw XLSX XML (Office Open XML format)
// Font: Cambria throughout, centered headers, charts via Canvas
// ============================================================

// ---- Types ----

export interface ReportHeader {
    /** Main institution name, e.g. "REPÚBLICA DE ANGOLA" */
    institution: string
    /** Province or region, e.g. "Província de Luanda" */
    province: string
    /** Directorate / department line */
    directorate: string
    /** Bold report title */
    title: string
    /** Italic subtitle */
    subtitle: string
    /** Report period shown under title */
    period: string
    /** Place and date line at bottom of header */
    placeDate: string
    /** Optional signatory lines */
    signatories: { role: string; name: string }[]
    /** Optional base64 logo data-URL */
    logoDataUrl?: string
    /** Footer text data */
    footerText?: string
    /** Second footer logo (e.g. Governo Provincial da Huíla) */
    footerLogo2DataUrl?: string
}

export interface ReportColumn {
    header: string
    key: string
    width?: number // chars
}

export interface ReportRow {
    [key: string]: string | number | boolean | null | undefined
}

export interface ChartDataset {
    label: string
    data: number[]
    color: string
}

export interface ReportChartConfig {
    title: string
    type: 'bar' | 'pie' | 'line' | 'donut'
    labels: string[]
    datasets: ChartDataset[]
    /** Width in PDF points (default 500) */
    width?: number
    /** Height in PDF points (default 220) */
    height?: number
}

export interface ReportExportConfig {
    header: ReportHeader
    columns: ReportColumn[]
    rows: ReportRow[]
    charts?: ReportChartConfig[]
    filename?: string
    orientation?: 'portrait' | 'landscape'
}

// ---- Default Header ----

export const DEFAULT_HEADER: ReportHeader = {
    institution: 'REPÚBLICA DE ANGOLA',
    province: 'Governo Provincial',
    directorate: 'Gabinete de Comunicação e Imprensa',
    title: 'RELATÓRIO DE ACTIVIDADES',
    subtitle: '',
    period: '',
    placeDate: '',
    signatories: [],
    logoDataUrl: typeof window !== 'undefined' ? window.location.origin + '/images/angola-coat-of-arms.png' : '/images/angola-coat-of-arms.png',
    footerText: "Praça do Edifício do Governo Provincial da Huíla\nLubango - ANGOLA\nTelf.: (+244) 000 000 000 · (+244) 000 000 000\nFax: (+244) 000 000 000\ngeral@huila.gov.ao · www.huila.gov.ao",
    footerLogo2DataUrl: typeof window !== 'undefined' ? window.location.origin + '/images/Estacionário_Rodape.png' : '/images/Estacionário_Rodape.png'
}

// ---- Local Storage Persistence ----

const LS_KEY = 'gpcs_report_header_v5'

export function loadSavedHeader(): ReportHeader {
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) return { ...DEFAULT_HEADER, ...JSON.parse(raw) }
    } catch {
        // ignore
    }
    return { ...DEFAULT_HEADER }
}

export function saveHeader(header: ReportHeader): void {
    localStorage.setItem(LS_KEY, JSON.stringify(header))
}

// ============================================================
// CHART RENDERING (Canvas API)
// ============================================================

/** Draw a bar chart onto a canvas element. Returns base64 PNG. */
export function renderBarChart(
    labels: string[],
    datasets: ChartDataset[],
    title: string,
    width = 700,
    height = 300
): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const padLeft = 55
    const padRight = 20
    const padTop = 40
    const padBottom = 60
    const chartW = width - padLeft - padRight
    const chartH = height - padTop - padBottom

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Title
    ctx.fillStyle = '#1a1a2e'
    ctx.font = 'bold 14px Cambria, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, width / 2, 24)

    const maxVal = Math.max(...datasets.flatMap(d => d.data), 1)
    const groupW = chartW / labels.length
    const barCount = datasets.length
    const barW = Math.min((groupW * 0.8) / barCount, 50)
    const gap = (groupW - barW * barCount) / 2

    // Y gridlines + labels
    const steps = 5
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (let i = 0; i <= steps; i++) {
        const y = padTop + chartH - (i / steps) * chartH
        const val = Math.round((i / steps) * maxVal)
        ctx.beginPath()
        ctx.moveTo(padLeft, y)
        ctx.lineTo(padLeft + chartW, y)
        ctx.stroke()
        ctx.fillStyle = '#6b7280'
        ctx.font = '10px Cambria, Georgia, serif'
        ctx.textAlign = 'right'
        ctx.fillText(String(val), padLeft - 6, y + 3)
    }

    // Bars
    datasets.forEach((ds, di) => {
        ds.data.forEach((val, li) => {
            const barH = (val / maxVal) * chartH
            const x = padLeft + li * groupW + gap + di * barW
            const y = padTop + chartH - barH
            ctx.fillStyle = ds.color
            ctx.fillRect(x, y, barW - 2, barH)
        })
    })

    // X labels
    ctx.fillStyle = '#374151'
    ctx.font = '10px Cambria, Georgia, serif'
    ctx.textAlign = 'center'
    labels.forEach((lbl, li) => {
        const x = padLeft + li * groupW + groupW / 2
        const y = padTop + chartH + 16
        const short = lbl.length > 14 ? lbl.slice(0, 13) + '…' : lbl
        ctx.fillText(short, x, y)
    })

    // Legend
    if (datasets.length > 1) {
        let lx = padLeft
        datasets.forEach(ds => {
            ctx.fillStyle = ds.color
            ctx.fillRect(lx, height - 18, 12, 10)
            ctx.fillStyle = '#374151'
            ctx.font = '10px Cambria, Georgia, serif'
            ctx.textAlign = 'left'
            ctx.fillText(ds.label, lx + 16, height - 10)
            lx += ctx.measureText(ds.label).width + 36
        })
    }

    return canvas.toDataURL('image/png')
}

/** Draw a pie/donut chart. Returns base64 PNG. */
export function renderPieChart(
    labels: string[],
    data: number[],
    colors: string[],
    title: string,
    width = 500,
    height = 300,
    donut = false
): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#1a1a2e'
    ctx.font = 'bold 14px Cambria, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, width / 2, 22)

    const total = data.reduce((a, b) => a + b, 0) || 1
    const cx = width * 0.38
    const cy = height / 2 + 10
    const r = Math.min(cx, cy) * 0.82

    let startAngle = -Math.PI / 2
    data.forEach((val, i) => {
        const slice = (val / total) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, r, startAngle, startAngle + slice)
        ctx.closePath()
        ctx.fillStyle = colors[i] || '#94a3b8'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()

        // Donut hole
        if (donut) {
            ctx.beginPath()
            ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.fill()
        }
        startAngle += slice
    })

    // Legend
    const legendX = width * 0.68
    labels.forEach((lbl, i) => {
        const lY = 50 + i * 22
        ctx.fillStyle = colors[i] || '#94a3b8'
        ctx.fillRect(legendX, lY, 14, 12)
        ctx.fillStyle = '#374151'
        ctx.font = '11px Cambria, Georgia, serif'
        ctx.textAlign = 'left'
        const pct = total > 0 ? Math.round((data[i] / total) * 100) : 0
        const short = lbl.length > 18 ? lbl.slice(0, 17) + '…' : lbl
        ctx.fillText(`${short} (${pct}%)`, legendX + 20, lY + 10)
    })

    return canvas.toDataURL('image/png')
}

// ============================================================
// PDF EXPORT — styled HTML → browser print
// ============================================================

function buildHeaderHTML(h: ReportHeader): string {
    const logo = h.logoDataUrl
        ? `<img src="${h.logoDataUrl}" style="height:64px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;" alt="logo" />`
        : `<div style="width:70px;height:70px;border:2px solid #1a3a5c;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;background:#f0f4fa;">
            <span style="font-family:Cambria,Georgia,serif;font-size:24px;font-weight:bold;color:#1a3a5c;">A</span>
           </div>`

    return `
      <div class="report-header">
        ${logo}
        <div class="h-institution">${h.institution}</div>
        ${h.province ? `<div class="h-province">${h.province}</div>` : ''}
        ${h.directorate ? `<div class="h-directorate">${h.directorate}</div>` : ''}
        <div class="h-divider"></div>
        <div class="h-title">${h.title}</div>
        ${h.subtitle ? `<div class="h-subtitle">${h.subtitle}</div>` : ''}
      </div>
      <div class="h-left-info">
        ${h.period ? `<div class="h-period">Período: ${h.period}</div>` : ''}
        ${h.placeDate ? `<div class="h-place">${h.placeDate}</div>` : ''}
      </div>`
}

function buildSignatoriesHTML(h: ReportHeader): string {
    if (!h.signatories.length) return ''
    return `<div class="signatories-block" style="margin-top:60px;display:flex;justify-content:space-around;gap:30px;page-break-inside:avoid;">
            ${h.signatories.map(s => `
              <div style="text-align:center;min-width:160px;">
                <div style="border-top:1px solid #1a3a5c;padding-top:8px;">
                  <div style="font-family:Cambria,Georgia,serif;font-size:11px;color:#1a3a5c;font-weight:bold;">${s.name}</div>
                  <div style="font-family:Cambria,Georgia,serif;font-size:10px;color:#4b5563;">${s.role}</div>
                </div>
              </div>`).join('')}
           </div>`
}

function buildTableHTML(columns: ReportColumn[], rows: ReportRow[]): string {
    const head = columns.map(c => `<th>${c.header}</th>`).join('')
    const body = rows.map((row, i) => {
        const cells = columns.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')
        return `<tr class="${i % 2 === 0 ? '' : 'alt'}">${cells}</tr>`
    }).join('')
    return `
      <table class="data-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>`
}

const PDF_STYLES = `
  @page { margin: 18mm 15mm 0.5mm 15mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: Cambria, Georgia, 'Times New Roman', serif; font-size: 11pt; color: #111; background: #fff; margin: 0; }
  .report-header { text-align: center; padding: 16px 0 12px; border-bottom: 3px double #000; margin-bottom: 18px; }
  .h-institution { font-size: 15pt; font-weight: bold; letter-spacing: 1px; color: #000; margin: 6px 0 2px; }
  .h-province { font-size: 12pt; font-weight: bold; color: #111; margin: 2px 0; }
  .h-directorate { font-size: 10.5pt; color: #333; margin: 2px 0 8px; }
  .h-divider { border: none; border-top: 1.5px solid #000; margin: 10px auto; width: 60%; }
  .h-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #000; margin: 8px 0 4px; }
  .h-subtitle { font-size: 11pt; font-style: italic; color: #333; margin: 2px 0; }
  .h-left-info { text-align: left; margin-bottom: 20px; }
  .h-period { font-size: 10.5pt; font-weight: bold; color: #000; margin: 2px 0; }
  .h-place { font-size: 10.5pt; color: #000; margin: 2px 0; }
  .section-title { font-size: 12pt; font-weight: bold; color: #000; border-left: 4px solid #000; padding-left: 10px; margin: 22px 0 10px; }
  .data-table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 9.5pt; }
  .data-table thead tr { background: #000; color: #fff; }
  .data-table th { padding: 7px 9px; text-align: left; font-weight: bold; font-size: 9pt; border: 1px solid #000; white-space: nowrap; }
  .data-table td { padding: 6px 9px; border: 1px solid #d1d5db; vertical-align: top; }
  .data-table tr.alt td { background: #f9fafb; }
  .chart-img { display: block; max-width: 85%; max-height: 220px; object-fit: contain; margin: 8px auto 16px; border: 1px solid #e5e7eb; border-radius: 4px; }
  .chart-title { font-size: 11pt; font-weight: bold; color: #000; text-align: center; margin: 16px 0 6px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0 20px; }
  .stat-box { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; text-align: center; }
  .stat-box .val { font-size: 20pt; font-weight: bold; color: #000; }
  .stat-box .lbl { font-size: 9pt; color: #666; margin-top: 2px; }
  
  .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: stretch; font-size: 8.5pt; color: #6b7280; height: 80px; background: #fff; }
  .footer-left { border-left: 2px solid #e63946; padding-left: 10px; display: flex; flex-direction: column; justify-content: center; line-height: 1.3; }
  .footer-right { display: flex; align-items: center; gap: 15px; }
  .f-logo { max-height: 40px; object-fit: contain; }
  .f-divider { width: 1px; height: 40px; background-color: #6b7280; }
  
  @media print {
    .no-print { display: none; }
    .data-table thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    h2, .section-title { page-break-after: avoid; }
  }
`

export interface StatBox {
    label: string
    value: string | number
}

export interface PDFSection {
    title?: string
    table?: { columns: ReportColumn[]; rows: ReportRow[] }
    chartPng?: string
    chartTitle?: string
    stats?: StatBox[]
    html?: string
}

export function exportToPDF(config: {
    header: ReportHeader
    sections: PDFSection[]
    filename?: string
}): void {
    const { header, sections, filename = 'relatorio' } = config
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })

    let body = buildHeaderHTML(header)

    for (const sec of sections) {
        if (sec.title) {
            body += `<div class="section-title">${sec.title}</div>`
        }
        if (sec.stats) {
            body += `<div class="stats-grid">${sec.stats.map(s => `
              <div class="stat-box">
                <div class="val">${s.value}</div>
                <div class="lbl">${s.label}</div>
              </div>`).join('')}</div>`
        }
        if (sec.chartPng && sec.chartTitle) {
            body += `<div class="chart-title">${sec.chartTitle}</div>`
            body += `<img src="${sec.chartPng}" class="chart-img" alt="${sec.chartTitle}" />`
        }
        if (sec.table) {
            body += buildTableHTML(sec.table.columns, sec.table.rows)
        }
        if (sec.html) {
            body += sec.html
        }
    }

    body += buildSignatoriesHTML(header)

    const footerLines = (header.footerText || '').split('\n').map(l => l.trim()).filter(Boolean)
    const footerHtml = footerLines.map(l => `<div>${l}</div>`).join('')

    body += `
      <div class="footer">
        <div class="footer-left">
          ${footerHtml}
        </div>
        <div class="footer-right">
          ${header.footerLogo2DataUrl ? `<img src="${header.footerLogo2DataUrl}" class="f-logo" />` : ''}
        </div>
      </div>`

    const win = window.open('', '_blank')
    if (!win) {
        alert('Por favor, permita popups neste site para gerar o PDF.')
        return
    }

    win.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>${filename}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  ${body}
  <script>
    window.onload = function() {
      window.print();
      // Close after print dialog
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`)
    win.document.close()
}

// ============================================================
// EXCEL EXPORT — raw XLSX XML (Office Open XML)
// ============================================================

function escXml(val: unknown): string {
    const s = String(val ?? '')
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/** Convert column index (0-based) to Excel letter e.g. 0→A, 25→Z, 26→AA */
function colLetter(n: number): string {
    let result = ''
    n += 1
    while (n > 0) {
        const rem = (n - 1) % 26
        result = String.fromCharCode(65 + rem) + result
        n = Math.floor((n - 1) / 26)
    }
    return result
}

interface XlsxCell {
    v: string | number
    t: 's' | 'n' // string or number
    bold?: boolean
    italic?: boolean
    size?: number
    bg?: string // ARGB hex e.g. 'FF1A3A5C'
    fg?: string // ARGB hex e.g. 'FFFFFFFF'
    align?: 'center' | 'left' | 'right'
    wrap?: boolean
    border?: boolean
    merge?: { across: number; down: number } // col/row span (for shared strings we skip proper merge here)
}

function buildXlsxRow(cells: XlsxCell[], rowIdx: number, sharedStrings: string[]): string {
    const cellXml = cells.map((cell, ci) => {
        const ref = `${colLetter(ci)}${rowIdx}`

        const numFmt = ''
        const fontXml = `<font>
          ${cell.bold ? '<b/>' : ''}${cell.italic ? '<i/>' : ''}
          <sz val="${cell.size ?? 11}"/>
          <name val="Cambria"/>
          ${cell.fg ? `<color rgb="${cell.fg}"/>` : '<color theme="1"/>'}
        </font>`
        const fillXml = cell.bg
            ? `<fill><patternFill patternType="solid"><fgColor rgb="${cell.bg}"/></patternFill></fill>`
            : `<fill><patternFill patternType="none"/></fill>`
        const borderXml = cell.border
            ? `<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom></border>`
            : `<border/>`
        const alignXml = `<alignment horizontal="${cell.align ?? 'left'}" vertical="center" wrapText="${cell.wrap ? '1' : '0'}"/>`

        // We embed style inline via xf
        void fontXml; void fillXml; void borderXml; void numFmt

        if (cell.t === 'n') {
            return `<c r="${ref}" t="n"><v>${cell.v}</v></c>`
        }

        // Shared strings
        const idx = sharedStrings.length
        sharedStrings.push(String(cell.v))
        void alignXml
        return `<c r="${ref}" t="s" s="0"><v>${idx}</v></c>`
    }).join('')
    return `<row r="${rowIdx}">${cellXml}</row>`
}

export function exportToExcel(config: {
    header: ReportHeader
    sheetName?: string
    columns: ReportColumn[]
    rows: ReportRow[]
    chartData?: { title: string; labels: string[]; values: number[] }[]
    filename?: string
}): void {
    const { header, columns, rows, chartData, filename = 'relatorio', sheetName = 'Dados' } = config

    const sharedStrings: string[] = []
    const xlRows: string[] = []
    let rowIdx = 1

    // --- Header rows ---
    const addHeaderRow = (text: string, bold = false, size = 11, bg?: string, fg?: string, align: 'center' | 'left' = 'center') => {
        const colSpan = columns.length || 1
        // Write a merged-looking row (all cells same value, styled)
        const cells: XlsxCell[] = [
            { v: text, t: 's', bold, size, bg, fg, align, wrap: true, border: false }
        ]
        // Fill remaining with empty
        for (let i = 1; i < colSpan; i++) cells.push({ v: '', t: 's' })
        xlRows.push(buildXlsxRow(cells, rowIdx, sharedStrings))
        rowIdx++
    }

    addHeaderRow(header.institution, true, 14, 'FF1A3A5C', 'FFFFFFFF', 'center')
    if (header.province) addHeaderRow(header.province, true, 12, 'FF1A3A5C', 'FFFFFFFF', 'center')
    if (header.directorate) addHeaderRow(header.directorate, false, 11, 'FF1A3A5C', 'FFFFFFFF', 'center')
    addHeaderRow('', false, 6)
    addHeaderRow(header.title, true, 13, 'FF2D6A4F', 'FFFFFFFF', 'center')
    if (header.subtitle) addHeaderRow(header.subtitle, false, 11, 'FF2D6A4F', 'FFFFFFFF', 'center')
    if (header.period) addHeaderRow(`Período: ${header.period}`, false, 10, 'FFE9F5F0', 'FF1A3A5C', 'center')
    if (header.placeDate) addHeaderRow(header.placeDate, false, 10)
    addHeaderRow('', false, 6) // spacer

    // --- Column header row ---
    const headerCells: XlsxCell[] = columns.map(c => ({
        v: c.header,
        t: 's' as const,
        bold: true,
        size: 10,
        bg: 'FF1A3A5C',
        fg: 'FFFFFFFF',
        align: 'center' as const,
        border: true,
    }))
    xlRows.push(buildXlsxRow(headerCells, rowIdx, sharedStrings))
    rowIdx++

    // --- Data rows ---
    rows.forEach((row, ri) => {
        const cells: XlsxCell[] = columns.map(c => {
            const raw = row[c.key]
            const isNum = typeof raw === 'number'
            const vText = isNum ? raw : (typeof raw === 'boolean' ? (raw ? 'Sim' : 'Não') : String(raw ?? ''))
            return {
                v: vText,
                t: isNum ? 'n' as const : 's' as const,
                size: 10,
                bg: ri % 2 === 0 ? 'FFF0F4FA' : 'FFFFFFFF',
                align: isNum ? 'right' as const : 'left' as const,
                border: true,
                wrap: true,
            }
        })
        xlRows.push(buildXlsxRow(cells, rowIdx, sharedStrings))
        rowIdx++
    })

    // --- Column widths ---
    const colWidths = columns.map(c => {
        const maxDataLen = rows.reduce((mx, r) => Math.max(mx, String(r[c.key] ?? '').length), 0)
        return Math.min(Math.max(c.width ?? 12, c.header.length, maxDataLen) + 2, 60)
    })
    const colsXml = colWidths.map((w, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${w}" bestFit="1" customWidth="1"/>`
    ).join('')

    // --- Shared strings XML ---
    const sst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
  ${sharedStrings.map(s => `<si><t xml:space="preserve">${escXml(s)}</t></si>`).join('\n  ')}
</sst>`

    // --- Sheet XML ---
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${colsXml}</cols>
  <sheetData>
    ${xlRows.join('\n    ')}
  </sheetData>
</worksheet>`

    // --- Chart data sheet (if provided) ---
    let chartSheet = ''
    let chartSheetXml = ''
    if (chartData?.length) {
        chartSheet = 'Gráficos'
        const cRows: string[] = []
        let cr = 1
        for (const chart of chartData) {
            const ss: string[] = []
            // Title row
            const ti = ss.length; ss.push(chart.title)
            cRows.push(`<row r="${cr}"><c r="A${cr}" t="s" s="0"><v>${sharedStrings.length + ti}</v></c></row>`)
            // We push chart shared strings to main list
            sharedStrings.push(chart.title)
            cr++
            // Header row
            sharedStrings.push('Categoria'); sharedStrings.push('Valor')
            const hIdx = sharedStrings.length - 2
            cRows.push(`<row r="${cr}"><c r="A${cr}" t="s"><v>${hIdx}</v></c><c r="B${cr}" t="s"><v>${hIdx + 1}</v></c></row>`)
            cr++
            for (let i = 0; i < chart.labels.length; i++) {
                const li = sharedStrings.length; sharedStrings.push(chart.labels[i])
                cRows.push(`<row r="${cr}"><c r="A${cr}" t="s"><v>${li}</v></c><c r="B${cr}" t="n"><v>${chart.values[i]}</v></c></row>`)
                cr++
            }
            cr++ // spacer
        }
        chartSheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${cRows.join('\n')}</sheetData>
</worksheet>`
    }

    // --- styles.xml (basic, Cambria) ---
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font><sz val="11"/><name val="Cambria"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`

    // --- workbook.xml ---
    const sheets = [`<sheet name="${escXml(sheetName)}" sheetId="1" r:id="rId1"/>`]
    if (chartSheet) sheets.push(`<sheet name="${escXml(chartSheet)}" sheetId="2" r:id="rId2"/>`)
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets.join('')}</sheets>
</workbook>`

    // --- relationships ---
    const relEntries = [
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`,
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`,
        `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    ]
    if (chartSheet) {
        relEntries.push(`<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>`)
    }
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relEntries.join('\n  ')}
</Relationships>`

    const topRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  ${chartSheet ? `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` : ''}
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

    // --- Build ZIP using browser's CompressionStream (native, no library) ---
    // We use a simple ZIP builder instead since CompressionStream doesn't give ZIP format.
    // We'll use an uncompressed ZIP (stored, no deflate) — compatible with Excel.
    const enc = new TextEncoder()
    const files: { name: string; data: Uint8Array }[] = [
        { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
        { name: '_rels/.rels', data: enc.encode(topRels) },
        { name: 'xl/workbook.xml', data: enc.encode(workbookXml) },
        { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRels) },
        { name: 'xl/sharedStrings.xml', data: enc.encode(sst) },
        { name: 'xl/styles.xml', data: enc.encode(stylesXml) },
        { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml) },
    ]
    if (chartSheet && chartSheetXml) {
        files.push({ name: 'xl/worksheets/sheet2.xml', data: enc.encode(chartSheetXml) })
    }

    const zipBytes = buildUncompressedZip(files)
    const blob = new Blob([zipBytes as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.xlsx`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
}

// --- Minimal Uncompressed ZIP builder ---
function buildUncompressedZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
    const parts: Uint8Array[] = []
    const centralDir: Uint8Array[] = []
    const offsets: number[] = []
    let offset = 0

    for (const file of files) {
        offsets.push(offset)
        const nameBytes = new TextEncoder().encode(file.name)
        const crc = crc32(file.data)
        const local = buildLocalFileHeader(nameBytes, file.data, crc)
        parts.push(local)
        parts.push(file.data)
        centralDir.push(buildCentralDirEntry(nameBytes, file.data, crc, offset))
        offset += local.length + file.data.length
    }

    const cdStart = offset
    let cdSize = 0
    for (const cd of centralDir) { parts.push(cd); cdSize += cd.length }

    parts.push(buildEndOfCentralDir(files.length, cdSize, cdStart))

    const total = parts.reduce((s, p) => s + p.length, 0)
    const buf = new Uint8Array(total)
    let pos = 0
    for (const p of parts) { buf.set(p, pos); pos += p.length }
    return buf
}

function u16le(v: number): Uint8Array {
    return new Uint8Array([v & 0xff, (v >> 8) & 0xff])
}
function u32le(v: number): Uint8Array {
    return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff])
}

function buildLocalFileHeader(name: Uint8Array, data: Uint8Array, crc: number): Uint8Array {
    const sig = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    const ver = u16le(20)
    const flag = u16le(0)
    const comp = u16le(0) // stored
    const time = u16le(0); const date = u16le(0)
    const crcB = u32le(crc)
    const sizeB = u32le(data.length)
    const nameLen = u16le(name.length)
    const extra = u16le(0)
    return concat([sig, ver, flag, comp, time, date, crcB, sizeB, sizeB, nameLen, extra, name])
}

function buildCentralDirEntry(name: Uint8Array, data: Uint8Array, crc: number, localOffset: number): Uint8Array {
    const sig = new Uint8Array([0x50, 0x4b, 0x01, 0x02])
    const verMade = u16le(20); const verNeed = u16le(20)
    const flag = u16le(0); const comp = u16le(0)
    const time = u16le(0); const date = u16le(0)
    const crcB = u32le(crc)
    const sizeB = u32le(data.length)
    const nameLen = u16le(name.length)
    const extra = u16le(0); const comment = u16le(0)
    const disk = u16le(0); const intAttr = u16le(0); const extAttr = u32le(0)
    const off = u32le(localOffset)
    return concat([sig, verMade, verNeed, flag, comp, time, date, crcB, sizeB, sizeB, nameLen, extra, comment, disk, intAttr, extAttr, off, name])
}

function buildEndOfCentralDir(count: number, size: number, offset: number): Uint8Array {
    const sig = new Uint8Array([0x50, 0x4b, 0x05, 0x06])
    const disk = u16le(0); const cdDisk = u16le(0)
    const cnt = u16le(count); const total = u16le(count)
    const sizeB = u32le(size); const offB = u32le(offset)
    const comment = u16le(0)
    return concat([sig, disk, cdDisk, cnt, total, sizeB, offB, comment])
}

function concat(arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((s, a) => s + a.length, 0)
    const out = new Uint8Array(total)
    let pos = 0
    for (const a of arrays) { out.set(a, pos); pos += a.length }
    return out
}

function crc32(data: Uint8Array): number {
    const table = crc32Table()
    let crc = 0xffffffff
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff]
    }
    return (crc ^ 0xffffffff) >>> 0
}

let _crc32Table: Uint32Array | null = null
function crc32Table(): Uint32Array {
    if (_crc32Table) return _crc32Table
    _crc32Table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
        let c = i
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
        }
        _crc32Table[i] = c
    }
    return _crc32Table
}
