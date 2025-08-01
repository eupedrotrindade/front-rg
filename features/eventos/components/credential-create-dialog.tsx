"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations";
import { CreateCredentialRequest, UpdateCredentialRequest } from "@/features/eventos/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CredentialForm } from "./credential-form";

interface CredentialCreateDialogProps {
  children: React.ReactNode;
}

export const CredentialCreateDialog = ({ children }: CredentialCreateDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const eventId = params.id as string;
  const createCredential = useCreateCredential();

  const handleSubmit = async (data: CreateCredentialRequest | UpdateCredentialRequest) => {
    try {
      console.log("🚀 Tentando criar credencial:", data);
      await createCredential.mutateAsync(data as CreateCredentialRequest);
      console.log("✅ Credencial criada com sucesso!");
      setIsOpen(false);
    } catch (error) {
      console.error("❌ Erro ao criar credencial:", error);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-gray-700 bg-white">
        <DialogHeader>
          <DialogTitle>Nova Credencial</DialogTitle>
          <DialogDescription>
            Crie uma nova credencial para o evento
          </DialogDescription>
        </DialogHeader>

        <CredentialForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createCredential.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}; 