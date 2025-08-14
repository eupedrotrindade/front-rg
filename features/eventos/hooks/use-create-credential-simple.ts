import { useState } from "react";
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations";
import { CreateCredentialRequest } from "@/features/eventos/types";
import { toast } from "sonner";

interface UseCreateCredentialSimpleProps {
  eventId: string;
  onSuccess?: (credentialId: string) => void;
}

export const useCreateCredentialSimple = ({
  eventId,
  onSuccess,
}: UseCreateCredentialSimpleProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { mutate: createCredential } = useCreateCredential();

  const createCredentialSimple = async (
    credentialName: string,
    color: string = "#3B82F6",
    daysWorks: string[] = []
  ) => {
    if (!credentialName.trim()) {
      toast.error("Nome da credencial é obrigatório");
      return null;
    }

    setIsCreating(true);

    // Garantir que sempre tenha pelo menos uma data
    const finalDaysWorks =
      daysWorks.length > 0
        ? daysWorks
        : [new Date().toLocaleDateString("pt-BR")]; // Data atual como fallback

    const credentialData: CreateCredentialRequest = {
      nome: credentialName.trim().toUpperCase(),
      cor: color,
      id_events: eventId,
      days_works: finalDaysWorks,
      // Propriedades obrigatórias do shift - usando valores padrão
      shiftId: finalDaysWorks[0] || `${new Date().toISOString().split('T')[0]}-evento-diurno`,
      workDate: new Date().toISOString().split('T')[0],
      workStage: 'evento' as const,
      workPeriod: 'diurno' as const,
      isActive: true,
      isDistributed: false,
    };

    return new Promise<string | null>((resolve) => {
      createCredential(credentialData, {
        onSuccess: (data) => {
          toast.success("Credencial criada com sucesso!");
          onSuccess?.(data.id);
          resolve(data.id);
        },
        onError: (error) => {
          console.error("Erro ao criar credencial:", error);
          toast.error("Erro ao criar credencial");
          resolve(null);
        },
        onSettled: () => {
          setIsCreating(false);
        },
      });
    });
  };

  return {
    createCredentialSimple,
    isCreating,
  };
};
