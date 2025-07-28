"use client";
import { useState } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
export const radioStatusEnum = [
    "disponivel",
    "retirado",
    "manutencao",
] as const;
export const radioCreateSchema = z.object({
    codes: z.array(z.string()).min(1, "Informe pelo menos um código de rádio"),
    status: z.enum(radioStatusEnum),
    last_retirada_id: z.string().uuid().nullable().optional(),
    event_id: z.string().uuid().nullable().optional(),
    nome_radio: z.string().min(1, "Informe o nome/empresa"), // substitui "nome"
    contato: z.string().optional(), // mantém contato opcional
});

type RadioCreateForm = z.infer<typeof radioCreateSchema>;

interface ModalRetiradaProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onAddRetirada: (payload: RadioCreateForm) => void;
}

export default function ModalRetirada({
    isOpen,
    setIsOpen,
    onAddRetirada,
}: ModalRetiradaProps) {
    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<RadioCreateForm>({
        resolver: zodResolver(radioCreateSchema),
        defaultValues: {
            status: "retirado",
            event_id: "",
            last_retirada_id: "",
            codes: [],
            nome_radio: "",
            contato: "",
        },
    });

    const [codeInput, setCodeInput] = useState("");

    const addCode = () => {
        const value = codeInput.trim();
        if (
            value &&
            !getValues("codes").includes(value)
        ) {
            setValue("codes", [...getValues("codes"), value]);
        }
        setCodeInput("");
    };

    const removeCode = (code: string) => {
        setValue(
            "codes",
            getValues("codes").filter((c: string) => c !== code)
        );
    };

    const handleCodeInputKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (
            (e.key === "Enter" || e.key === " " || e.key === ",") &&
            codeInput.trim()
        ) {
            e.preventDefault();
            addCode();
        }
    };

    const onSubmit = (data: RadioCreateForm) => {
        onAddRetirada({
            ...data,
            last_retirada_id:
                typeof data.last_retirada_id === "string" && data.last_retirada_id.trim().length > 0
                    ? data.last_retirada_id.trim()
                    : undefined,
        });
        reset();
        setCodeInput("");
        setIsOpen(false);
        toast.success("Retirada registrada com sucesso!");
    };

    const handleCancel = () => {
        reset();
        setCodeInput("");
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50">
            <div className={cn(
                "bg-white dark:bg-zinc-900 p-6 rounded-lg flex flex-col gap-4 w-[95vw] max-w-[600px] shadow-xl"
            )}>
                <h2 className="text-2xl font-bold text-[#6f0a5e] dark:text-[#e0aaff]">
                    Nova Retirada de Rádio
                </h2>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-4"
                    autoComplete="off"
                >
                    <div>
                        <label
                            className="text-[#6f0a5e] dark:text-[#e0aaff] font-medium"
                            htmlFor="nome_radio"
                        >
                            Nome/Empresa *
                        </label>
                        <input
                            {...register("nome_radio")}
                            className={cn(
                                "border border-[#6f0a5e] dark:border-[#e0aaff] bg-white dark:bg-zinc-800 rounded-md p-3 text-[#22223b] dark:text-white w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] dark:focus:ring-[#e0aaff] placeholder:text-gray-400 dark:placeholder:text-zinc-400",
                                errors.nome_radio && "border-red-500"
                            )}
                            type="text"
                            id="nome_radio"
                            placeholder="Digite o nome da empresa"
                            autoFocus
                        />
                        {errors.nome_radio && (
                            <span className="text-red-500 text-xs">{errors.nome_radio.message}</span>
                        )}
                    </div>
                    <div>
                        <label
                            className="text-[#6f0a5e] dark:text-[#e0aaff] font-medium"
                            htmlFor="contato"
                        >
                            Contato (Opcional)
                        </label>
                        <input
                            {...register("contato")}
                            className="border border-[#6f0a5e] dark:border-[#e0aaff] bg-white dark:bg-zinc-800 rounded-md p-3 text-[#22223b] dark:text-white w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] dark:focus:ring-[#e0aaff] placeholder:text-gray-400 dark:placeholder:text-zinc-400"
                            type="text"
                            id="contato"
                            placeholder="Telefone, email, etc"
                        />
                    </div>
                    <div>
                        <label
                            className="text-[#6f0a5e] dark:text-[#e0aaff] font-medium"
                            htmlFor="codes"
                        >
                            Número dos Rádios *
                        </label>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    className={cn(
                                        "border border-[#6f0a5e] dark:border-[#e0aaff] bg-white dark:bg-zinc-800 rounded-md p-3 text-[#22223b] dark:text-white w-full focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] dark:focus:ring-[#e0aaff] placeholder:text-gray-400 dark:placeholder:text-zinc-400",
                                        errors.codes && "border-red-500"
                                    )}
                                    type="text"
                                    id="codes"
                                    name="codes"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.target.value)}
                                    onKeyDown={handleCodeInputKeyDown}
                                    placeholder="Digite o número e pressione Enter, Espaço ou vírgula"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    className="bg-[#6f0a5e] dark:bg-[#e0aaff] text-white dark:text-[#6f0a5e] px-4 py-2 rounded-md hover:bg-[#58084b] dark:hover:bg-[#b983ff] transition-all shadow-sm border border-[#6f0a5e] dark:border-[#e0aaff]"
                                    onClick={addCode}
                                    tabIndex={-1}
                                >
                                    Adicionar
                                </button>
                            </div>
                            <Controller
                                control={control}
                                name="codes"
                                render={({ field }) => (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {field.value.map((code: string) => (
                                            <span
                                                key={code}
                                                className="bg-white dark:bg-zinc-800 text-[#6f0a5e] dark:text-[#e0aaff] px-3 py-1 rounded-full flex items-center gap-1 text-sm border border-[#6f0a5e] dark:border-[#e0aaff] shadow-sm"
                                            >
                                                {code}
                                                <button
                                                    type="button"
                                                    className="ml-1 text-[#6f0a5e] dark:text-[#e0aaff] hover:text-red-500 font-bold"
                                                    onClick={() => removeCode(code)}
                                                    aria-label={`Remover ${code}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Digite o número e pressione Enter, Espaço, vírgula ou clique em Adicionar. Clique no &quot;×&quot; para remover.
                        </p>
                        {errors.codes && (
                            <span className="text-red-500 text-xs">{errors.codes.message as string}</span>
                        )}
                    </div>
                    <div>
                        <label
                            className="text-[#6f0a5e] dark:text-[#e0aaff] font-medium"
                            htmlFor="status"
                        >
                            Status *
                        </label>
                        <select
                            {...register("status")}
                            className={cn(
                                "border border-[#6f0a5e] dark:border-[#e0aaff] bg-white dark:bg-zinc-800 rounded-md p-3 text-[#22223b] dark:text-white w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] dark:focus:ring-[#e0aaff]",
                                errors.status && "border-red-500"
                            )}
                            id="status"
                            required
                        >
                            <option value="retirado">Retirado</option>
                            <option value="disponivel">Disponível</option>
                            <option value="manutencao">Manutenção</option>
                        </select>
                        {errors.status && (
                            <span className="text-red-500 text-xs">{errors.status.message}</span>
                        )}
                    </div>
                    <div>
                        <label
                            className="text-[#6f0a5e] dark:text-[#e0aaff] font-medium"
                            htmlFor="event_id"
                        >
                            Evento *
                        </label>
                        <input
                            {...register("event_id")}
                            className={cn(
                                "border border-[#6f0a5e] dark:border-[#e0aaff] bg-white dark:bg-zinc-800 rounded-md p-3 text-[#22223b] dark:text-white w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] dark:focus:ring-[#e0aaff] placeholder:text-gray-400 dark:placeholder:text-zinc-400",
                                errors.event_id && "border-red-500"
                            )}
                            type="text"
                            id="event_id"
                            placeholder="ID do evento"
                        />
                        {errors.event_id && (
                            <span className="text-red-500 text-xs">{errors.event_id.message}</span>
                        )}
                    </div>
                    <div>
                        <label
                            className="text-[#6f0a5e] dark:text-[#e0aaff] font-medium"
                            htmlFor="last_retirada_id"
                        >
                            Última Retirada (opcional)
                        </label>
                        <input
                            {...register("last_retirada_id")}
                            className={cn(
                                "border border-[#6f0a5e] dark:border-[#e0aaff] bg-white dark:bg-zinc-800 rounded-md p-3 text-[#22223b] dark:text-white w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] dark:focus:ring-[#e0aaff] placeholder:text-gray-400 dark:placeholder:text-zinc-400",
                                errors.last_retirada_id && "border-red-500"
                            )}
                            type="text"
                            id="last_retirada_id"
                            placeholder="UUID da última retirada"
                        />
                        {errors.last_retirada_id && (
                            <span className="text-red-500 text-xs">{errors.last_retirada_id.message as string}</span>
                        )}
                    </div>
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={handleCancel}
                            className="cursor-pointer bg-[#6f0a5e] dark:bg-[#e0aaff] text-white dark:text-[#6f0a5e] px-4 py-3 rounded-md w-[50%] hover:bg-[#58084b] dark:hover:bg-[#b983ff] transition-all border border-[#6f0a5e] dark:border-[#e0aaff]"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            className="cursor-pointer bg-[#6f0a5e] dark:bg-[#e0aaff] text-white dark:text-[#6f0a5e] px-4 py-3 rounded-md w-[50%] hover:bg-[#58084b] dark:hover:bg-[#b983ff] transition-all border border-[#6f0a5e] dark:border-[#e0aaff]"
                            type="submit"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}