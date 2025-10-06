import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function TripCard({ trip, currentUserId }: { trip: any, currentUserId: string }) {
  const supabase = createClient()
  const initialStatus = trip.trip_members?.[0]?.status ?? 'PENDING'
  const [status, setStatus] = useState(initialStatus)
  const now = new Date()
  const deadline = new Date(trip.join_deadline) // make sure trip.join_deadline is a Date string
  const isOverDeadline = now > deadline

  const handleJoinToggle = async () => {
    // if (status === 'CANCELLED') return // dead button

    const newStatus = status === 'JOINED' ? 'CANCELLED' : 'JOINED'

    const { error } = await supabase
      .from('trip_members')
      .update({ status: newStatus })
      .eq('trip_id', trip.trip_id)
      .eq('user_id', currentUserId)

    if (error) {
      console.error('Error updating status:', error)
      return
    }

    setStatus(newStatus) // update UI immediately
  }

  // determine button variant based on status
  let buttonVariant: 'default' | 'outline' | 'ghost' | 'success' | 'success2' | 'destructive' = 'default'
  if (status === 'JOINED') buttonVariant = 'success2'
  if (status === 'CANCELLED') buttonVariant = 'outline'
  if (status === 'PENDING') buttonVariant = 'outline'

  return (
    <div className="border rounded-md p-4 shadow-sm flex flex-col gap-3">
      <h3 className="font-semibold">{trip.trip_name}</h3>
      <p>📍 {trip.location}</p>
      <p>💰 Budget: {trip.budget_per_person}</p>
      <p>📅 {trip.date_range_start} → {trip.date_range_end}</p>
      <p>🟢 Status: {status}</p>

      <Button
        variant={buttonVariant}
        disabled={isOverDeadline}
        onClick={handleJoinToggle}
      >
        {isOverDeadline ? 'Deadline Passed'
          : status === 'JOINED' ? 'Unjoin'
          : status === 'CANCELLED' ? 'Join'   
          : 'Join'}
      </Button>
    </div>
  )
}
