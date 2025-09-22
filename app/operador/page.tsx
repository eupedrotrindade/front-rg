"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, LogOut, Edit2, ArrowLeftRight } from "lucide-react"
import useOperatorStorage from "./use-operator-storage"

type OperatorPageSection = "home" | "edit-profile"

const OperatorPage = () => {
    const router = useRouter()
    const operator = useOperatorStorage()
    const [section, setSection] = useState<OperatorPageSection>("home")
    const [editName, setEditName] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (operator && section === "edit-profile") {
            setEditName(operator.nome)
        }
    }, [operator, section])

    // Definir título da página
    useEffect(() => {
        document.title = "Operador - Painel Administrativo"
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("operador")
        router.replace("/")
    }

    const handleSaveName = () => {
        if (!operator) return
        setIsSaving(true)
        const operadorRaw = localStorage.getItem("operador")
        let acoesAntigas = []
        if (operadorRaw) {
            try {
                const operadorAntigo = JSON.parse(operadorRaw)
                if (Array.isArray(operadorAntigo.acoes)) {
                    acoesAntigas = operadorAntigo.acoes
                }
            } catch { }
        }
        const updatedOperator = {
            ...operator,
            nome: editName,
            acoes: Array.isArray(operator.acoes) ? operator.acoes : acoesAntigas,
        }
        localStorage.setItem("operador", JSON.stringify(updatedOperator))
        setIsSaving(false)
        setSection("home")
    }

    if (!operator) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
                <Card className="w-full bg-white max-w-md shadow-xl border-0">
                    <CardHeader className="flex flex-col items-center pb-4">
                        <div className="bg-pink-100 p-4 rounded-full mb-4">
                            <User className="h-12 w-12 text-pink-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900 text-center">Nenhum operador logado</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4 pt-0">
                        <p className="text-center text-gray-600 leading-relaxed">
                            Para acessar funcionalidades de operador, faça login.
                            <br />
                            Você pode navegar normalmente pelo sistema.
                        </p>
                        <Button
                            className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                            size="lg"
                            onClick={() => router.push("/operador/login")}
                        >
                            Ir para o login
                        </Button>
                        <Button
                            className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                            size="lg"
                            variant="ghost"
                            onClick={() => router.push("/")}
                        >
                            Voltar para o início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
            <Card className="w-full max-w-md shadow-xl bg-white border-0">
                <CardHeader className="flex flex-col items-center pb-4">
                    <div className="bg-pink-100 p-4 rounded-full mb-4">
                        <User className="h-12 w-12 text-pink-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 text-center">Painel do Operador</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-0">
                    {section === "home" && (
                        <>
                            <div className="w-full text-center mb-8">
                                <p className="text-lg text-gray-900 font-semibold">Olá, {operator.nome}</p>
                                <p className="text-sm text-gray-500 mt-1">CPF: {operator.cpf}</p>
                            </div>
                            <div className="flex flex-col gap-3 w-full mb-6">
                                <Button
                                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 flex items-center gap-2 font-semibold py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                    size="lg"
                                    onClick={() => setSection("edit-profile")}
                                    variant="outline"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Alterar nome
                                </Button>
                                <Button
                                    className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                                    size="lg"
                                    onClick={() => router.push("/operador/eventos")}
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                    Ir para eventos
                                </Button>
                                <Button
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                                    size="lg"
                                    onClick={handleLogout}
                                    variant="destructive"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair
                                </Button>
                            </div>
                            <Button
                                className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium"
                                size="lg"
                                variant="ghost"
                                onClick={() => router.push("/")}
                            >
                                Voltar para o início
                            </Button>
                        </>
                    )}
                    {section === "edit-profile" && (
                        <form
                            className="w-full flex flex-col items-center gap-6"
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSaveName()
                            }}
                        >
                            <div className="w-full text-center">
                                <p className="text-lg text-gray-900 font-semibold mb-4">Alterar nome do operador</p>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                                    placeholder="Novo nome"
                                    required
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex gap-3 w-full">
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                                    size="lg"
                                    disabled={isSaving || !editName.trim()}
                                >
                                    {isSaving ? "Salvando..." : "Salvar"}
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-semibold py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setSection("home")}
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default OperatorPage
