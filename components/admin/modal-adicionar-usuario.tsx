/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
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
import { Loader2, User, Mail, Lock, Shield, Calendar, Plus, Trash2 } from "lucide-react"
import { useCreateCoordenador } from "@/features/eventos/api/mutation/use-create-coordenador"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Event } from "@/features/eventos/types"
import { toast } from "sonner"

interface ModalAdicionarUsuarioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated?: () => void // Callback para atualizar a lista
}

const ModalAdicionarUsuario: React.FC<ModalAdicionarUsuarioProps> = ({
  open,
  onOpenChange,
  onUserCreated,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    systemRole: 'none' as 'admin' | 'coordenador-geral' | 'none',
    eventos: [] as Array<{ eventId: string }>,
  })

  const { mutate: createCoordenador, isPending } = useCreateCoordenador()
  const { data: eventos = [], isLoading: loadingEventos } = useEventos()

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      systemRole: 'none',
      eventos: [],
    })
  }

  const handleAddEvento = () => {
    setFormData({
      ...formData,
      eventos: [...formData.eventos, { eventId: '' }]
    })
  }

  const handleRemoveEvento = (index: number) => {
    const novosEventos = formData.eventos.filter((_, i) => i !== index)
    setFormData({ ...formData, eventos: novosEventos })
  }

  const handleEventoChange = (index: number, eventId: string) => {
    const novosEventos = [...formData.eventos]
    novosEventos[index] = { eventId }
    setFormData({ ...formData, eventos: novosEventos })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      toast.error('❌ Todos os campos obrigatórios devem ser preenchidos')
      return
    }

    // Validação de coordenador para evento específico ou role geral
    if (formData.systemRole === 'none' && formData.eventos.length === 0) {
      toast.error('❌ Defina um role do sistema ou associe a pelo menos um evento')
      return
    }

    // Validação de eventos (se tiver eventos, todos devem ter ID preenchido)
    if (formData.eventos.length > 0) {
      const eventosInvalidos = formData.eventos.some(ev => !ev.eventId.trim())
      if (eventosInvalidos) {
        toast.error('❌ Todos os eventos associados devem ser selecionados')
        return
      }
    }

    // Validação do Clerk: mínimo 8 caracteres e pelo menos 1 caractere especial
    const passwordRegex = /^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/
    if (!passwordRegex.test(formData.password)) {
      toast.error('❌ A senha deve ter pelo menos 8 caracteres e conter pelo menos 1 caractere especial (!@#$%^&*)')
      return
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('❌ Email deve ter um formato válido')
      return
    }

    // Preparar dados para envio
    let dadosCompletos: any = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
    }

    // Se for um coordenador de evento específico (coordenador comum)
    if (formData.eventos.length > 0 && formData.systemRole === 'none') {
      const primeiroEvento = formData.eventos[0]
      const eventoSelecionado = Array.isArray(eventos)
        ? eventos.find((evento: Event) => evento.id === primeiroEvento.eventId)
        : null

      // Coordenadores associados a eventos específicos são sempre 'coordenador' (comum)
      dadosCompletos = {
        ...dadosCompletos,
        role: 'coordenador' as 'coordenador' | 'coordenador_geral',
        eventId: primeiroEvento.eventId,
        nome_evento: eventoSelecionado?.name || 'Evento não encontrado'
      }
    } else {
      // Para masters e coordenadores gerais (acesso global)
      dadosCompletos = {
        ...dadosCompletos,
        systemRole: formData.systemRole === 'none' ? undefined : formData.systemRole,
        eventos: formData.eventos.map(evento => {
          const eventoSelecionado = Array.isArray(eventos)
            ? eventos.find((ev: Event) => ev.id === evento.eventId)
            : null
          return {
            id: evento.eventId,
            role: 'coordenador_geral', // Fixo como coordenador_geral para coordenadores gerais
            nome_evento: eventoSelecionado?.name || 'Evento não encontrado'
          }
        })
      }
    }

    createCoordenador(dadosCompletos, {
      onSuccess: () => {
        toast.success(`✅ Usuário ${formData.firstName} ${formData.lastName} criado com sucesso!`)
        resetForm()
        onOpenChange(false)
        onUserCreated?.()
      }
    })
  }

  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Adicionar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie uma nova conta no sistema. Defina o tipo de usuário e suas permissões.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

          {/* Email */}
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isPending}
              required
            />
          </div>

          {/* Senha */}
          <div>
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Senha *
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres com 1 especial"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isPending}
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              A senha deve ter pelo menos 8 caracteres e 1 caractere especial (!@#$%^&*)
            </p>
          </div>

          {/* Role do Sistema */}
          <div>
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role do Sistema
            </Label>
            <Select
              value={formData.systemRole}
              onValueChange={(value: 'admin' | 'coordenador-geral' | 'none') =>
                setFormData({ ...formData, systemRole: value })
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

          {/* Eventos Associados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Eventos Específicos (Coordenador Comum)
              </Label>
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
                Nenhum evento associado. Use "Adicionar Evento" para criar um <strong>Coordenador Comum</strong> (acesso limitado a eventos específicos).
              </p>
            ) : (
              <div className="space-y-3">
                {formData.eventos.map((evento, index) => (
                  <div key={index} className="flex gap-2 items-end p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <Label>Evento</Label>
                      <Select
                        value={evento.eventId}
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

            <p className="text-xs text-gray-500">
              <strong>Importante:</strong> Usuários associados a eventos específicos são <strong>Coordenadores Comuns</strong>.
              Para Coordenadores Gerais (acesso a todos os eventos), use apenas o "Role do Sistema" acima.
            </p>
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
              disabled={isPending || loadingEventos}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalAdicionarUsuario