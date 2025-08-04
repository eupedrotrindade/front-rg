"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations"
import { CreateCredentialRequest } from "@/features/eventos/types"
import { toast } from "sonner"
import { Loader2, Plus, Palette } from "lucide-react"
import { HexColorPicker } from "react-colorful"

interface CreateCredentialDialogProps {
    eventId: string
    credentialName: string
    onSuccess?: (credentialId: string) => void
    trigger?: React.ReactNode
}

const CreateCredentialDialog = ({
    eventId,
    credentialName,
    onSuccess,
    trigger
}: CreateCredentialDialogProps) => {
    const [open, setOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [showCustomColor, setShowCustomColor] = useState(false)
    const [formData, setFormData] = useState({
        nome: credentialName.toUpperCase(),
        cor: "#3B82F6",
        days_works: [] as string[]
    })

    const { mutate: createCredential } = useCreateCredential()

    const handleSubmit = () => {
        if (!formData.nome.trim()) {
            toast.error("Nome da credencial é obrigatório")
            return
        }

        setIsCreating(true)

        // Garantir que sempre tenha pelo menos uma data
        const daysWorks = formData.days_works.length > 0
            ? formData.days_works
            : [new Date().toLocaleDateString('pt-BR')] // Data atual como fallback

        const credentialData: CreateCredentialRequest = {
            nome: formData.nome.trim().toUpperCase(),
            cor: formData.cor,
            id_events: eventId,
            days_works: daysWorks,
            isActive: true,
            isDistributed: false
        }

        createCredential(credentialData, {
            onSuccess: (data) => {
                toast.success("Credencial criada com sucesso!")
                setOpen(false)
                onSuccess?.(data.id)
                // Reset form
                setFormData({
                    nome: credentialName.toUpperCase(),
                    cor: "#3B82F6",
                    days_works: []
                })
                setShowCustomColor(false)
            },
            onError: (error) => {
                console.error("Erro ao criar credencial:", error)
                toast.error("Erro ao criar credencial")
            },
            onSettled: () => {
                setIsCreating(false)
            }
        })
    }

    const predefinedColors = [
        { name: "Azul", value: "#3B82F6" },
        { name: "Azul Escuro", value: "#1E40AF" },
        { name: "Verde", value: "#10B981" },
        { name: "Verde Escuro", value: "#059669" },
        { name: "Vermelho", value: "#EF4444" },
        { name: "Vermelho Escuro", value: "#DC2626" },
        { name: "Amarelo", value: "#F59E0B" },
        { name: "Laranja", value: "#F97316" },
        { name: "Roxo", value: "#8B5CF6" },
        { name: "Roxo Escuro", value: "#7C3AED" },
        { name: "Rosa", value: "#EC4899" },
        { name: "Rosa Escuro", value: "#DB2777" },
        { name: "Cinza", value: "#6B7280" },
        { name: "Cinza Escuro", value: "#374151" },
        { name: "Teal", value: "#14B8A6" },
        { name: "Indigo", value: "#6366F1" },
        { name: "Emerald", value: "#10B981" },
        { name: "Pink", value: "#F472B6" },
        { name: "Violet", value: "#A78BFA" },
        { name: "Cyan", value: "#06B6D4" }
    ]

    const handleColorSelect = (color: string) => {
        setFormData(prev => ({ ...prev, cor: color }))
        setShowCustomColor(false)
    }

    const handleCustomColorChange = (color: string) => {
        setFormData(prev => ({ ...prev, cor: color }))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Credencial
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Criar Nova Credencial</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="nome">Nome da Credencial</Label>
                        <Input
                            id="nome"
                            value={formData.nome}
                            onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                            placeholder="Digite o nome da credencial"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="cor">Cor da Credencial</Label>

                        {/* Cor atual selecionada */}
                        <div className="flex items-center gap-3 mt-2 p-3 border rounded-lg bg-gray-50">
                            <div
                                className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                                style={{ backgroundColor: formData.cor }}
                            />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                    Cor Selecionada
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    {formData.cor}
                                </div>
                            </div>
                        </div>

                        {/* Paleta de cores predefinidas */}
                        <div className="mt-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Palette className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Cores Predefinidas</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {predefinedColors.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => handleColorSelect(color.value)}
                                        className={`
                                            w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110
                                            ${formData.cor === color.value
                                                ? 'border-gray-800 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-400'
                                            }
                                        `}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Cor personalizada */}
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="customColor"
                                    checked={showCustomColor}
                                    onChange={(e) => setShowCustomColor(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <Label htmlFor="customColor" className="text-sm font-medium text-gray-700">
                                    Cor Personalizada
                                </Label>
                            </div>

                            {showCustomColor && (
                                <div className="space-y-3">
                                    <HexColorPicker
                                        color={formData.cor}
                                        onChange={handleCustomColorChange}
                                        className="w-full"
                                    />
                                    <Input
                                        type="text"
                                        value={formData.cor}
                                        onChange={(e) => handleCustomColorChange(e.target.value)}
                                        placeholder="#000000"
                                        className="flex-1 text-sm font-mono"
                                        pattern="^#[0-9A-Fa-f]{6}$"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            onClick={() => setOpen(false)}
                            variant="outline"
                            className="flex-1"
                            disabled={isCreating}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isCreating || !formData.nome.trim()}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Credencial
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default CreateCredentialDialog 