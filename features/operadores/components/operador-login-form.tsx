"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { operatorLoginSchema, OperatorLoginSchema } from "@/features/operadores/schemas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle } from "lucide-react"
import { useOperatorLogin } from "@/features/operadores/api/query/use-operador-login"
import { Operator } from "@/features/operadores/types"

const formatCpf = (value: string): string => {
    let cpf = value.replace(/\D/g, "")
    cpf = cpf.slice(0, 11)
    if (cpf.length <= 3) return cpf
    if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
    if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
}

const onlyNumbers = (value: string): string => value.replace(/\D/g, "")

const OperadorLoginForm = ({ onSuccess }: { onSuccess: (operator: Operator) => void }) => {
    const [error, setError] = useState("")
    const [enabled, setEnabled] = useState(false)
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
        watch,
    } = useForm<OperatorLoginSchema>({
        resolver: zodResolver(operatorLoginSchema),
    })

    const cpf = watch("cpf") || ""
    const cpfFormatado = formatCpf(cpf)
    const podeBuscar = onlyNumbers(cpfFormatado).length === 11 && enabled

    // Aqui, passamos o CPF formatado para a query
    const { data: operator, isLoading } = useOperatorLogin(cpfFormatado, podeBuscar)

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCpf(e.target.value)
        setValue("cpf", formatted)
    }

    const onSubmit = async (values: OperatorLoginSchema) => {
        setError("")
        const cpfFormatadoSubmit = formatCpf(values.cpf || "")
        if (onlyNumbers(cpfFormatadoSubmit).length !== 11) {
            setError("CPF inválido")
            setEnabled(false)
            return
        }
        setValue("cpf", cpfFormatadoSubmit)
        setEnabled(true)
    }

    useEffect(() => {
        if (!enabled) return
        if (isLoading) return
        if (!cpfFormatado || onlyNumbers(cpfFormatado).length !== 11) return

        if (!operator) {
            setError("Operador não encontrado")
            setEnabled(false)
            return
        }
        const senhaForm = watch("senha")
        if (operator.senha !== senhaForm) {
            setError("Senha incorreta")
            setEnabled(false)
            return
        }
        setEnabled(false)
        onSuccess(operator)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operator, isLoading, enabled])

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-sm mx-auto">
            <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">CPF</label>
                <Input
                    id="cpf"
                    {...register("cpf")}
                    placeholder="Digite seu CPF"
                    autoComplete="username"
                    maxLength={14}
                    value={cpfFormatado}
                    onChange={handleCpfChange}
                />
                {errors.cpf && <span className="text-xs text-red-600">{errors.cpf.message}</span>}
            </div>
            <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700">Senha</label>
                <Input id="senha" type="password" {...register("senha")} placeholder="Digite sua senha" autoComplete="current-password" />
                {errors.senha && <span className="text-xs text-red-600">{errors.senha.message}</span>}
            </div>
            {error && (
                <Alert className="border-red-200 bg-red-500">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
            )}
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                {isLoading ? "Verificando..." : <><Lock className="h-4 w-4 mr-2" />Entrar</>}
            </Button>
        </form>
    )
}

export default OperadorLoginForm 