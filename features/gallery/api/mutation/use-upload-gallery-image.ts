import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_API_URL = process.env.NEXT_PUBLIC_SUPABASE_API_URL;
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const uploadGalleryImage = async (file: File) => {
  // ✅ VALIDAÇÃO: Garantir que variáveis estão definidas
  if (!SUPABASE_API_URL || !SUPABASE_BUCKET || !SUPABASE_KEY) {
    throw new Error(
      "Variáveis de ambiente do Supabase não configuradas. Verifique NEXT_PUBLIC_SUPABASE_API_URL, NEXT_PUBLIC_SUPABASE_BUCKET e NEXT_PUBLIC_SUPABASE_KEY"
    );
  }

  // ✅ CORRIGIDO: Usar Supabase SDK ao invés de axios direto
  // O SDK gerencia corretamente o upload e evita duplicação de dados
  const supabase = createClient(SUPABASE_API_URL, SUPABASE_KEY);

  // Gerar nome único para evitar conflitos
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${file.name}`;

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(uniqueFileName, file, {
      cacheControl: "3600",
      upsert: false, // Não sobrescrever arquivos existentes
    });

  if (error) {
    throw new Error(`Erro no upload: ${error.message}`);
  }

  return data;
};

export const useUploadGalleryImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadGalleryImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
    },
  });
};
