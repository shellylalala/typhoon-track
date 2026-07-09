import { useQuery } from "@tanstack/react-query";
import { fetchTyphoonDetail } from "../lib/api";

export const useTyphoonData = (id: string) => {
  return useQuery({
    queryKey: ["typhoon-detail", id],
    queryFn: () => fetchTyphoonDetail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
