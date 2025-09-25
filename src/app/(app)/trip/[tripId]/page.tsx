"use client";

import React, { useEffect, useState } from "react";
import { useParams , useRouter} from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import StepForm from "@/components/ui/step/StepContent";

interface TripData {
  trip_id: number;
  trip_name: string;
  location: string;
  budget_per_person: number;
  num_days: number;
  join_deadline: string;
  date_range_start: string;
  date_range_end: string;
  created_by: string;
}

export default function TripPage() {
  const params = useParams();
  const tripId = params.tripId;
  const router = useRouter();

  const supabase = createClient();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) return;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("trip_id", tripId)
        .single();

      if (error) {
        console.error("Supabase fetch error:", error);
        setLoading(false);
        return;
      }

      setTrip(data as TripData);
      setLoading(false);
    };

    fetchTrip();
  }, [tripId, supabase]);

  if (loading) return <p>Loading...</p>;
  if (!trip) return <p>ไม่พบข้อมูลทริป</p>;

  const now = new Date();
  const joinDeadline = new Date(trip.join_deadline);
  const canJoin = now <= joinDeadline;

  const handleJoin = async () => {
    if (!memberName.trim()) {
      alert("กรุณากรอกชื่อก่อนเข้าร่วมทริป");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนเข้าร่วมทริป");
      return;
    }

    const { error } = await supabase.from("trip_members").insert([
      {
        trip_id: trip.trip_id,
        user_id: user.id,
        name: memberName.trim(),
        status: "joining", 
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      alert("เกิดข้อผิดพลาดในการเข้าร่วมทริป");
      return;
    }
    
    router.push(`/trip/${trip!.trip_id}/summary`);

  };
  return (
    <main className="flex flex-col p-6">
      <div className="flex flex-col items-center">
        {/* Step progress bar */}
        <StepForm currentStep={2} />
        <h1 className="text-2xl font-bold mb-4">{trip.trip_name}</h1>
        <p>
          <strong>สถานที่:</strong> {trip.location}
        </p>
        <p>
          <strong>งบต่อคน:</strong> {trip.budget_per_person}
        </p>
        <p>
          <strong>จำนวนวัน:</strong> {trip.num_days}
        </p>
        <p>
          <strong>วันที่ปิดการเข้าร่วม:</strong> {trip.join_deadline}
        </p>
        <p>
          <strong>กรอบวันที่ทริป:</strong> {trip.date_range_start} -{" "}
          {trip.date_range_end}
        </p>

        <div className="mt-6 flex gap-4">
          {canJoin ? (
            <div className="mt-6 flex flex-col gap-4 max-w-[500px]">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="memberName"
                  className="text-base font-medium w-32"
                >
                  ชื่อของคุณ:
                </label>
                <input
                  id="memberName"
                  type="text"
                  placeholder="กรอกชื่อก่อนเข้าร่วม"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
                />
              </div>
              <div className="flex gap-4 justify-center mt-8">
                <Button variant="success" onClick={handleJoin}>
                  Join Trip
                </Button>
                <Button variant="destructive">Not Join</Button>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-red-600 font-semibold">
              การเข้าร่วมทริปปิดแล้ว
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
