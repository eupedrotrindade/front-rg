import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getBadgePickupStats, BadgePickupStats } from '../../actions/badge-pickup'

export const useBadgePickupStats = (
  eventId: string,
  options?: UseQueryOptions<BadgePickupStats, Error>
) => {
  return useQuery({
    queryKey: ['badge-pickup-stats', eventId],
    queryFn: () => getBadgePickupStats(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}