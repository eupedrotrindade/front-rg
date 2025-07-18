import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const SUPABASE_API_URL = process.env.NEXT_PUBLIC_SUPABASE_API_URL;
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const uploadGalleryImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  await axios.post(
    `${SUPABASE_API_URL}/storage/v1/object/${SUPABASE_BUCKET}/${file.name}`,
    file,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": file.type,
      },
    }
  );
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
