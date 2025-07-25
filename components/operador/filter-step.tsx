/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Filter, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react"

interface FilterStepProps {
  data: any[]
  onDataFiltered: (data: any[]) => void
  onBack: () => void
  duplicates?: any[]
  uniques?: any[]
}

export default function FilterStep({ data, onDataFiltered, onBack, duplicates: propDuplicates, uniques: propUniques }: FilterStepProps) {
  const [duplicates, setDuplicates] = useState<any[]>(propDuplicates || [])
  const [uniqueData, setUniqueData] = useState<any[]>(propUniques || [])
  const [isProcessing, setIsProcessing] = useState(!propDuplicates || !propUniques)

  useEffect(() => {
    if (propDuplicates && propUniques) {
      setDuplicates(propDuplicates)
      setUniqueData(propUniques)
      setIsProcessing(false)
      return
    }
    // Simular verificação de duplicados no banco de dados
    setTimeout(() => {
      // Simular alguns duplicados baseados no email
      const mockDatabaseEmails = ["joao@email.com", "maria@email.com"]

      const duplicateRecords = data.filter((record) => mockDatabaseEmails.includes(record.email))

      const uniqueRecords = data.filter((record) => !mockDatabaseEmails.includes(record.email))

      setDuplicates(duplicateRecords)
      setUniqueData(uniqueRecords)
      setIsProcessing(false)
    }, 1500)
  }, [data, propDuplicates, propUniques])

  const handleNext = () => {
    onDataFiltered(uniqueData)
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : []

  if (isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Passo 3: Filtro de Dados Duplicados
          </CardTitle>
          <CardDescription>Verificando duplicados no banco de dados...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Analisando dados...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Passo 3: Filtro de Dados Duplicados
        </CardTitle>
        <CardDescription>Análise de duplicados concluída. Revise os resultados abaixo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.length}</div>
              <div className="text-sm text-gray-600">Total de registros</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{duplicates.length}</div>
              <div className="text-sm text-gray-600">Duplicados encontrados</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{uniqueData.length}</div>
              <div className="text-sm text-gray-600">Registros únicos</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="unique" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unique" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Registros Únicos ({uniqueData.length})
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Duplicados ({duplicates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unique" className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Estes registros serão inseridos no banco de dados.
              </p>
            </div>

            {uniqueData.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column} className="font-medium">
                          {column.charAt(0).toUpperCase() + column.slice(1)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueData.map((row, index) => (
                      <TableRow key={index}>
                        {columns.map((column) => (
                          <TableCell key={column}>{row[column]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Nenhum registro único encontrado</div>
            )}
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Estes registros já existem no banco de dados e serão ignorados.
              </p>
            </div>

            {duplicates.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column} className="font-medium">
                          {column.charAt(0).toUpperCase() + column.slice(1)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicates.map((row, index) => (
                      <TableRow key={index} className="bg-red-50">
                        {columns.map((column) => (
                          <TableCell key={column}>{row[column]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Nenhum duplicado encontrado</div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Button onClick={handleNext} disabled={uniqueData.length === 0}>
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
