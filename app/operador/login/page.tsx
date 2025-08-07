"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import OperadorLoginForm from "@/features/operadores/components/operador-login-form"
import type { Operator } from "@/features/operadores/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"
import Image from "next/image"

const OperadorLoginPage = () => {
    const router = useRouter()

    // Sistema de sincronização em tempo real
    useEffect(() => {
        const handleOperadorUpdated = () => {
            console.log("🔄 Operador atualizado durante login - redirecionando...")
            router.push("/operador/eventos")
        }

        window.addEventListener("operador-updated", handleOperadorUpdated)

        return () => {
            window.removeEventListener("operador-updated", handleOperadorUpdated)
        }
    }, [router])

    const handleSuccess = (operator: Operator) => {
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
        const operadorParaSalvar = { ...operator }
        if (!Array.isArray(operator.acoes) && acoesAntigas.length > 0) {
            operadorParaSalvar.acoes = acoesAntigas
        }
        localStorage.setItem("operador", JSON.stringify(operadorParaSalvar))

        // Disparar evento customizado para notificar outras partes do sistema
        window.dispatchEvent(new CustomEvent("operador-updated", { detail: operadorParaSalvar }))

        router.push("/operador/eventos")
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="text-center">
                        <Image
                            src="/images/logo-rg-fone.png"
                            alt="Logo RG"
                            className="mx-auto mb-4 h-16 w-auto drop-shadow-lg"
                            width={160}
                            height={64}
                        />
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 drop-shadow-md">
                            Credenciamento RG Produções
                        </h1>
                        <p className="text-lg text-gray-600 drop-shadow-sm">Entrada do Operador</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
                <Card className="w-full max-w-md shadow-xl bg-white border-0">
                    <CardHeader className="flex flex-col items-center pb-4">
                        <div className="bg-pink-100 p-4 rounded-full mb-4">
                            <User className="h-12 w-12 text-pink-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900 text-center">Entrada do Operador</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <OperadorLoginForm onSuccess={handleSuccess} />
                    </CardContent>
                </Card>
            </main>

            {/* Footer */}
            <footer className="bg-white backdrop-blur-sm border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <Image
                            src="/images/slogan-rg.png"
                            width={160}
                            height={48}
                            alt="Se tem RG, é sucesso!"
                            className="mx-auto h-12 w-auto opacity-90 drop-shadow-sm"
                        />
                        <p className="text-sm text-gray-600 mt-4">© 2024 RG Produções e Eventos. Todos os direitos reservados.</p>
                        <p className="text-xs text-gray-500 mt-2">Se tem RG, é sucesso!</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default OperadorLoginPage
