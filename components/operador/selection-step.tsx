/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Database, ArrowLeft, ArrowRight } from "lucide-react"

interface SelectionStepProps {
  data: any[]
  onDataSelected: (data: any[]) => void
  onBack: () => void
}

export default function SelectionStep({ data, onDataSelected, onBack }: SelectionStepProps) {
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedRows(data.map((_, index) => index))
    } else {
      setSelectedRows([])
    }
  }

  const handleRowSelect = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, index])
    } else {
      setSelectedRows(selectedRows.filter((i) => i !== index))
      setSelectAll(false)
    }
  }

  const handleNext = () => {
    const selectedData = selectedRows.map((index) => data[index])
    onDataSelected(selectedData)
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Passo 2: Seleção de Dados
        </CardTitle>
        <CardDescription>Selecione os registros que deseja inserir no banco de dados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline">{data.length} registros importados</Badge>
            <Badge variant="secondary">{selectedRows.length} selecionados</Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
            <label htmlFor="select-all" className="text-sm font-medium">
              Selecionar todos
            </label>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <span className="sr-only">Selecionar</span>
                </TableHead>
                {columns.map((column) => (
                  <TableHead key={column} className="font-medium">
                    {column.charAt(0).toUpperCase() + column.slice(1)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index} className={selectedRows.includes(index) ? "bg-blue-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(index)}
                      onCheckedChange={(checked) => handleRowSelect(index, checked as boolean)}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column}>{row[column]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Informações importantes:</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Apenas os registros selecionados serão processados</li>
            <li>• Você pode selecionar/deselecionar registros individualmente</li>
            <li>• Use &quot;Selecionar todos&quot; para marcar todos os registros de uma vez</li>
          </ul>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Button onClick={handleNext} disabled={selectedRows.length === 0}>
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
