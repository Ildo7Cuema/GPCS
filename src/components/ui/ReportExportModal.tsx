import { useState, useCallback } from 'react'
import { X, FileText, FileSpreadsheet, Settings, Eye, Save, ChevronDown, ChevronUp, Plus, Trash2, Upload, ImageIcon, Check } from 'lucide-react'
import {
    type ReportHeader,
    type ReportColumn,
    type ReportRow,
    type ReportChartConfig,
    loadSavedHeader,
    saveHeader,
    exportToPDF,
    exportToExcel,
    renderBarChart,
    renderPieChart,
    type StatBox,
} from '../../lib/reportExport'

// ---- Colour palette for charts ----
const CHART_COLORS = [
    '#1a3a5c', '#2d6a4f', '#d62828', '#f77f00', '#4361ee',
    '#7209b7', '#06d6a0', '#e63946', '#457b9d', '#a8dadc',
]

interface ReportExportModalProps {
    /** What module is being exported */
    reportType: 'activities' | 'documents' | 'consolidated'
    /** Data columns for the table */
    columns: ReportColumn[]
    /** Data rows */
    rows: ReportRow[]
    /** Optional chart configs */
    charts?: ReportChartConfig[]
    /** Summary statistics */
    stats?: StatBox[]
    /** Chart data for Excel sheet */
    chartData?: { title: string; labels: string[]; values: number[] }[]
    onClose: () => void
}

const REPORT_TITLES: Record<string, string> = {
    activities: 'RELATÓRIO DE ACTIVIDADES',
    documents: 'RELATÓRIO DE DOCUMENTOS INSTITUCIONAIS',
    consolidated: 'RELATÓRIO CONSOLIDADO',
}

