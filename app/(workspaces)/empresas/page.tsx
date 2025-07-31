'use client'

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2, Building, Mail, Phone, MapPin, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useAllEmpresas } from "@/features/eventos/api/query"
import { useCreateEmpresa as useCreateEmpresaMutation, useUpdateEmpresa as useUpdateEmpresaMutation, useDeleteEmpresa as useDeleteEmpresaMutation } from "@/features/eventos/api/mutation"
import type { Empresa, CreateEmpresaRequest, UpdateEmpresaRequest } from "@/features/eventos/types"

export default function EmpresasPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [formData, setFormData] = useState<CreateEmpresaRequest>({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    responsavel: "",
    observacoes: ""
  })

  const router = useRouter()

  // Hooks
  const { data: empresas = [], isLoading } = useAllEmpresas()
  const createEmpresaMutation = useCreateEmpresaMutation()
  const updateEmpresaMutation = useUpdateEmpresaMutation()
  const deleteEmpresaMutation = useDeleteEmpresaMutation()

  // Filtrar empresas
  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.cnpj?.includes(searchTerm) ||
    empresa.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingEmpresa) {
        await updateEmpresaMutation.mutateAsync({
          id: editingEmpresa.id,
          data: formData as UpdateEmpresaRequest
        })
        setEditingEmpresa(null)
      } else {
        await createEmpresaMutation.mutateAsync(formData)
      }

      setIsCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Erro ao salvar empresa:", error)
    }
  }

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa)
    setFormData({
      nome: empresa.nome,
      cnpj: empresa.cnpj || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      endereco: empresa.endereco || "",
      cidade: empresa.cidade || "",
      estado: empresa.estado || "",
      cep: empresa.cep || "",
      responsavel: empresa.responsavel || "",
      observacoes: empresa.observacoes || ""
    })
    setIsCreateDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta empresa?")) {
      try {
        await deleteEmpresaMutation.mutateAsync(id)
      } catch (error) {
        console.error("Erro ao deletar empresa:", error)
      }
    }
  }

  const handleCardClick = (empresa: Empresa) => {
    router.push(`/empresas/dashboard/${empresa.id}`)
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      responsavel: "",
      observacoes: ""
    })
    setEditingEmpresa(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Empresas</h1>
        <p className="text-gray-600">Gerencie as empresas do sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Empresas</p>
                <p className="text-3xl font-bold">{empresas.length}</p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Empresas Ativas</p>
                <p className="text-3xl font-bold">{empresas.filter(e => e.isActive).length}</p>
              </div>
              <Badge variant="secondary" className="text-green-600">Ativas</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com CNPJ</p>
                <p className="text-3xl font-bold">{empresas.filter(e => e.cnpj).length}</p>
              </div>
              <Badge variant="secondary" className="text-blue-600">CNPJ</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEmpresa ? "Editar Empresa" : "Nova Empresa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Empresa *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CNPJ</label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telefone</label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Responsável</label>
                  <Input
                    value={formData.responsavel}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CEP</label>
                  <Input
                    value={formData.cep}
                    onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Endereço</label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cidade</label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <Input
                    value={formData.estado}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createEmpresaMutation.isPending || updateEmpresaMutation.isPending}
                >
                  {createEmpresaMutation.isPending || updateEmpresaMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Carregando empresas...</p>
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="text-center py-8">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmpresas.map((empresa) => (
            <Card
              key={empresa.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
              onClick={() => handleCardClick(empresa)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {empresa.nome}
                    </CardTitle>
                    {empresa.responsavel && (
                      <p className="text-sm text-gray-600 mt-1">Resp: {empresa.responsavel}</p>
                    )}
                  </div>
                  <Badge variant={empresa.isActive ? "default" : "secondary"} className="ml-2">
                    {empresa.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {empresa.cnpj && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      <span className="truncate">{empresa.cnpj}</span>
                    </div>
                  )}

                  {empresa.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{empresa.email}</span>
                    </div>
                  )}

                  {empresa.telefone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="truncate">{empresa.telefone}</span>
                    </div>
                  )}

                  {empresa.cidade && empresa.estado && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="truncate">{empresa.cidade}, {empresa.estado}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(empresa)
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(empresa.id)
                      }}
                      disabled={deleteEmpresaMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 