"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CreateCredentialDialog from "./create-credential-dialog"
import { useCreateCredentialSimple } from "../hooks/use-create-credential-simple"
import { toast } from "sonner"
import { Palette, Plus, Loader2 } from "lucide-react"

interface CreateCredentialExampleProps {
    eventId: string
}

const CreateCredentialExample = ({ eventId }: CreateCredentialExampleProps) => {
    const [credentialName, setCredentialName] = useState("")
    const [selectedColor, setSelectedColor] = useState("#3B82F6")
    const { createCredentialSimple, isCreating } = useCreateCredentialSimple({
        eventId,
        onSuccess: (credentialId) => {
            toast.success(`Credencial criada com ID: ${credentialId}`)
        }
    })

    const predefinedColors = [
        { name: "Azul", value: "#3B82F6" },
        { name: "Verde", value: "#10B981" },
        { name: "Vermelho", value: "#EF4444" },
        { name: "Amarelo", value: "#F59E0B" },
        { name: "Roxo", value: "#8B5CF6" },
        { name: "Rosa", value: "#EC4899" },
        { name: "Laranja", value: "#F97316" },
        { name: "Cinza", value: "#6B7280" }
    ]

    const handleCreateWithHook = async () => {
        if (!credentialName.trim()) {
            toast.error("Digite um nome para a credencial")
            return
        }

        const credentialId = await createCredentialSimple(credentialName, selectedColor)
        if (credentialId) {
            setCredentialName("")
            setSelectedColor("#3B82F6")
        }
    }

    const handleBatchCreate = async () => {
        const colors = ["#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6"]
        const names = ["VIP", "STAFF", "PRESS", "SPONSOR", "GUEST"]

        for (let i = 0; i < names.length; i++) {
            await createCredentialSimple(names[i], colors[i])
            // Pequeno delay entre criações
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Exemplos de Criação de Credenciais
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Exemplo 1: Dialog com cores personalizadas */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">1. Dialog com Cores Personalizadas</h3>
                        <p className="text-sm text-gray-600">
                            Use o dialog para criar credenciais com cores personalizadas através da interface visual.
                        </p>
                        <CreateCredentialDialog 
                            eventId={eventId}
                            credentialName="CREDENCIAL-EXEMPLO"
                            onSuccess={(credentialId) => {
                                toast.success(`Credencial criada via dialog: ${credentialId}`)
                            }}
                            trigger={
                                <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar via Dialog
                                </Button>
                            }
                        />
                    </div>

                    {/* Exemplo 2: Hook com cores personalizadas */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">2. Hook com Cores Personalizadas</h3>
                        <p className="text-sm text-gray-600">
                            Use o hook para criar credenciais programaticamente com cores específicas.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="credentialName">Nome da Credencial</Label>
                                <Input
                                    id="credentialName"
                                    value={credentialName}
                                    onChange={(e) => setCredentialName(e.target.value)}
                                    placeholder="Digite o nome da credencial"
                                    className="mt-1"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="colorSelect">Cor da Credencial</Label>
                                <Select value={selectedColor} onValueChange={setSelectedColor}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Selecione uma cor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {predefinedColors.map((color) => (
                                            <SelectItem key={color.value} value={color.value}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: color.value }}
                                                    />
                                                    {color.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreateWithHook}
                                disabled={isCreating || !credentialName.trim()}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Criando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar via Hook
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Exemplo 3: Criação em lote */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">3. Criação em Lote</h3>
                        <p className="text-sm text-gray-600">
                            Crie múltiplas credenciais com cores diferentes de uma vez.
                        </p>
                        <Button
                            onClick={handleBatchCreate}
                            disabled={isCreating}
                            variant="outline"
                            className="text-purple-700 border-purple-300 hover:bg-purple-50"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Criando em Lote...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar 5 Credenciais
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Paleta de cores disponíveis */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Paleta de Cores Disponíveis</h3>
                        <p className="text-sm text-gray-600">
                            Cores predefinidas que podem ser usadas nas credenciais.
                        </p>
                        <div className="grid grid-cols-8 gap-2">
                            {predefinedColors.map((color) => (
                                <div key={color.value} className="text-center">
                                    <div
                                        className="w-8 h-8 rounded-full border-2 border-gray-300 mx-auto mb-1"
                                        style={{ backgroundColor: color.value }}
                                    />
                                    <span className="text-xs text-gray-600">{color.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default CreateCredentialExample 