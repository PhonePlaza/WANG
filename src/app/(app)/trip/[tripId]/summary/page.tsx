"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepForm from "@/components/ui/step/StepContent";

interface TripMember {
  id: number;
  name: string;
  status: string;
  user_id: string;
}

export default function TripSummaryPage() {
  const params = useParams();
  const tripId = params.tripId;

  const supabase = createClient();
  const [members, setMembers] = useState<TripMember[]>([]);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!tripId) return;

      // ดึงสมาชิกทั้งหมดที่ status = 'joining'
      const { data, error } = await supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", "joining");

      if (error) {
        console.error("Supabase fetch error:", error);
        setLoading(false);
        return;
      }

      setMembers(data as TripMember[]);

      // ดึง status ของผู้ใช้ปัจจุบัน
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        const myMember = (data as TripMember[]).find(
          (m) => m.user_id === user.id
        );
        setMyStatus(myMember ? myMember.status : null);
      }

      setLoading(false);
    };

    fetchMembers();
  }, [tripId, supabase]);

  if (loading) return <p>Loading...</p>;

  return (
    <main className="flex flex-col p-6">
      <div className="flex flex-col items-center">
        <StepForm currentStep={3} />
        <h1 className="text-2xl font-bold mb-4">Trip Summary</h1>

        {myStatus && (
          <p className="mb-4 text-blue-600">
            สถานะของคุณ: <strong>{myStatus}</strong>
          </p>
        )}

        <h2 className="text-xl font-semibold mb-2">สมาชิกที่เข้าร่วม:</h2>
        {members.length === 0 ? (
          <p>ยังไม่มีสมาชิกเข้าร่วม</p>
        ) : (
          <ul className="list-disc ml-6">
            {members.map((m) => (
              <li key={m.id}>
                {m.name} - {m.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
