'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import TripCard from '@/components/TripCard'
import Link from 'next/link'

export default function HomePage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchGroups = async () => {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.warn('No user found or error:', userError)
        return
      }
      setCurrentUser(user)
      console.log('Current user:', user)

      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Error fetching group memberships:', memberError)
        return
      }

      if (!memberData?.length) {
        setGroups([])
        return
      }

      const groupIds = memberData.map((m) => m.group_id)
      const { data: groupData, error: groupError } = await supabase
        .from('group')
        .select('group_id, group_name')
        .in('group_id', groupIds)

      if (groupError) {
        console.error('Error fetching groups:', groupError)
        return
      }

      setGroups(groupData || [])
    }
    fetchGroups()
  }, [])

  useEffect(() => {
    if (!selectedGroupId) return

    const fetchTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`*,
          *,
          trip_members!inner(
            status
          )
        `)
        .eq('group_id', selectedGroupId)
        .eq('trip_members.user_id', currentUser.id)


      if (error) {
        console.error('Error fetching trips:', error)
        return
      }

      setTrips(data || [])
    }

    fetchTrips()
  }, [selectedGroupId])

  return (
    <>
      {/* Group Selector */}
      <div className="flex items-center justify-between p-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {groups.find((g) => g.group_id === selectedGroupId)?.group_name || 'Select Group'}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="bg-white rounded-md shadow-md">
            {groups.map((g) => (
              <DropdownMenuItem
                key={g.group_id}
                onClick={() => setSelectedGroupId(g.group_id)}  
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {g.group_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      <Button >
        <Link href={`/create-trip?groupId=${selectedGroupId}`}>
          สร้างทริปใหม่
        </Link>
      </Button>
      </div>
      
      {/* Trip List */}
      <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <TripCard key={trip.trip_id} trip={trip} currentUserId={currentUser.id} />
          ))
        ) : (
          <p className="text-gray-500 col-span-full text-center">
            No trips found for this group.
          </p>
        )}
      </div>
    </>
  )
}
