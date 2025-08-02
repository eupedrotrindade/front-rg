"use client";

import { useState } from "react";
import { useUpdateCredential } from "@/features/eventos/api/mutation/use-credential-mutations";
import { Credential, UpdateCredentialRequest } from "@/features/eventos/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { CredentialForm } from "./credential-form";

interface CredentialEditDialogProps {
  credential: Credential;
}

export const CredentialEditDialog = ({ credential }: CredentialEditDialogProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const updateCredential = useUpdateCredential();

  const handleSubmit = async (data: UpdateCredentialRequest) => {
    try {
      await updateCredential.mutateAsync({
        id: credential.id,
        data,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar credencial:", error);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Credencial</DialogTitle>
          <DialogDescription>
            Edite os detalhes da credencial &quot;{credential.nome}&quot;
          </DialogDescription>
        </DialogHeader>
        <CredentialForm
          credential={credential}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={updateCredential.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}; 