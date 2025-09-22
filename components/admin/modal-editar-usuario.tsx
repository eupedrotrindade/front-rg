/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, User, Mail, Shield, Calendar, Plus, Trash2 } from "lucide-react"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Event, Coordenador } from "@/features/eventos/types"
import { toast } from "sonner"
import { useUpdateUser } from "@/features/eventos/api/mutation/use-update-user"

interface ModalEditarUsuarioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Coordenador | null
  onUserUpdated?: () => void
}

const ModalEditarUsuario: React.FC<ModalEditarUsuarioProps> = ({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: 'none' as 'admin' | 'coordenador-geral' | 'none',
    eventos: [] as Array<{ id: string; nome_evento: string }>
  })

  const { mutate: updateUser, isPending } = useUpdateUser()
  const { data: eventos = [], isLoading: loadingEventos } = useEventos()

  // Preencher formulário quando usuário for selecionado
  useEffect(() => {
    if (user && open) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: (user.metadata?.role as 'admin' | 'coordenador-geral') || 'none',
        eventos: user.metadata?.eventos || []
      })
    }
  }, [user, open])

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      role: 'none',
      eventos: []
    })
  }

  const handleAddEvento = () => {
    setFormData({
      ...formData,
      eventos: [...formData.eventos, { id: '', nome_evento: '' }]
    })
  }

  const handleRemoveEvento = (index: number) => {
    const novosEventos = formData.eventos.filter((_, i) => i !== index)
    setFormData({ ...formData, eventos: novosEventos })
  }

  const handleEventoChange = (index: number, eventId: string) => {
    const eventoSelecionado = Array.isArray(eventos)
      ? eventos.find((evento: Event) => evento.id === eventId)
      : null

    const novosEventos = [...formData.eventos]
    novosEventos[index] = {
      id: eventId,
      nome_evento: eventoSelecionado?.name || ''
    }
    setFormData({ ...formData, eventos: novosEventos })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Validações
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Nome e sobrenome são obrigatórios')
      return
    }

    // Preparar metadata
    const metadata: any = {}

    if (formData.role && formData.role !== 'none') {
      metadata.role = formData.role
    }

    if (formData.eventos.length > 0) {
      // Filtrar eventos válidos (com ID preenchido)
      const eventosValidos = formData.eventos.filter(evento => evento.id.trim() !== '')
      if (eventosValidos.length > 0) {
        metadata.eventos = eventosValidos.map(evento => ({
          ...evento,
          role: 'coordenador_geral' // Role fixo para coordenadores comuns
        }))
      }
    }

    const dadosAtualizacao = {
      userId: user.id,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    }

    updateUser(dadosAtualizacao, {
      onSuccess: () => {
        resetForm()
        onOpenChange(false)
        onUserUpdated?.()
      },
      onError: (error) => {
        toast.error(`❌ Erro ao atualizar usuário: ${error.message}`)
      }
    })
  }

  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Usuário: {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            Edite as informações do usuário. Campos obrigatórios: Nome e Sobrenome.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Informações Básicas</h3>

            {/* Email (somente leitura) */}
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={user.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                O email não pode ser alterado
              </p>
            </div>

            {/* Nome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome *
                </Label>
                <Input
                  id="firstName"
                  placeholder="Nome"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={isPending}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  placeholder="Sobrenome"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={isPending}
                  required
                />
              </div>
            </div>
          </div>

          {/* Role do Sistema */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Permissões do Sistema</h3>

            <div>
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role do Sistema
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'coordenador-geral' | 'none') =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um role (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem role específico</SelectItem>
                  <SelectItem value="admin">Master (Admin)</SelectItem>
                  <SelectItem value="coordenador-geral">Coordenador Geral</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                <strong>Masters:</strong> Acesso total ao sistema<br />
                <strong>Coordenadores Gerais:</strong> Podem gerenciar todos os eventos<br />
                <strong>Sem role:</strong> Para coordenadores de eventos específicos
              </p>
            </div>
          </div>

          {/* Eventos Associados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-gray-700">Eventos Específicos (Coordenador Comum)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEvento}
                disabled={isPending}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Evento
              </Button>
            </div>

            {formData.eventos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 border rounded-lg bg-gray-50">
                Nenhum evento associado. Use  &quot;Adicionar Evento &quot; para tornar este usuário um <strong>Coordenador Comum</strong> (acesso limitado a eventos específicos).
              </p>
            ) : (
              <div className="space-y-3">
                {formData.eventos.map((evento, index) => (
                  <div key={index} className="flex gap-2 items-end p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Evento
                      </Label>
                      <Select
                        value={evento.id}
                        onValueChange={(value) => handleEventoChange(index, value)}
                        disabled={isPending || loadingEventos}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um evento" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingEventos ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando eventos...
                              </div>
                            </SelectItem>
                          ) : Array.isArray(eventos) && eventos.length > 0 ? (
                            eventos.map((evt: Event) => (
                              <SelectItem key={evt.id} value={evt.id}>
                                {evt.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-events" disabled>
                              Nenhum evento disponível
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col items-center justify-end">
                      <Label className="text-xs text-gray-500 mb-1">Role Fixo</Label>
                      <div className="h-10 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md flex items-center">
                        <span className="text-sm font-medium text-blue-800">Coordenador</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveEvento(index)}
                      disabled={isPending}
                      className="h-10 px-3 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalEditarUsuario