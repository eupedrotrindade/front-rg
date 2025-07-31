/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, AlertCircle, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as XLSX from "xlsx"

interface ImportStepProps {
  onDataImported: (data: any[]) => void
}

export default function ImportStep({ onDataImported }: ImportStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadModeloTemplate = () => {
    // Criar dados modelo
    const modeloData = [
      ["id", "nome", "cpf", "funcao", "empresa", "tipo_credencial"],
      [1, "João Silva", "123.456.789-00", "Desenvolvedor", "Tech Corp", "Funcionário"],
      [2, "Maria Santos", "987.654.321-00", "Designer", "Design Studio", "Terceirizado"],
      [3, "Pedro Costa", "456.789.123-00", "Analista", "Marketing Plus", "Funcionário"],
    ]

    // Criar workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(modeloData)

    // Adicionar planilha com nome "modelo"
    XLSX.utils.book_append_sheet(wb, ws, "modelo")

    // Fazer download
    XLSX.writeFile(wb, "planilha_modelo.xlsx")
  }

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError("Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)")
      return
    }

    setError(null)
    setIsProcessing(true)

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Procurar especificamente pela planilha "modelo"
        let sheetName = "modelo"
        if (!workbook.SheetNames.includes("modelo")) {
          // Se não encontrar "modelo", usar a primeira planilha
          sheetName = workbook.SheetNames[0]
          console.warn("Planilha 'modelo' não encontrada, usando:", sheetName)
        }

        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length === 0) {
          setError("A planilha está vazia")
          setIsProcessing(false)
          return
        }

        // Primeira linha são os cabeçalhos
        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1)

        // Verificar se as colunas obrigatórias existem
        const requiredColumns = ["id", "nome", "cpf", "funcao", "empresa", "tipo_credencial"]
        const missingColumns = requiredColumns.filter(
          (col) => !headers.some((header) => header?.toLowerCase().replace(/\s+/g, "_") === col),
        )

        if (missingColumns.length > 0) {
          setError(`Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`)
          setIsProcessing(false)
          return
        }

        // Converter para objetos com as colunas específicas
        const formattedData = rows
          .filter((row) => row && (row as any[]).some((cell) => cell !== null && cell !== undefined && cell !== ""))
          .map((row) => {
            const obj: any = {}
            headers.forEach((header, colIndex) => {
              if (header) {
                const normalizedHeader = header.toLowerCase().replace(/\s+/g, "_")
                if (requiredColumns.includes(normalizedHeader)) {
                  obj[normalizedHeader] = (row as any[])[colIndex] || ""
                }
              }
            })
            return obj
          })
          .filter((obj) => obj.nome && obj.cpf) // Filtrar registros que tenham pelo menos nome e CPF

        if (formattedData.length === 0) {
          setError("Nenhum dado válido encontrado na planilha")
          setIsProcessing(false)
          return
        }

        setIsProcessing(false)
        onDataImported(formattedData)
      } catch (error) {
        console.error("Erro ao processar arquivo:", error)
        setError("Erro ao processar o arquivo Excel. Verifique se o arquivo não está corrompido.")
        setIsProcessing(false)
      }
    }

    reader.onerror = () => {
      setError("Erro ao ler o arquivo")
      setIsProcessing(false)
    }

    reader.readAsArrayBuffer(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Passo 1: Importar Planilha Excel
        </CardTitle>
        <CardDescription>Faça upload da sua planilha Excel para começar o processo de importação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${isProcessing ? "opacity-50 pointer-events-none" : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />

          {isProcessing ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-600">Processando arquivo...</p>
              <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-medium text-gray-600 mb-2">Arraste e solte seu arquivo Excel aqui</p>
                <p className="text-sm text-gray-500">ou clique no botão abaixo para selecionar</p>
              </div>

              <Button onClick={() => fileInputRef.current?.click()} className="mx-auto">
                Selecionar Arquivo
              </Button>

              <p className="text-xs text-gray-400">Formatos suportados: .xlsx, .xls</p>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInputChange} className="hidden" />

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-green-900 mb-2">Não tem uma planilha?</h4>
              <p className="text-sm text-green-800">
                Baixe nossa planilha modelo com as colunas corretas e alguns dados de exemplo.
              </p>
            </div>
            <Button onClick={downloadModeloTemplate} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Dicas importantes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• A planilha deve ter uma aba chamada modelo</li>
            <li>• Colunas obrigatórias: id, nome, cpf, funcao, empresa, tipo_credencial</li>
            <li>• A primeira linha deve conter os cabeçalhos das colunas</li>
            <li>• Remova linhas completamente vazias</li>
            <li>• O arquivo deve ter no máximo 10MB</li>
            <li>• Baixe a planilha modelo se não tiver uma</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
