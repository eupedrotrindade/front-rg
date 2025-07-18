"use client"

import { useRouter } from "next/navigation"
import OperadorLoginForm from "@/features/operadores/components/operador-login-form"
import { Operator } from "@/features/operadores/types"

const OperadorLoginPage = () => {
    const router = useRouter()

    const handleSuccess = (operator: Operator) => {
        const operadorRaw = localStorage.getItem("operador");
        let acoesAntigas = [];
        if (operadorRaw) {
            try {
                const operadorAntigo = JSON.parse(operadorRaw);
                if (Array.isArray(operadorAntigo.acoes)) {
                    acoesAntigas = operadorAntigo.acoes;
                }
            } catch { }
        }
        const operadorParaSalvar = { ...operator };
        if (!Array.isArray(operator.acoes) && acoesAntigas.length > 0) {
            operadorParaSalvar.acoes = acoesAntigas;
        }
        localStorage.setItem("operador", JSON.stringify(operadorParaSalvar));
        router.push("/operador/eventos");
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br bg-purple-400">
            <div className="w-full max-w-md bg-zinc-700 rounded-lg shadow-lg p-8">
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Login do Operador</h1>
                <OperadorLoginForm onSuccess={handleSuccess} />
            </div>
        </div>
    )
}

export default OperadorLoginPage 