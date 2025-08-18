import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getBadgePickupsByEvent, BadgePickup } from '../../actions/badge-pickup'

export const useBadgePickupsByEvent = (
  eventId: string,
  options?: UseQueryOptions<BadgePickup[], Error>
) => {
  return useQuery({
    queryKey: ['badge-pickups', 'by-event', eventId],
    queryFn: () => getBadgePickupsByEvent(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}