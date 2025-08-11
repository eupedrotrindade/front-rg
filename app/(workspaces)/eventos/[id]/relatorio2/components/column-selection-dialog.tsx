'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, CheckSquare, Square, Layers } from "lucide-react"

export interface Column {
  key: string
  label: string
  description?: string
}

export const AVAILABLE_COLUMNS: Column[] = [
  { key: "nome", label: "Nome", description: "Nome completo do participante" },
  { key: "cpf", label: "CPF", description: "Documento de identificação" },
  { key: "empresa", label: "Empresa", description: "Empresa do participante" },
  { key: "funcao", label: "Função", description: "Cargo ou função" },
  { key: "pulseira", label: "Pulseira", description: "Número da pulseira" },
  { key: "tipoPulseira", label: "Tipo de Pulseira", description: "Categoria da pulseira" },
  { key: "checkIn", label: "Check-in", description: "Data e hora do check-in" },
  { key: "checkOut", label: "Check-out", description: "Data e hora do check-out" },
  { key: "tempoTotal", label: "Tempo Total", description: "Tempo total de permanência" },
  { key: "status", label: "Status", description: "Status atual do participante" }
]

interface ColumnSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedColumns: string[]) => void
  isExporting?: boolean
  exportType?: 'all' | 'company'
  companyName?: string
}

export function ColumnSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  isExporting = false,
  exportType = 'all',
  companyName
}: ColumnSelectionDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'nome', 'empresa', 'funcao', 'checkIn', 'checkOut', 'status'
  ])

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    )
  }

  const handleSelectAll = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map(col => col.key))
  }

  const handleSelectNone = () => {
    setSelectedColumns([])
  }

  const handleSelectBasic = () => {
    setSelectedColumns(['nome', 'empresa', 'checkIn', 'status'])
  }

  const handleConfirm = () => {
    if (selectedColumns.length === 0) {
      return // Não permite exportar sem colunas selecionadas
    }
    onConfirm(selectedColumns)
    onOpenChange(false)
  }

  const getExportTitle = () => {
    if (exportType === 'company' && companyName) {
      return `Exportar Relatório da Empresa: ${companyName}`
    }
    return "Exportar Relatório Completo"
  }

  const getExportDescription = () => {
    if (exportType === 'company' && companyName) {
      return `Selecione as colunas que deseja incluir no relatório PDF da empresa ${companyName}.`
    }
    return "Selecione as colunas que deseja incluir no relatório PDF."
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-white overflow-hidden text-gray-800">
        <DialogHeader className="pb-4 border-b border-gray-100 ">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            {getExportTitle()}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {getExportDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Botões de seleção rápida */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Seleção Rápida</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 px-3 text-xs border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Todas ({AVAILABLE_COLUMNS.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectBasic}
                className="h-8 px-3 text-xs border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all duration-200"
              >
                <Square className="w-3 h-3 mr-1" />
                Básico (4)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
                className="h-8 px-3 text-xs border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
              >
                Limpar
              </Button>
            </div>
          </div>

          {/* Lista de colunas */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Colunas Disponíveis</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {AVAILABLE_COLUMNS.map((column) => (
                <div
                  key={column.key}
                  className={`group relative flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${selectedColumns.includes(column.key)
                    ? 'border-blue-200 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  onClick={() => handleColumnToggle(column.key)}
                >
                  <Checkbox
                    id={column.key}
                    checked={selectedColumns.includes(column.key)}
                    onCheckedChange={() => handleColumnToggle(column.key)}
                    className={`mt-0.5 ${selectedColumns.includes(column.key)
                      ? 'border-blue-500 data-[state=checked]:bg-blue-600'
                      : 'border-gray-300'
                      }`}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={column.key}
                      className={`block text-sm font-medium cursor-pointer ${selectedColumns.includes(column.key)
                        ? 'text-blue-900'
                        : 'text-gray-900'
                        }`}
                    >
                      {column.label}
                    </Label>
                    {column.description && (
                      <p className={`text-xs mt-1 ${selectedColumns.includes(column.key)
                        ? 'text-blue-700'
                        : 'text-gray-500'
                        }`}>
                        {column.description}
                      </p>
                    )}
                  </div>
                  {selectedColumns.includes(column.key) && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      Selecionado
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contador de colunas selecionadas */}
          <div className={`p-4 rounded-xl border-l-4 ${selectedColumns.length === 0
            ? 'bg-red-50 border-red-400'
            : selectedColumns.length <= 4
              ? 'bg-green-50 border-green-400'
              : 'bg-blue-50 border-blue-400'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${selectedColumns.length === 0
                ? 'bg-red-100'
                : selectedColumns.length <= 4
                  ? 'bg-green-100'
                  : 'bg-blue-100'
                }`}>
                <Layers className={`w-4 h-4 ${selectedColumns.length === 0
                  ? 'text-red-600'
                  : selectedColumns.length <= 4
                    ? 'text-green-600'
                    : 'text-blue-600'
                  }`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${selectedColumns.length === 0
                  ? 'text-red-800'
                  : selectedColumns.length <= 4
                    ? 'text-green-800'
                    : 'text-blue-800'
                  }`}>
                  <span className="font-bold text-lg">{selectedColumns.length}</span> colunas selecionadas
                </p>
                <p className={`text-xs ${selectedColumns.length === 0
                  ? 'text-red-600'
                  : selectedColumns.length <= 4
                    ? 'text-green-600'
                    : 'text-blue-600'
                  }`}>
                  {selectedColumns.length === 0
                    ? 'Selecione pelo menos uma coluna para exportar'
                    : `${AVAILABLE_COLUMNS.length - selectedColumns.length} disponíveis • Ideal para ${selectedColumns.length <= 4 ? 'relatórios compactos' : 'relatórios detalhados'
                    }`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedColumns.length === 0 || isExporting}
              className={`flex items-center gap-2 min-w-[160px] shadow-sm ${selectedColumns.length === 0 || isExporting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                } transition-all duration-200`}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exportar PDF</span>
                  {selectedColumns.length > 0 && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                      {selectedColumns.length}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}