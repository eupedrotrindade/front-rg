import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const SUPABASE_API_URL = process.env.NEXT_PUBLIC_SUPABASE_API_URL;
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const deleteGalleryImage = async (fileName: string) => {
  await axios.delete(
    `${SUPABASE_API_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
};

export const useDeleteGalleryImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGalleryImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
    },
  });
};
