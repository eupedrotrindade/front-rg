import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Event } from "@/features/eventos/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

const getEventsByIds = async (ids: string[]): Promise<Event[]> => {
  if (!API_URL || !API_TOKEN)
    throw new Error("Configuração da API não encontrada");
  if (!ids.length) return [];
  const where = ids.map((id) => `id='${id}'`).join(" or ");
  const url = `${API_URL}?offset=0&limit=100&where=${encodeURIComponent(
    where
  )}`;
  const { data } = await axios.get(url, {
    headers: { "xc-token": API_TOKEN },
  });
  return data.list || [];
};

export const useOperatorEvents = (ids: string[], enabled = true) => {
  return useQuery<Event[]>({
    queryKey: ["operator-events", ids],
    queryFn: () => getEventsByIds(ids),
    enabled: !!ids.length && enabled,
  });
};
