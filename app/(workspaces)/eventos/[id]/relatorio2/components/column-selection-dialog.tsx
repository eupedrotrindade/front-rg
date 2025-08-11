'use client'

import { useState, useCallback } from "react"
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
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FileText, Download, CheckSquare, Square, Layers, GripVertical, Ruler, RotateCcw, Settings, List, Expand } from "lucide-react"

export interface Column {
  key: string
  label: string
  description?: string
  defaultWidth?: number
}

export interface ColumnConfig {
  key: string
  width: number | 'auto'
}

export interface ExportConfig {
  columns: string[]
  columnOrder: string[]
  columnWidths: ColumnConfig[]
}

export const AVAILABLE_COLUMNS: Column[] = [
  { key: "nome", label: "Nome", description: "Nome completo do participante", defaultWidth: 35 },
  { key: "cpf", label: "CPF", description: "Documento de identificação", defaultWidth: 25 },
  { key: "empresa", label: "Empresa", description: "Empresa do participante", defaultWidth: 30 },
  { key: "funcao", label: "Função", description: "Cargo ou função", defaultWidth: 25 },
  { key: "pulseira", label: "Pulseira", description: "Número da pulseira", defaultWidth: 20 },
  { key: "tipoPulseira", label: "Tipo de Pulseira", description: "Categoria da pulseira", defaultWidth: 25 },
  { key: "checkIn", label: "Check-in", description: "Data e hora do check-in", defaultWidth: 30 },
  { key: "checkOut", label: "Check-out", description: "Data e hora do check-out", defaultWidth: 30 },
  { key: "tempoTotal", label: "Tempo Total", description: "Tempo total de permanência", defaultWidth: 25 },
  { key: "status", label: "Status", description: "Status atual do participante", defaultWidth: 20 }
]

interface SortableColumnItemProps {
  column: Column
  index: number
}

function SortableColumnItem({ column, index }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-white transition-all ${isDragging ? 'shadow-lg border-green-400 opacity-70' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
        }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-green-500 hover:text-green-600 cursor-move p-1 rounded hover:bg-green-100 transition-all"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1">
        #{index + 1}
      </Badge>
      <span className="text-sm font-medium text-gray-900 flex-1">
        {column.label}
      </span>
    </div>
  )
}

