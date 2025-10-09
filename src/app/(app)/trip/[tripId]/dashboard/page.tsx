"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  vote_close_date: string | null;
}

interface TripMember {
  trip_id: number;
  name: string;
  status: string;
  user_id: string;
  selected_start_date: string;
  selected_end_date: string;
}

export default function TripDashboard() {
  const params = useParams();
  const tripId = params.tripId;
  const supabase = createClient();

  const [members, setMembers] = useState<TripMember[]>([]);
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bestDates, setBestDates] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [isTripFailed, setIsTripFailed] = useState(false);

  const formatDateDMY = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!tripId) return;

      try {
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("*, vote_close_date") 
          .eq("trip_id", tripId)
          .single();
        if (tripError || !tripData) throw tripError;
        setTrip(tripData as TripData);

        const { data: memberData, error: memberError } = await supabase
          .from("trip_members")
          .select("*")
          .eq("trip_id", tripId);
        if (memberError) throw memberError;
        setMembers(memberData as TripMember[]);

        const now = new Date();
        const joinDeadline = new Date(tripData.join_deadline);
        
        const currentJoinedMembers = (memberData as TripMember[]).filter(
            (m) => m.status === "JOINED"
        );
        
        if (now > joinDeadline && currentJoinedMembers.length < 1) {
            setIsTripFailed(true);
            setLoading(false);
            return;
        }

        const best = calculateBestDates(
          memberData as TripMember[],
          tripData.num_days
        );
        setBestDates(best);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [tripId, supabase]);

  const calculateBestDates = (members: TripMember[], numDays: number) => {
    const dateCount: Record<string, number> = {};

    const validMembers = members.filter(
      (m) =>
        m.status === "JOINED" && m.selected_start_date && m.selected_end_date
    );

    validMembers.forEach((m) => {
      const start = new Date(m.selected_start_date);
      const end = new Date(m.selected_end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        dateCount[key] = (dateCount[key] || 0) + 1;
      }
    });

    const allDates = Object.keys(dateCount).sort();
    if (allDates.length === 0) return null;

    if (numDays === 1) {
      let maxCount = 0;
      let bestDate = "";
      allDates.forEach((d) => {
        if (dateCount[d] > maxCount) {
          maxCount = dateCount[d];
          bestDate = d;
        }
      });
      return { start: bestDate, end: bestDate };
    } else {
      let bestStart = "";
      let bestCount = -1;
      for (let i = 0; i <= allDates.length - numDays; i++) {
        let sum = 0;
        for (let j = 0; j < numDays; j++)
          sum += dateCount[allDates[i + j]] || 0;
        if (sum > bestCount) {
          bestCount = sum;
          bestStart = allDates[i];
        }
      }
      if (!bestStart) return null; 

      const startDate = new Date(bestStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + numDays - 1);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!trip) return <p>ไม่พบข้อมูลทริป</p>;

  if (isTripFailed) {
    return (
        <main className="p-8 max-w-2xl mx-auto mt-16 space-y-8 bg-red-50 shadow-2xl rounded-3xl border border-red-300">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold text-red-700">
                    ❌ ทริปล่ม (Trip Failed) ❌
                </h1>
                <p className="text-xl text-gray-700 font-semibold">
                    ทริป {trip.trip_name} ถูกยกเลิกเนื่องจาก:
                </p>
                <div className="p-4 bg-white border border-red-200 rounded-xl shadow-md mx-auto max-w-md">
                    <p className="text-red-600 font-medium">
                        วันปิดรับสมัครได้ผ่านไปแล้ว ({formatDateDMY(trip.join_deadline)}) 
                        <br /> 
                        และไม่มีสมาชิกเข้าร่วมเลย 😭
                    </p>
                </div>
                <p className="text-gray-500 pt-4">
                    คุณสามารถสร้างทริปใหม่ได้ในหน้าหลัก
                </p>
            </div>
        </main>
    );
  }

  
  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-gray-800 font-semibold">{value}</span>
    </div>
  );

  let totalSteps = 3;
  let currentStep = 3; 


  if (trip.vote_close_date) {
    totalSteps = 4;
    currentStep = 4; 
  }
  

  const joinedMembers = members.filter((m) => m.status === "JOINED");

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto mt-8 space-y-8 bg-white shadow-2xl rounded-3xl border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center p-4 rounded-xl border-b-2 border-indigo-100">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-wide text-gray-800">
            ✅ สรุปผลการเข้าร่วมทริป: {trip.trip_name}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            รายละเอียดและผลการรวบรวมวันที่สมาชิกส่วนใหญ่ว่าง
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <StepForm currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full">
        <section className="flex-1 bg-indigo-50 shadow-lg rounded-2xl p-6 border border-indigo-200 order-2 md:order-1">
          {bestDates ? (
            <div className="flex justify-center">
              <div className="w-m p-4 bg-green-500 rounded-xl shadow-xl mb-6 flex flex-col items-center justify-center text-center">
                <span className="text-white text-xl font-bold mb-1">
                  📅 ช่วงวันที่ที่สมาชิกส่วนใหญ่สะดวก:
                </span>
                <p className="text-white text-2xl font-extrabold tracking-wider">
                  {bestDates.start === bestDates.end
                    ? formatDateDMY(bestDates.start)
                    : `${formatDateDMY(bestDates.start)} - ${formatDateDMY(
                        bestDates.end
                      )}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-xl shadow-md mb-6">
              <p className="text-yellow-800 font-semibold text-center">
                ⚠️ ยังไม่พบช่วงวันที่ที่ลงตัวสำหรับสมาชิกทุกคน
              </p>
            </div>
          )}

          {/* รายละเอียดทริป */}
          <div className="space-y-3 p-3 bg-white rounded-xl shadow-inner">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-2">
              รายละเอียดทริป
            </h3>
            <InfoRow label="สถานที่" value={trip.location} />
            <InfoRow
              label="งบต่อคน"
              value={`${trip.budget_per_person.toLocaleString()} บาท`}
            />
            <InfoRow label="จำนวนวัน" value={`${trip.num_days} วัน`} />
            <InfoRow
              label="ช่วงวันที่เปิดรับ"
              value={`${formatDateDMY(trip.date_range_start)} - ${formatDateDMY(
                trip.date_range_end
              )}`}
            />
            <InfoRow
              label="วันที่ปิดรับสมัคร"
              value={formatDateDMY(trip.join_deadline)}
            />
            {trip.vote_close_date && (
              <InfoRow label="ประเภททริป" value="โหวตสถานที่" />
            )}
          </div>
        </section>

        {/* ซีกขวา: รายชื่อสมาชิก */}
        <section className="flex-1 bg-white shadow-xl rounded-2xl p-6 border border-gray-100 order-1 md:order-2">
          <h2 className="text-xl font-bold mb-4 text-center text-indigo-700 border-b pb-2">
            🙋 สมาชิกที่เข้าร่วม ({joinedMembers.length})
          </h2>
          {joinedMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-5">
              ยังไม่มีสมาชิกเข้าร่วม
            </p>
          ) : (
            <ul className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
              {joinedMembers.map((m) => (
                <li
                  key={m.user_id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:bg-gray-100 transition duration-150"
                >
                  <span className="font-semibold text-gray-800">{m.name}</span>
                  <span className="text-indigo-600 text-sm font-medium">
                    {formatDateDMY(m.selected_start_date)} -{" "}
                    {formatDateDMY(m.selected_end_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}