import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getBadgePickupById, BadgePickup } from '../../actions/badge-pickup'

export const useBadgePickupById = (
  id: string,
  options?: UseQueryOptions<BadgePickup | null, Error>
) => {
  return useQuery({
    queryKey: ['badge-pickup', id],
    queryFn: () => getBadgePickupById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}