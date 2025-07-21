"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, LogOut, Edit2, ArrowLeftRight } from "lucide-react";
import useOperatorStorage from "./use-operator-storage";

type OperatorPageSection = "home" | "edit-profile";

const OperatorPage = () => {
    const router = useRouter();
    const operator = useOperatorStorage();
    const [section, setSection] = useState<OperatorPageSection>("home");
    const [editName, setEditName] = useState("");
    const [isSaving, setIsSaving] = useState(false);



    useEffect(() => {
        if (operator && section === "edit-profile") {
            setEditName(operator.nome);
        }
    }, [operator, section]);

    const handleLogout = () => {
        localStorage.removeItem("operador");
        router.replace("/");
    };

    const handleSaveName = () => {
        if (!operator) return;
        setIsSaving(true);
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
        const updatedOperator = { ...operator, nome: editName, acoes: Array.isArray(operator.acoes) ? operator.acoes : acoesAntigas };
        localStorage.setItem("operador", JSON.stringify(updatedOperator));
        setIsSaving(false);
        setSection("home");
    };

    if (!operator) {

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br bg-purple-400 px-4 py-12">
                <Card className="w-full bg-white max-w-md shadow-lg">
                    <CardHeader className="flex flex-col items-center">
                        <User className="h-12 w-12 text-pink-600 mb-2" />
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                            Nenhum operador logado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <p className="text-center text-gray-700">
                            Para acessar funcionalidades de operador, faça login.<br />
                            Você pode navegar normalmente pelo sistema.
                        </p>
                        <Button
                            className="w-full bg-pink-600 hover:bg-pink-700"
                            size="lg"
                            onClick={() => router.push("/operador/login")}
                        >
                            Ir para o login
                        </Button>
                        <Button
                            className="w-full bg-pink-600"
                            size="lg"
                            variant="ghost"
                            onClick={() => router.push("/")}
                        >
                            Voltar para o início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br bg-purple-400 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg bg-white">
                <CardHeader className="flex flex-col items-center">
                    <User className="h-12 w-12 text-pink-600 mb-2" />
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                        Painel do Operador
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    {section === "home" && (
                        <>
                            <div className="w-full text-center mb-6">
                                <p className="text-lg text-gray-700 font-semibold">
                                    Olá, {operator.nome}
                                </p>
                                <p className="text-sm text-gray-500">CPF: {operator.cpf}</p>
                            </div>
                            <div className="flex flex-col gap-3 w-full mb-4">
                                <Button
                                    className="w-full bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
                                    size="lg"
                                    onClick={() => setSection("edit-profile")}
                                    variant="outline"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Alterar nome
                                </Button>
                                <Button
                                    className="w-full bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
                                    size="lg"
                                    onClick={handleLogout}
                                    variant="destructive"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair
                                </Button>
                                <Button
                                    className="w-full bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
                                    size="lg"
                                    onClick={() => router.push("/operador/eventos")}
                                    variant="secondary"
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                    Ir para eventos
                                </Button>
                            </div>
                            <Button
                                className="w-full bg-pink-600 hover:bg-pink-700"
                                size="lg"
                                variant="secondary"
                                onClick={() => router.push("/")}
                            >
                                Voltar para o início
                            </Button>
                        </>
                    )}
                    {section === "edit-profile" && (
                        <form
                            className="w-full flex flex-col items-center gap-4"
                            onSubmit={e => {
                                e.preventDefault();
                                handleSaveName();
                            }}
                        >
                            <div className="w-full text-center mb-2">
                                <p className="text-lg text-gray-700 font-semibold mb-2">
                                    Alterar nome do operador
                                </p>
                                <Input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full"
                                    placeholder="Novo nome"
                                    required
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex gap-2 w-full">
                                <Button
                                    type="submit"
                                    className="w-full bg-pink-600 hover:bg-pink-700"
                                    size="lg"
                                    disabled={isSaving || !editName.trim()}
                                >
                                    Salvar
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full"
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
    );
};

export default OperatorPage;
