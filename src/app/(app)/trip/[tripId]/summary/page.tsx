"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepForm from "@/components/ui/step/StepContent";

interface TripMember {
  trip_id: number;
  name: string;
  status: string;
  user_id: string;
  selected_start_date: string; // YYYY-MM-DD
  selected_end_date: string; // YYYY-MM-DD
}

interface TripData {
  trip_id: number;
  trip_name: string;
  location: string;
  budget_per_person: number;
  num_days: number;
  join_deadline: string;
  date_range_start: string;
  date_range_end: string;
}

export default function TripSummaryPage() {
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

  // ฟังก์ชันแปลงวันที่เป็น dd/mm/yyyy
  const formatDateDMY = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!tripId) return;

      try {
        // ดึงข้อมูลทริป
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("*")
          .eq("trip_id", tripId)
          .single();
        if (tripError || !tripData) throw tripError;
        setTrip(tripData as TripData);

        // ดึงสมาชิกทั้งหมด
        const { data: memberData, error: memberError } = await supabase
          .from("trip_members")
          .select("*")
          .eq("trip_id", tripId);
        if (memberError) throw memberError;
        setMembers(memberData as TripMember[]);

        // คำนวณวันที่สมาชิกเลือกมากที่สุด
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

  // ฟังก์ชันคำนวณช่วงวันที่คนเลือกมากที่สุด
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

  // ฟังก์ชันสร้าง row ข้อมูล
  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );

  const joinedMembers = members.filter((m) => m.status === "JOINED");

  return (
    <main className="flex flex-col p-4 items-center">
      <div className="flex flex-col gap-5 items-center">
        <h1 className="text-2xl font-semibold tracking-wid">Trip Summary</h1>
        <StepForm currentStep={3} />
      </div>

      <div className="flex flex-col md:flex-row gap-10 mt-6 w-full max-w-5xl">
        {/* ข้อมูลทริปด้านซ้าย */}
        <section className="flex-1 bg-white shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 text-center">
            {trip.trip_name}
          </h2>
          <div className="space-y-3">
            <InfoRow label="สถานที่" value={trip.location} />
            <InfoRow label="งบต่อคน" value={`${trip.budget_per_person} บาท`} />
            <InfoRow label="จำนวนวัน" value={`${trip.num_days} วัน`} />
            <InfoRow
              label="วันที่ปิดรับสมัคร"
              value={formatDateDMY(trip.join_deadline)}
            />
            <InfoRow
              label="ช่วงวันที่ทริป"
              value={`${formatDateDMY(trip.date_range_start)} - ${formatDateDMY(
                trip.date_range_end
              )}`}
            />
            {bestDates && (
              <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded shadow-md">
                <span className="font-semibold text-yellow-800 text-m">
                  วันที่สมาชิกส่วนใหญ่ไปได้:{" "}
                  {bestDates.start === bestDates.end
                    ? formatDateDMY(bestDates.start)
                    : `${formatDateDMY(bestDates.start)} - ${formatDateDMY(
                        bestDates.end
                      )}`}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* รายชื่อสมาชิกด้านขวา */}
        <section className="flex-1 bg-white shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-center text-green-700">
            สมาชิกเข้าร่วม ({joinedMembers.length})
          </h2>
          {joinedMembers.length === 0 ? (
            <p className="text-gray-500 text-center">ยังไม่มีสมาชิกเข้าร่วม</p>
          ) : (
            <ul className="space-y-2 max-h-[400px] overflow-y-auto">
              {joinedMembers.map((m) => (
                <li
                  key={m.user_id}
                  className="border border-gray-200 rounded-md p-3 hover:shadow-md transition"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-500 ml-2 text-sm">
                    ({formatDateDMY(m.selected_start_date)} -{" "}
                    {formatDateDMY(m.selected_end_date)})
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
