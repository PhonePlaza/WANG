'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation' // App Router navigation
import { Label } from '@/components/ui/label'

export default function TripCard({ trip, currentUserId }: { trip: any, currentUserId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const initialStatus = trip.trip_members?.[0]?.status ?? 'PENDING'
  const [status, setStatus] = useState(initialStatus)
  const now = new Date()
  const deadline = new Date(trip.join_deadline)
  const isOverDeadline = now > deadline
  const isCreator = trip.created_by === currentUserId

  const handleJoinToggle = async () => {
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

    setStatus(newStatus)
  }

  const handleViewDetail = () => {
    router.push(`/trip/${trip.trip_id}`)
  }

  const handleDeleteTrip = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${trip.trip_name}"?`)
    if (!confirmDelete) return

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('trip_id', trip.trip_id)

    if (error) {
      console.error('Error deleting trip:', error)
      alert('Failed to delete trip. Please try again.')
      return
    }

    alert('Trip deleted successfully.')
    router.refresh() // reload current page
  }

  // determine button variant based on status
  let buttonVariant: 'default' | 'outline' | 'ghost' | 'success' | 'success2' | 'destructive' = 'default'
  let labelVariant: 'bg-green-300' | 'bg-red-300' | 'bg-yellow-300' | 'bg-gray-300' = 'bg-gray-300'
  if (status === 'JOINED') {
    labelVariant = 'bg-green-300'
    buttonVariant = 'destructive'
  }
  if (status === 'CANCELLED') {
    buttonVariant = 'success2'
    labelVariant = 'bg-red-300'
  }
  if (status === 'PENDING') {
    buttonVariant = 'success2'
    labelVariant = 'bg-yellow-300'
  }

  return (
    <div className="relative border rounded-md p-4 shadow-sm flex flex-col gap-3">

      {isCreator && (
        <Button 
          variant="ghost"
          onClick={handleDeleteTrip}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm font-semibold"
        >
          🗑
        </Button>
      )}

      <h3 className="font-semibold">{trip.trip_name}</h3>
      <p>📍 {trip.location}</p>
      <p>💰 Budget: {trip.budget_per_person}</p>
      <p>📅 {trip.date_range_start} → {trip.date_range_end}</p>

      <p className={`${labelVariant} px-4 py-1 rounded-md w-fit`}>
         {status}
      </p>

      <div className="mt-auto flex gap-2">
        <Button
          className='flex-1 w-full'
          variant={buttonVariant}
          disabled={isOverDeadline}
          onClick={handleJoinToggle}
        >
          {isOverDeadline ? 'Deadline Passed'
            : status === 'JOINED' ? 'Cancel'
              : status === 'CANCELLED' ? 'Join'
                : 'Join'}
        </Button>

        {/* View Details Button */}
        <Button  className='flex-1'variant="outline" onClick={handleViewDetail}>
          View Details
        </Button>
        </div>
    </div>
  )
}