export default function ReportExportModal({
    reportType, columns, rows, charts = [], stats, chartData, onClose
}: ReportExportModalProps) {
    const [header, setHeader] = useState<ReportHeader>(() => ({
        ...loadSavedHeader(),
        title: REPORT_TITLES[reportType] ?? loadSavedHeader().title,
    }))
    const [activeTab, setActiveTab] = useState<'header' | 'options' | 'preview'>('header')
    const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
    const [showSignatories, setShowSignatories] = useState(false)
    const [previewPng, setPreviewPng] = useState<string | null>(null)
    const [logoError, setLogoError] = useState<string | null>(null)
    const [includedSections, setIncludedSections] = useState({
        stats: true,
        charts: true,
        table: true,
    })
    const [isHeaderSaved, setIsHeaderSaved] = useState(false)

    const updateHeader = (field: keyof ReportHeader, value: string) => {
        setHeader(prev => ({ ...prev, [field]: value }))
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLogoError(null)
        if (!file.type.startsWith('image/')) {
            setLogoError('O ficheiro deve ser uma imagem (PNG, JPG, SVG...).')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            setLogoError('A imagem não pode exceder 2 MB.')
            return
        }
        const reader = new FileReader()
        reader.onload = ev => {
            const dataUrl = ev.target?.result as string
            setHeader(prev => ({ ...prev, logoDataUrl: dataUrl }))
        }
        reader.readAsDataURL(file)
        // reset input so same file can be re-selected
        e.target.value = ''
    }

    const handleRemoveLogo = () => {
        setHeader(prev => ({ ...prev, logoDataUrl: undefined }))
        setLogoError(null)
    }

    const handleFooterLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'footerLogo1DataUrl' | 'footerLogo2DataUrl') => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return
        if (file.size > 2 * 1024 * 1024) {
            setLogoError('A imagem do rodapé não pode exceder 2 MB.')
            return
        }
        setLogoError(null)
        const reader = new FileReader()
        reader.onload = ev => {
            const dataUrl = ev.target?.result as string
            setHeader(prev => ({ ...prev, [field]: dataUrl }))
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleSaveHeader = () => {
        saveHeader(header)
        setIsHeaderSaved(true)
        setTimeout(() => setIsHeaderSaved(false), 2000)
    }

    const addSignatory = () => {
        setHeader(prev => ({
            ...prev,
            signatories: [...prev.signatories, { role: '', name: '' }]
        }))
    }

    const removeSignatory = (i: number) => {
        setHeader(prev => ({
            ...prev,
            signatories: prev.signatories.filter((_, idx) => idx !== i)
        }))
    }

    const updateSignatory = (i: number, field: 'role' | 'name', value: string) => {
        setHeader(prev => ({
            ...prev,
            signatories: prev.signatories.map((s, idx) => idx === i ? { ...s, [field]: value } : s)
        }))
    }

    const buildPDFSections = useCallback(() => {
        const sections = []

        if (includedSections.stats && stats?.length) {
            sections.push({ title: 'Resumo Estatístico', stats })
        }

        if (includedSections.charts && charts.length) {
            for (const chart of charts) {
                const png = chart.type === 'pie' || chart.type === 'donut'
                    ? renderPieChart(
                        chart.labels,
                        chart.datasets[0]?.data ?? [],
                        chart.datasets[0]?.data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]) ?? CHART_COLORS,
                        chart.title,
                        chart.width ?? 500,
                        chart.height ?? 240,
                        chart.type === 'donut'
                    )
                    : renderBarChart(
                        chart.labels,
                        chart.datasets.map((ds, i) => ({
                            ...ds,
                            color: ds.color || CHART_COLORS[i % CHART_COLORS.length]
                        })),
                        chart.title,
                        chart.width ?? 700,
                        chart.height ?? 300,
                    )
                sections.push({ chartPng: png, chartTitle: chart.title })
            }
        }

        if (includedSections.table) {
            sections.push({
                title: 'Dados Detalhados',
                table: { columns, rows }
            })
        }

        return sections
    }, [includedSections, stats, charts, columns, rows])

    const handleExportPDF = async () => {
        setExporting('pdf')
        try {
            const sections = buildPDFSections()
            const now = new Date()
            exportToPDF({
                header,
                sections,
                filename: `relatorio_${reportType}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            })
        } finally {
            setTimeout(() => setExporting(null), 1000)
        }
    }

    const handleExportExcel = async () => {
        setExporting('excel')
        try {
            const now = new Date()
            exportToExcel({
                header,
                sheetName: reportType === 'activities' ? 'Actividades' : reportType === 'documents' ? 'Documentos' : 'Dados',
                columns,
                rows,
                chartData,
                filename: `relatorio_${reportType}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            })
        } finally {
            setTimeout(() => setExporting(null), 800)
        }
    }

    const handlePreview = () => {
        if (charts.length) {
            const chart = charts[0]
            const png = chart.type === 'pie' || chart.type === 'donut'
                ? renderPieChart(
                    chart.labels,
                    chart.datasets[0]?.data ?? [],
                    CHART_COLORS,
                    chart.title,
                )
                : renderBarChart(
                    chart.labels,
                    chart.datasets.map((ds, i) => ({
                        ...ds,
                        color: ds.color || CHART_COLORS[i % CHART_COLORS.length]
                    })),
                    chart.title,
                )
            setPreviewPng(png)
        }
        setActiveTab('preview')
    }

    const now = new Date()
    const defaultPeriod = header.period || `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-900 to-blue-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Exportar Relatório Profissional</h2>
                            <p className="text-xs text-blue-200">{rows.length} registos · PDF &amp; Excel · Fonte Cambria</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    {([
                        { id: 'header', label: 'Cabeçalho', icon: Settings },
                        { id: 'options', label: 'Opções', icon: FileSpreadsheet },
                        { id: 'preview', label: 'Pré-visualização', icon: Eye },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => tab.id === 'preview' ? handlePreview() : setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* ---- HEADER TAB ---- */}
                    {activeTab === 'header' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                                Estes campos aparecem no cabeçalho centralizado do relatório (PDF e Excel). As alterações são guardadas automaticamente.
                            </p>

                            {/* Live preview strip */}
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center font-serif">
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 tracking-wide">{header.institution || '—'}</p>
                                {header.province && <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">{header.province}</p>}
                                {header.directorate && <p className="text-xs text-gray-600 dark:text-gray-400">{header.directorate}</p>}
                                <div className="border-t border-blue-700 dark:border-blue-500 my-2 w-1/2 mx-auto" />
                                <p className="text-sm font-bold tracking-widest text-gray-900 dark:text-white uppercase">{header.title}</p>
                                {header.subtitle && <p className="text-xs italic text-gray-600 dark:text-gray-400">{header.subtitle}</p>}
                                <div className="text-left mt-2">
                                    {(header.period || defaultPeriod) && <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Período: {header.period || defaultPeriod}</p>}
                                    {header.placeDate && <p className="text-xs text-gray-700 dark:text-gray-300">{header.placeDate}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {/* Logo Upload */}
                                <div className="mb-1">
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                        Logomarca / Brasão <span className="text-gray-400 font-normal">(substitui a letra "A" no documento)</span>
                                    </label>
                                    {header.logoDataUrl ? (
                                        <div className="flex items-center gap-3 p-3 border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                            <img
                                                src={header.logoDataUrl}
                                                alt="Logo"
                                                className="h-14 w-14 object-contain rounded border border-gray-200 dark:border-gray-600 bg-white"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Logomarca carregada</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Será exibida no topo do documento</p>
                                            </div>
                                            <button
                                                onClick={handleRemoveLogo}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Remover logomarca"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                <ImageIcon className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="font-medium text-blue-600 dark:text-blue-400">Clique para seleccionar</span> a imagem
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PNG, JPG, SVG · máx. 2 MB</p>
                                            </div>
                                            <Upload className="w-4 h-4 text-gray-400" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="sr-only"
                                                onChange={handleLogoUpload}
                                            />
                                        </label>
                                    )}
                                    {logoError && (
                                        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{logoError}</p>
                                    )}
                                </div>

                                <Field label="Instituição / Governo" value={header.institution} onChange={v => updateHeader('institution', v)} placeholder="REPÚBLICA DE ANGOLA" />
                                <Field label="Província / Região" value={header.province} onChange={v => updateHeader('province', v)} placeholder="Governo Provincial de..." />
                                <Field label="Direcção / Departamento" value={header.directorate} onChange={v => updateHeader('directorate', v)} placeholder="Gabinete de Comunicação e Imprensa" />
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <Field label="Título do Relatório" value={header.title} onChange={v => updateHeader('title', v)} placeholder={REPORT_TITLES[reportType]} bold />
                                    <Field label="Subtítulo (opcional)" value={header.subtitle} onChange={v => updateHeader('subtitle', v)} placeholder="Descrição complementar..." />
                                    <Field label="Período de Referência" value={header.period} onChange={v => updateHeader('period', v)} placeholder={defaultPeriod} />
                                    <Field label="Local e Data" value={header.placeDate} onChange={v => updateHeader('placeDate', v)} placeholder="Luanda, Fevereiro de 2026" />
                                </div>

                                {/* Footer Config */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Configuração do Rodapé</h3>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Texto do Rodapé</label>
                                        <textarea
                                            value={header.footerText || ''}
                                            onChange={e => updateHeader('footerText', e.target.value)}
                                            rows={5}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                            placeholder="Ex: Praça do Edifício..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Logo Direita</label>
                                            {header.footerLogo2DataUrl ? (
                                                <div className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                                                    <img src={header.footerLogo2DataUrl} alt="Logo 2" className="h-8 object-contain" />
                                                    <button onClick={() => updateHeader('footerLogo2DataUrl', '')} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center justify-center p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1"><Upload className="w-3 h-3" /> Carregar</span>
                                                    <input type="file" accept="image/*" className="sr-only" onChange={e => handleFooterLogoUpload(e, 'footerLogo2DataUrl')} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Signatories */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setShowSignatories(v => !v)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
                                    >
                                        <span>Signatários ({header.signatories.length})</span>
                                        {showSignatories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {showSignatories && (
                                        <div className="p-4 space-y-3">
                                            {header.signatories.map((sig, i) => (
                                                <div key={i} className="flex gap-2 items-start">
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <input
                                                            value={sig.role}
                                                            onChange={e => updateSignatory(i, 'role', e.target.value)}
                                                            placeholder="Cargo"
                                                            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                        />
                                                        <input
                                                            value={sig.name}
                                                            onChange={e => updateSignatory(i, 'name', e.target.value)}
                                                            placeholder="Nome"
                                                            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeSignatory(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={addSignatory}
                                                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                <Plus className="w-4 h-4" /> Adicionar signatário
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveHeader}
                                disabled={isHeaderSaved}
                                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors border ${isHeaderSaved
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                    }`}
                            >
                                {isHeaderSaved ? (
                                    <>
                                        <Check className="w-4 h-4" /> Guardado!
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" /> Guardar cabeçalho como predefinição
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ---- OPTIONS TAB ---- */}
                    {activeTab === 'options' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Secções a incluir</h3>
                                <div className="space-y-2">
                                    {stats?.length ? (
                                        <CheckOption
                                            label="Resumo estatístico (caixas de destaque)"
                                            checked={includedSections.stats}
                                            onChange={v => setIncludedSections(s => ({ ...s, stats: v }))}
                                        />
                                    ) : null}
                                    {charts.length ? (
                                        <CheckOption
                                            label={`Gráficos (${charts.length} gráfico${charts.length > 1 ? 's' : ''})`}
                                            checked={includedSections.charts}
                                            onChange={v => setIncludedSections(s => ({ ...s, charts: v }))}
                                        />
                                    ) : null}
                                    <CheckOption
                                        label={`Tabela de dados (${rows.length} linhas)`}
                                        checked={includedSections.table}
                                        onChange={v => setIncludedSections(s => ({ ...s, table: v }))}
                                    />
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
                                <p className="font-semibold mb-1">Sobre o PDF</p>
                                <p>O PDF é gerado através do sistema de impressão do browser. Após clicar exportar, seleccione "Guardar como PDF" na caixa de diálogo de impressão.</p>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300">
                                <p className="font-semibold mb-1">Sobre o Excel</p>
                                <p>O ficheiro .xlsx é descarregado directamente. Inclui folha de dados formatada com fonte Cambria e {chartData?.length ? `folha "Gráficos" com ${chartData.length} tabela(s) de dados.` : 'cabeçalho institucional.'}</p>
                            </div>
                        </div>
                    )}

                    {/* ---- PREVIEW TAB ---- */}
                    {activeTab === 'preview' && (
                        <div className="space-y-4">
                            {/* Header preview */}
                            <div className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow">
                                <div className="p-6 text-center font-serif border-b-4 border-double border-blue-900 dark:border-blue-600">
                                    {header.logoDataUrl ? (
                                        <img
                                            src={header.logoDataUrl}
                                            alt="Logo"
                                            className="h-14 mx-auto mb-3 object-contain"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 border-2 border-blue-900 dark:border-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <span className="font-bold text-xl text-blue-900 dark:text-blue-300">A</span>
                                        </div>
                                    )}
                                    <p className="font-bold text-sm tracking-wide text-blue-950 dark:text-blue-200 uppercase">{header.institution}</p>
                                    {header.province && <p className="font-semibold text-sm text-blue-900 dark:text-blue-300">{header.province}</p>}
                                    {header.directorate && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{header.directorate}</p>}
                                    <div className="border-t border-blue-800 dark:border-blue-500 my-3 w-1/2 mx-auto" />
                                    <p className="font-bold text-sm tracking-widest text-gray-900 dark:text-white uppercase">{header.title}</p>
                                    {header.subtitle && <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">{header.subtitle}</p>}
                                    <div className="text-left mt-3">
                                        {header.period && <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Período: {header.period}</p>}
                                        {header.placeDate && <p className="text-xs text-gray-700 dark:text-gray-300">{header.placeDate}</p>}
                                    </div>
                                </div>

                                {/* Stats preview */}
                                {includedSections.stats && stats?.length && (
                                    <div className="grid grid-cols-4 gap-0 border-b border-gray-200 dark:border-gray-700">
                                        {stats.slice(0, 4).map((s, i) => (
                                            <div key={i} className="p-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                                <p className="text-lg font-bold text-blue-900 dark:text-blue-300">{s.value}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Chart preview */}
                                {includedSections.charts && previewPng && (
                                    <div className="p-4">
                                        <img src={previewPng} alt="Gráfico" className="w-full rounded border border-gray-200 dark:border-gray-700" />
                                    </div>
                                )}

                                {/* Table preview */}
                                {includedSections.table && (
                                    <div className="overflow-x-auto p-4">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-blue-900 text-white">
                                                    {columns.map(c => (
                                                        <th key={c.key} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{c.header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.slice(0, 3).map((row, i) => (
                                                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-900/10'}>
                                                        {columns.map(c => (
                                                            <td key={c.key} className="px-2 py-1 border-b border-gray-100 dark:border-gray-800">{String(row[c.key] ?? '')}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {rows.length > 3 && (
                                                    <tr>
                                                        <td colSpan={columns.length} className="px-2 py-1 text-center text-gray-400 italic">
                                                            ... e mais {rows.length - 3} linhas
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting !== null}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl transition-colors shadow"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            {exporting === 'excel' ? 'A exportar...' : 'Exportar Excel'}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting !== null}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-60 rounded-xl transition-colors shadow"
                        >
                            <FileText className="w-4 h-4" />
                            {exporting === 'pdf' ? 'A preparar...' : 'Exportar PDF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---- Small helpers ----
function Field({
    label, value, onChange, placeholder, bold = false
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; bold?: boolean }) {
    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${bold ? 'font-semibold' : ''}`}
            />
        </div>
    )
}

function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        </label>
    )
}