interface ColumnSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (config: ExportConfig) => void
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
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'nome', 'empresa', 'funcao', 'checkIn', 'checkOut', 'status'
  ])
  const [columnWidths, setColumnWidths] = useState<ColumnConfig[]>(
    AVAILABLE_COLUMNS.map(col => ({ key: col.key, width: col.defaultWidth || 'auto' }))
  )
  const [useAutoWidth, setUseAutoWidth] = useState<boolean>(true)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        // Remove from selected columns
        const newSelected = prev.filter(key => key !== columnKey)
        // Also remove from order
        setColumnOrder(prevOrder => prevOrder.filter(key => key !== columnKey))
        return newSelected
      } else {
        // Add to selected columns
        const newSelected = [...prev, columnKey]
        // Add to end of order if not already there
        setColumnOrder(prevOrder => {
          if (!prevOrder.includes(columnKey)) {
            return [...prevOrder, columnKey]
          }
          return prevOrder
        })
        return newSelected
      }
    })
  }

  const handleSelectAll = () => {
    const allColumns = AVAILABLE_COLUMNS.map(col => col.key)
    setSelectedColumns(allColumns)
    setColumnOrder(allColumns)
  }

  const handleSelectNone = () => {
    setSelectedColumns([])
    setColumnOrder([])
  }

  const handleSelectBasic = () => {
    const basicColumns = ['nome', 'empresa', 'checkIn', 'status']
    setSelectedColumns(basicColumns)
    setColumnOrder(basicColumns)
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const handleWidthChange = (columnKey: string, width: string) => {
    const numericWidth = width === '' ? 'auto' : parseInt(width) || 'auto'
    setColumnWidths(prev =>
      prev.map(config =>
        config.key === columnKey
          ? { ...config, width: numericWidth }
          : config
      )
    )
  }

  const handleResetWidths = () => {
    setColumnWidths(
      AVAILABLE_COLUMNS.map(col => ({
        key: col.key,
        width: col.defaultWidth || 'auto'
      }))
    )
  }

  const handleConfirm = () => {
    if (selectedColumns.length === 0) {
      return // Não permite exportar sem colunas selecionadas
    }

    const exportConfig: ExportConfig = {
      columns: selectedColumns,
      columnOrder: columnOrder.filter(key => selectedColumns.includes(key)),
      columnWidths: useAutoWidth
        ? columnWidths.map(config => ({ ...config, width: 'auto' }))
        : columnWidths.filter(config => selectedColumns.includes(config.key))
    }

    onConfirm(exportConfig)
    onOpenChange(false)
  }

  const getExportTitle = () => {
    if (exportType === 'company' && companyName) {
      return `Exportar: ${companyName}`
    }
    return "Configurar Exportação"
  }

  const getExportDescription = () => {
    if (exportType === 'company' && companyName) {
      return `Configure as colunas para o relatório da empresa ${companyName}.`
    }
    return "Configure as colunas, ordem e larguras para o relatório PDF."
  }

  const selectedOrderedColumns = columnOrder
    .filter(key => selectedColumns.includes(key))
    .map(key => AVAILABLE_COLUMNS.find(col => col.key === key))
    .filter((col): col is Column => col !== undefined)

  return (
    <>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-white overflow-y-auto text-gray-800">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="w-5 h-5 text-blue-600" />
              {getExportTitle()}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {getExportDescription()}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Tabs defaultValue="selection" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="selection"
                  className="flex items-center justify-center gap-1 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200 rounded-md"
                >
                  <Settings className="w-3 h-3" />
                  Seleção
                </TabsTrigger>
                <TabsTrigger
                  value="order"
                  className="flex items-center justify-center gap-1 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedColumns.length === 0}
                >
                  <List className="w-3 h-3" />
                  Ordem ({selectedColumns.length})
                </TabsTrigger>
                <TabsTrigger
                  value="width"
                  className="flex items-center justify-center gap-1 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedColumns.length === 0}
                >
                  <Expand className="w-3 h-3" />
                  Larguras
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Seleção */}
              <TabsContent value="selection" className="space-y-3 mt-3">
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded border">
                  <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-7 px-3 text-xs">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Todas ({AVAILABLE_COLUMNS.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectBasic} className="h-7 px-3 text-xs">
                    <Square className="w-3 h-3 mr-1" />
                    Básicas (4)
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNone} className="h-7 px-3 text-xs">
                    Limpar
                  </Button>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedColumns.length} de {AVAILABLE_COLUMNS.length}
                  </Badge>
                </div>

                <div className="border rounded overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    {AVAILABLE_COLUMNS.map((column) => (
                      <div
                        key={column.key}
                        className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer transition-colors ${selectedColumns.includes(column.key) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                          }`}
                        onClick={() => handleColumnToggle(column.key)}
                      >
                        <Checkbox
                          checked={selectedColumns.includes(column.key)}
                          className={selectedColumns.includes(column.key) ? 'border-blue-500 data-[state=checked]:bg-blue-600' : ''}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label className={`text-sm cursor-pointer ${selectedColumns.includes(column.key) ? 'text-blue-900' : 'text-gray-900'}`}>
                              {column.label}
                            </Label>
                            {selectedColumns.includes(column.key) && (
                              <Badge className="bg-blue-600 text-white text-xs px-1">
                                #{columnOrder.indexOf(column.key) + 1}
                              </Badge>
                            )}
                          </div>
                          {column.description && (
                            <p className={`text-xs mt-1 ${selectedColumns.includes(column.key) ? 'text-blue-700' : 'text-gray-500'}`}>
                              {column.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Ordenação */}
              <TabsContent value="order" className="space-y-3 mt-3">
                {selectedColumns.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                      <GripVertical className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        Arraste para reordenar ({selectedColumns.length} colunas)
                      </span>
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={columnOrder.filter(key => selectedColumns.includes(key))} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {selectedOrderedColumns.map((column, index) => (
                            <SortableColumnItem key={column.key} column={column} index={index} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <List className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Selecione colunas primeiro</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Larguras */}
              <TabsContent value="width" className="space-y-3 mt-3">
                {selectedColumns.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-800">Ajustar Larguras Manualmente</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleResetWidths} className="h-7 px-2 text-xs">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Resetar Padrões
                      </Button>
                    </div>

                    {!useAutoWidth && (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto">
                        {selectedColumns.map(columnKey => {
                          const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey)
                          const widthConfig = columnWidths.find(config => config.key === columnKey)
                          if (!column) return null

                          const currentWidth = widthConfig?.width === 'auto' ? column.defaultWidth || 30 : widthConfig?.width || 30

                          return (
                            <div key={columnKey} className="p-3 bg-white rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-gray-900">
                                  {column.label}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  {currentWidth}mm
                                </Badge>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <input
                                    type="range"
                                    min="15"
                                    max="80"
                                    value={currentWidth}
                                    onChange={(e) => handleWidthChange(columnKey, e.target.value)}
                                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                      background: `linear-gradient(to right, #9333ea 0%, #9333ea ${((currentWidth - 15) / (80 - 15)) * 100}%, #e2d1f3 ${((currentWidth - 15) / (80 - 15)) * 100}%, #e2d1f3 100%)`
                                    }}
                                  />
                                </div>

                                <Input
                                  type="number"
                                  min="15"
                                  max="80"
                                  value={currentWidth}
                                  onChange={(e) => handleWidthChange(columnKey, e.target.value)}
                                  className="w-20 h-8 text-xs text-center"
                                />
                                <span className="text-xs text-gray-500 min-w-[20px]">mm</span>
                              </div>

                              <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>15mm</span>
                                <span className="text-purple-600 font-medium">Largura: {currentWidth}mm</span>
                                <span>80mm</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {useAutoWidth && (
                      <div className="text-center py-8">
                        <Ruler className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                        <h4 className="text-base font-medium text-purple-900 mb-2">Largura Automática</h4>
                        <p className="text-sm text-purple-700">Colunas se ajustam ao conteúdo automaticamente.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Expand className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Selecione colunas primeiro</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Width Configuration Summary */}
            <div className="mt-4 p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-semibold text-purple-900">
                      Largura das Colunas
                    </p>
                    <p className="text-xs text-purple-700">
                      {useAutoWidth ? 'Automático - Ajusta ao conteúdo' : 'Manual - Larguras personalizadas'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-sm text-purple-800 font-medium">
                    Automático
                  </Label>
                  <Switch
                    checked={useAutoWidth}
                    onCheckedChange={setUseAutoWidth}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
              </div>

              {!useAutoWidth && selectedColumns.length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-purple-600 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Vá para a aba &quot;Larguras&quot; para ajustar cada coluna individualmente
                  </p>
                </div>
              )}
            </div>

            {/* Status Summary */}
            <div className={`mt-3 p-3 rounded border-l-4 ${selectedColumns.length === 0
              ? 'bg-red-50 border-red-400' : selectedColumns.length <= 4 ? 'bg-green-50 border-green-400' : 'bg-blue-50 border-blue-400'
              }`}>
              <div className="flex items-center gap-3">
                <Layers className={`w-5 h-5 ${selectedColumns.length === 0 ? 'text-red-600' : selectedColumns.length <= 4 ? 'text-green-600' : 'text-blue-600'}`} />
                <div>
                  <p className={`text-sm font-semibold ${selectedColumns.length === 0 ? 'text-red-800' : selectedColumns.length <= 4 ? 'text-green-800' : 'text-blue-800'}`}>
                    <span className="font-bold">{selectedColumns.length}</span> colunas selecionadas
                  </p>
                  <p className={`text-xs ${selectedColumns.length === 0 ? 'text-red-600' : selectedColumns.length <= 4 ? 'text-green-600' : 'text-blue-600'}`}>
                    {selectedColumns.length === 0 ? 'Selecione pelo menos uma coluna' : `${selectedColumns.length <= 4 ? 'Compacto' : 'Detalhado'} • ${useAutoWidth ? 'Automático' : 'Personalizado'}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting} className="h-9 px-4">
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedColumns.length === 0 || isExporting}
                className="h-9 px-6 min-w-[140px]"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                    {selectedColumns.length > 0 && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs ml-2">
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
    </>
  )
}