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
import { Loader2, User, Mail, Lock, Shield, Calendar } from "lucide-react"
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
    role: 'coordenador' as 'coordenador' | 'coordenador_geral',
    eventId: '',
  })

  const { mutate: createCoordenador, isPending } = useCreateCoordenador()
  const { data: eventos = [], isLoading: loadingEventos } = useEventos()

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'coordenador',
      eventId: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      return // Validação já é feita pelo HTML required
    }

    if (!formData.eventId) {
      return // Validação já é feita pelo disabled no botão
    }

    if (formData.password.length < 6) {
      return // Validação já é feita pelo HTML minLength
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return // Validação já é feita pelo HTML type="email"
    }

    // Buscar nome do evento
    const eventoSelecionado = Array.isArray(eventos) 
      ? eventos.find((evento: Event) => evento.id === formData.eventId)
      : null

    const dadosCompletos = {
      ...formData,
      nome_evento: eventoSelecionado?.name || 'Evento não encontrado'
    }

    createCoordenador(dadosCompletos, {
      onSuccess: () => {
        toast.success(`✅ Usuário ${formData.firstName} ${formData.lastName} criado com sucesso!`)
        resetForm()
        onOpenChange(false)
        onUserCreated?.() // Atualizar a lista de usuários
      }
    })
  }

  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Adicionar Novo Usuário Coordenador
          </DialogTitle>
          <DialogDescription>
            Crie uma nova conta de coordenador no sistema. Todos os campos são obrigatórios.
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
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isPending}
              minLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              A senha deve ter pelo menos 6 caracteres
            </p>
          </div>

          {/* Função/Role */}
          <div>
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Função *
            </Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'coordenador' | 'coordenador_geral') => 
                setFormData({ ...formData, role: value })
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coordenador">Coordenador</SelectItem>
                <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Evento */}
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Evento Associado *
            </Label>
            <Select 
              value={formData.eventId} 
              onValueChange={(value) => setFormData({ ...formData, eventId: value })}
              disabled={isPending || loadingEventos}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento" />
              </SelectTrigger>
              <SelectContent>
                {loadingEventos ? (
                  <SelectItem value="" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando eventos...
                    </div>
                  </SelectItem>
                ) : Array.isArray(eventos) && eventos.length > 0 ? (
                  eventos.map((evento: Event) => (
                    <SelectItem key={evento.id} value={evento.id}>
                      {evento.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    Nenhum evento disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
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
              disabled={isPending || loadingEventos || !formData.eventId}
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