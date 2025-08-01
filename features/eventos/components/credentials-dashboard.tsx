"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useCredentials } from "@/features/eventos/api/query/use-credentials";
import { useDeleteCredential, useSetCredentialActive } from "@/features/eventos/api/mutation/use-credential-mutations";
import { Credential } from "@/features/eventos/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { CredentialCreateDialog } from "./credential-create-dialog";

interface CredentialsDashboardProps {
  onOpenCreateDialog: () => void;
  onOpenEditDialog: (credential: Credential) => void;
}

export const CredentialsDashboard = ({
  onOpenCreateDialog,
  onOpenEditDialog,
}: CredentialsDashboardProps) => {
  const params = useParams();
  const eventId = params.id as string;
  const [searchTerm, setSearchTerm] = useState("");

  const { data: credentials = [], isLoading, error } = useCredentials({
    eventId,
    search: searchTerm || undefined,
  });

  const deleteCredential = useDeleteCredential();
  const setCredentialActive = useSetCredentialActive();

  const handleDelete = async (credential: Credential) => {
    try {
      await deleteCredential.mutateAsync({
        id: credential.id,
        performedBy: "system", // TODO: Pegar do usuário logado
      });
    } catch (error) {
      console.error("Erro ao deletar credencial:", error);
    }
  };

  const handleToggleActive = async (credential: Credential) => {
    try {
      await setCredentialActive.mutateAsync({
        id: credential.id,
        isActive: !credential.isActive,
        performedBy: "system", // TODO: Pegar do usuário logado
      });
    } catch (error) {
      console.error("Erro ao alterar status da credencial:", error);
    }
  };

  const filteredCredentials = credentials.filter((credential) =>
    credential.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credential.cor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Credenciais</h2>
          {/* Diálogo de criação */}
          <CredentialCreateDialog>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nova Credencial
            </Button>
          </CredentialCreateDialog>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar credenciais</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div></div>
        {/* Diálogo de criação */}
        <CredentialCreateDialog>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nova Credencial
          </Button>
        </CredentialCreateDialog>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Buscar credenciais..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredCredentials.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhuma credencial encontrada</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCredentials.map((credential) => (
            <Card key={credential.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{credential.nome}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={credential.isActive}
                      onCheckedChange={() => handleToggleActive(credential)}
                    />
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenEditDialog(credential)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar a credencial &quot;{credential.nome}&quot;?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(credential)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: credential.cor }}
                    />
                    <span>{credential.cor}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Dias de Trabalho:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {credential.days_works.map((day, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      Status:{" "}
                      <Badge variant={credential.isActive ? "default" : "secondary"}>
                        {credential.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </span>
                    <span>
                      Distribuição:{" "}
                      <Badge variant={credential.isDistributed ? "default" : "secondary"}>
                        {credential.isDistributed ? "Distribuída" : "Não distribuída"}
                      </Badge>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 