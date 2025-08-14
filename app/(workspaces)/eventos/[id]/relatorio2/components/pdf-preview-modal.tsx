'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Download, X, Calendar, Building2, Users, FileText } from "lucide-react"

interface PreviewItem {
  type: 'SHIFT_HEADER' | 'COMPANY_HEADER' | 'STAFF_RECORD' | 'SUMMARY' | 'OTHER'
  data: string
  pageBreak?: boolean
  shiftDate?: string
  shiftStage?: string
  shiftPeriod?: string
  checkInCount?: number
  totalCount?: number
  color?: string
}

interface PdfPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  previewData: PreviewItem[]
  eventName: string
  onConfirmExport: () => void
  isExporting: boolean
}

export function PdfPreviewModal({
  open,
  onOpenChange,
  previewData,
  eventName,
  onConfirmExport,
  isExporting
}: PdfPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Dividir dados por páginas baseado nos pageBreaks
  const pages = []
  let currentPageItems: PreviewItem[] = []

  previewData.forEach((item, index) => {
    if (item.pageBreak && currentPageItems.length > 0) {
      pages.push(currentPageItems)
      currentPageItems = [item]
    } else {
      currentPageItems.push(item)
    }
  })

  if (currentPageItems.length > 0) {
    pages.push(currentPageItems)
  }

  const totalPages = pages.length
  const currentPageData = pages[currentPage - 1] || []

  const renderPreviewItem = (item: PreviewItem, index: number) => {
    switch (item.type) {
      case 'SHIFT_HEADER':
        return (
          <div key={index} className="text-center py-4 mb-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-lg text-blue-800">CABEÇALHO DO TURNO</span>
            </div>
            <div className="text-xl font-bold text-blue-900">{item.data}</div>
            {item.shiftDate && (
              <div className="flex items-center justify-center gap-4 mt-2 text-sm text-blue-700">
                <Badge variant="outline" className="border-blue-300">
                  📅 {item.shiftDate}
                </Badge>
                <Badge variant="outline" className="border-blue-300">
                  🏗️ {item.shiftStage}
                </Badge>
                <Badge variant="outline" className="border-blue-300">
                  🌙 {item.shiftPeriod}
                </Badge>
              </div>
            )}
          </div>
        )

      case 'COMPANY_HEADER':
        return (
          <div key={index} className="text-center py-3 mb-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-800">EMPRESA</span>
            </div>
            <div className="text-lg font-bold text-green-900">{item.data}</div>
            {item.checkInCount !== undefined && item.totalCount !== undefined && (
              <div className="text-sm text-green-700 mt-1">
                Check-ins: {item.checkInCount} de {item.totalCount}
              </div>
            )}
          </div>
        )

      case 'STAFF_RECORD':
        return (
          <div key={index} className="flex items-center gap-2 py-1 px-3 ml-4 text-gray-700">
            <Users className="h-3 w-3 text-gray-500" />
            <span className="text-sm">{item.data}</span>
          </div>
        )

      case 'SUMMARY':
        return (
          <div key={index} className="text-center py-6 mt-8 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-lg text-purple-800">RESUMO FINAL</span>
            </div>
            <div 
              className="text-lg font-bold"
              style={{ color: item.color || '#610E5C' }}
            >
              {item.data}
            </div>
            <div className="text-xs text-purple-600 mt-2">
              Cor: {item.color || '#610E5C'}
            </div>
          </div>
        )

      default:
        return (
          <div key={index} className="py-1 px-2 text-gray-600 text-sm">
            {item.data}
          </div>
        )
    }
  }

  const stats = {
    shifts: previewData.filter(item => item.type === 'SHIFT_HEADER').length,
    companies: previewData.filter(item => item.type === 'COMPANY_HEADER').length,
    staff: previewData.filter(item => item.type === 'STAFF_RECORD').length,
    pages: totalPages
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview do PDF - {eventName}
          </DialogTitle>
        </DialogHeader>

        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.shifts}</div>
            <div className="text-xs text-gray-600">Turnos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.companies}</div>
            <div className="text-xs text-gray-600">Empresas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.staff}</div>
            <div className="text-xs text-gray-600">Funcionários</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pages}</div>
            <div className="text-xs text-gray-600">Páginas</div>
          </div>
        </div>

        {/* Navegação de páginas */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              ← Anterior
            </Button>
            <span className="text-sm font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima →
            </Button>
          </div>
        )}

        {/* Conteúdo da página atual */}
        <ScrollArea className="flex-1 border rounded-lg bg-white p-4">
          <div className="min-h-[500px] relative">
            {/* Indicador de página */}
            <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Página {currentPage}
            </div>

            {/* Quebra de página anterior */}
            {currentPage > 1 && (
              <div className="text-center text-xs text-gray-400 border-b border-dashed border-gray-300 pb-2 mb-4">
                ⸺⸺⸺ Nova Página ⸺⸺⸺
              </div>
            )}

            {/* Conteúdo da página */}
            <div className="space-y-2">
              {currentPageData.map((item, index) => renderPreviewItem(item, index))}
            </div>

            {/* Quebra de página seguinte */}
            {currentPage < totalPages && (
              <div className="text-center text-xs text-gray-400 border-b border-dashed border-gray-300 pt-4 mt-4">
                ⸺⸺⸺ Quebra de Página ⸺⸺⸺
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Botões de ação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>

          <Button
            onClick={onConfirmExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Gerando PDF..." : "Confirmar e Gerar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}