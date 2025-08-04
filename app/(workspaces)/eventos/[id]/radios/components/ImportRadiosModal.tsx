'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, X, Check, AlertCircle, Download } from 'lucide-react'
import { useImportRadios } from '@/features/radio/api'

interface ImportRadiosModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
}

interface ParsedRadio {
    code: string
    isValid: boolean
    error?: string
}

export default function ImportRadiosModal({ isOpen, onClose, eventId }: ImportRadiosModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [parsedRadios, setParsedRadios] = useState<ParsedRadio[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [previewData, setPreviewData] = useState<string[][]>([])

    const importRadiosMutation = useImportRadios()

    const parseCSV = useCallback((content: string): ParsedRadio[] => {
        const lines = content.split('\n').filter(line => line.trim())
        const radios: ParsedRadio[] = []

        lines.forEach((line, index) => {
            const code = line.trim()

            if (!code) {
                radios.push({
                    code: '',
                    isValid: false,
                    error: 'Código vazio'
                })
                return
            }

            if (code.length < 3) {
                radios.push({
                    code,
                    isValid: false,
                    error: 'Código muito curto'
                })
                return
            }

            if (code.length > 20) {
                radios.push({
                    code,
                    isValid: false,
                    error: 'Código muito longo'
                })
                return
            }

            // Verificar se já existe no array
            const isDuplicate = radios.some(r => r.code === code)
            if (isDuplicate) {
                radios.push({
                    code,
                    isValid: false,
                    error: 'Código duplicado'
                })
                return
            }

            radios.push({
                code,
                isValid: true
            })
        })

        return radios
    }, [])

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Verificar tipo do arquivo
        if (!file.name.match(/\.(csv|xlsx?)$/i)) {
            toast.error('Por favor, selecione um arquivo CSV ou Excel')
            return
        }

        setSelectedFile(file)

        // Ler arquivo
        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string

            if (file.name.endsWith('.csv')) {
                const radios = parseCSV(content)
                setParsedRadios(radios)

                // Preview dos dados
                const lines = content.split('\n').slice(0, 10) // Primeiras 10 linhas
                setPreviewData(lines.map(line => [line.trim()]))
            } else {
                // Para Excel, mostrar mensagem de suporte futuro
                toast.info('Suporte para Excel será implementado em breve. Use arquivo CSV por enquanto.')
            }
        }
        reader.readAsText(file)
    }, [parseCSV])

    const handleImport = async () => {
        if (parsedRadios.length === 0) {
            toast.error('Nenhum rádio válido para importar')
            return
        }

        const validRadios = parsedRadios.filter(r => r.isValid)
        if (validRadios.length === 0) {
            toast.error('Nenhum rádio válido encontrado')
            return
        }

        setIsProcessing(true)

        try {
            await importRadiosMutation.mutateAsync({
                event_id: eventId,
                radio_codes: validRadios.map(r => r.code),
                status: 'disponivel'
            })

            toast.success(`${validRadios.length} rádio(s) importado(s) com sucesso!`)
            onClose()
            resetForm()
        } catch (error: unknown) {
            console.error('Erro ao importar rádios:', error)

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response: { data: { duplicates?: string[] } } }
                if (axiosError.response?.data?.duplicates) {
                    toast.error(`Alguns rádios já existem: ${axiosError.response.data.duplicates.join(', ')}`)
                } else {
                    toast.error('Erro ao importar rádios')
                }
            } else {
                toast.error('Erro ao importar rádios')
            }
        } finally {
            setIsProcessing(false)
        }
    }

    const resetForm = () => {
        setSelectedFile(null)
        setParsedRadios([])
        setPreviewData([])
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const validRadios = parsedRadios.filter(r => r.isValid)
    const invalidRadios = parsedRadios.filter(r => !r.isValid)

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent className="max-w-2xl bg-white text-gray-800">
                <AlertDialogHeader>
                    <AlertDialogTitle>Importar Rádios em Massa</AlertDialogTitle>
                    <AlertDialogDescription>
                        Selecione um arquivo CSV com os códigos dos rádios (um por linha)
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-6 py-4">
                    {/* Download do exemplo */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Formato do arquivo:</h4>
                        <p className="text-sm text-blue-700 mb-3">
                            O arquivo deve conter um código de rádio por linha. Exemplo:
                        </p>
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                            RADIO001<br />
                            RADIO002<br />
                            RADIO003<br />
                            RADIO004
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-100"
                            onClick={() => {
                                const content = 'RADIO001\nRADIO002\nRADIO003\nRADIO004\nRADIO005'
                                const blob = new Blob([content], { type: 'text/csv' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = 'exemplo_radios.csv'
                                a.click()
                                URL.revokeObjectURL(url)
                            }}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar Exemplo CSV
                        </Button>
                    </div>

                    {/* Upload de arquivo */}
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-700 mb-2">
                                    {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Suporte para CSV e Excel (CSV recomendado)
                                </p>
                            </label>
                        </div>

                        {selectedFile && (
                            <div className="text-sm text-gray-600">
                                <p>Arquivo selecionado: {selectedFile.name}</p>
                                <p>Tamanho: {(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                        )}
                    </div>

                    {/* Preview dos dados */}
                    {previewData.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-700">Preview dos dados:</h4>
                            <div className="max-h-32 overflow-y-auto border rounded-md p-3 bg-gray-50">
                                {previewData.map((line, index) => (
                                    <div key={index} className="text-sm font-mono">
                                        {line[0]}
                                    </div>
                                ))}
                                {previewData.length >= 10 && (
                                    <div className="text-xs text-gray-500 mt-2">
                                        ... e mais {parsedRadios.length - 10} linha(s)
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Estatísticas */}
                    {parsedRadios.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-700">Análise do arquivo:</h4>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{parsedRadios.length}</div>
                                    <div className="text-sm text-blue-600">Total de linhas</div>
                                </div>

                                <div className="bg-green-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{validRadios.length}</div>
                                    <div className="text-sm text-green-600">Válidos</div>
                                </div>

                                <div className="bg-red-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{invalidRadios.length}</div>
                                    <div className="text-sm text-red-600">Inválidos</div>
                                </div>
                            </div>

                            {/* Lista de rádios válidos */}
                            {validRadios.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="font-medium text-green-700 flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        Rádios válidos ({validRadios.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {validRadios.slice(0, 20).map((radio, index) => (
                                            <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                                                {radio.code}
                                            </Badge>
                                        ))}
                                        {validRadios.length > 20 && (
                                            <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                                +{validRadios.length - 20} mais
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Lista de rádios inválidos */}
                            {invalidRadios.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="font-medium text-red-700 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Rádios inválidos ({invalidRadios.length})
                                    </h5>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {invalidRadios.slice(0, 10).map((radio, index) => (
                                            <div key={index} className="text-sm text-red-600 flex items-center gap-2">
                                                <span className="font-mono">{radio.code}</span>
                                                <span className="text-xs text-red-500">({radio.error})</span>
                                            </div>
                                        ))}
                                        {invalidRadios.length > 10 && (
                                            <div className="text-xs text-gray-500">
                                                ... e mais {invalidRadios.length - 10} erro(s)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleImport}
                        disabled={validRadios.length === 0 || isProcessing}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Importando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Importar {validRadios.length} Rádio(s)
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
} 