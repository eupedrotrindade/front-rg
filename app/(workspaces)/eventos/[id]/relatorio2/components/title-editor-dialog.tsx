'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Edit3 } from "lucide-react"

interface TitleEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTitle: string
  defaultSubtitle: string
  onConfirm: (title: string, subtitle: string) => void
  isExporting?: boolean
}

export function TitleEditorDialog({
  open,
  onOpenChange,
  defaultTitle,
  defaultSubtitle,
  onConfirm,
  isExporting = false
}: TitleEditorDialogProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [subtitle, setSubtitle] = useState(defaultSubtitle)

  // Atualizar campos quando os valores padrão mudarem
  useEffect(() => {
    setTitle(defaultTitle)
    setSubtitle(defaultSubtitle)
  }, [defaultTitle, defaultSubtitle])

  const handleConfirm = () => {
    onConfirm(title, subtitle)
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Restaurar valores originais ao cancelar
    setTitle(defaultTitle)
    setSubtitle(defaultSubtitle)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-[#610E5C]" />
            Personalizar Título do Relatório
          </DialogTitle>
          <DialogDescription>
            Edite o título e subtítulo que aparecerão no cabeçalho do PDF. 
            Os campos já estão pré-configurados com base no tipo de relatório selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Campo do Título */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Título Principal
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Relatório de Presença - Evento Nome"
              className="col-span-3"
            />
            <p className="text-xs text-gray-500">
              Será exibido em destaque na cor #610E5C
            </p>
          </div>

          {/* Campo do Subtítulo */}
          <div className="grid gap-2">
            <Label htmlFor="subtitle" className="text-sm font-medium">
              Subtítulo
            </Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: Relatório Geral de Participantes"
              className="col-span-3"
            />
            <p className="text-xs text-gray-500">
              Será exibido em cinza abaixo do título
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#610E5C' }}>
              {title || "Título do Relatório"}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {subtitle || "Subtítulo do Relatório"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isExporting || !title.trim() || !subtitle.trim()}
            className="bg-[#610E5C] hover:bg-[#4A0B46]"
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exportando...
              </div>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Confirmar e Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}