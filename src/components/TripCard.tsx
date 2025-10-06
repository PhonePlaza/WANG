import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TripCard({ trip }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{trip.trip_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>📍 {trip.location}</p>
        <p>💰 Budget: {trip.budget_per_person}</p>
        <p>📅 {trip.date_range_start} → {trip.date_range_end}</p>
      </CardContent>
    </Card>
  )
}
