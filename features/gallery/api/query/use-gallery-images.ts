/* eslint-disable @typescript-eslint/no-explicit-any */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { GalleryImage } from "../../types";

const SUPABASE_API_URL = process.env.NEXT_PUBLIC_SUPABASE_API_URL;
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const fetchAllGalleryImages = async (): Promise<GalleryImage[]> => {
  // ✅ VALIDAÇÃO: Garantir que variáveis estão definidas
  if (!SUPABASE_API_URL || !SUPABASE_BUCKET || !SUPABASE_KEY) {
    throw new Error(
      "Variáveis de ambiente do Supabase não configuradas. Verifique NEXT_PUBLIC_SUPABASE_API_URL, NEXT_PUBLIC_SUPABASE_BUCKET e NEXT_PUBLIC_SUPABASE_KEY"
    );
  }

  try {
    // ✅ CORRIGIDO: Usar variável de ambiente ao invés de URL hardcoded
    const { data } = await axios.get(
      `${SUPABASE_API_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!data) {
      return [];
    }

    const imageFiles = data.filter((item: any) => {
      const isFile = !item.name.endsWith("/");
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(
        item.name
      );
      return isFile && isImage;
    });

    return imageFiles
      .map((item: any) => ({
        id: item.id ?? item.name,
        name: item.name.replace(/^gallery\//, ""),
        url: `${SUPABASE_API_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${item.name}`,
        createdAt: item.created_at ?? "",
        size: item.metadata?.size || 0,
        contentType: item.metadata?.mimetype || "image/jpeg",
      }))
      .sort(
        (a: GalleryImage, b: GalleryImage) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch (error) {
    console.error("Erro ao buscar imagens da galeria:", error);
    throw error;
  }
};

export const useAllGalleryImages = () => {
  return useQuery<GalleryImage[]>({
    queryKey: ["all-gallery-images"],
    queryFn: fetchAllGalleryImages,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
