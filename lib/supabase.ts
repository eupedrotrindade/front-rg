import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para upload de imagem de banner
export const uploadEventBanner = async (
  file: File,
  eventId?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = eventId
      ? `event-${eventId}-banner-${timestamp}.${fileExtension}`
      : `event-banner-${timestamp}-${randomString}.${fileExtension}`;

    // Upload do arquivo para o bucket 'galeria'
    const { data, error } = await supabase.storage
      .from("galeria")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload:", error);
      throw error;
    }

    // Obter URL pública da imagem
    const {
      data: { publicUrl },
    } = supabase.storage.from("galeria").getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error("Erro ao fazer upload da imagem:", error);
    return null;
  }
};

// Função para deletar banner anterior
export const deleteEventBanner = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from("galeria").remove([path]);

    if (error) {
      console.error("Erro ao deletar imagem:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao deletar banner:", error);
    return false;
  }
};

// Função para listar imagens de banner disponíveis
export const listEventBanners = async (): Promise<
  Array<{ name: string; url: string; size: number; createdAt: string }>
> => {
  try {
    const { data, error } = await supabase.storage.from("galeria").list("", {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("Erro ao listar imagens:", error);
      return [];
    }

    // Filtrar apenas arquivos de imagem e gerar URLs públicas
    const banners = data
      .filter((file) => {
        // Filtrar apenas arquivos (não pastas) e tipos de imagem
        const isFile = file.id !== null;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
        return isFile && isImage;
      })
      .map((file) => {
        const {
          data: { publicUrl },
        } = supabase.storage.from("galeria").getPublicUrl(file.name);

        return {
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size || 0,
          createdAt:
            file.created_at || file.updated_at || new Date().toISOString(),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return banners;
  } catch (error) {
    console.error("Erro ao listar banners:", error);
    return [];
  }
};

// Função para obter informações detalhadas de uma imagem específica
export const getBannerInfo = async (fileName: string) => {
  try {
    const { data, error } = await supabase.storage
      .from("galeria")
      .info(fileName);

    if (error) {
      console.error("Erro ao obter informações da imagem:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao obter informações:", error);
    return null;
  }
};
