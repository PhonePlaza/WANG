"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import StepForm from "@/components/ui/step/StepContent";
import TripDateRangePicker from "@/components/ui/TripDate-Picker";

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
  group_id: number;
}

export default function TripPage() {
  const params = useParams();
  const tripId = params.tripId;
  const router = useRouter();
  const supabase = createClient();

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberName, setMemberName] = useState("");
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ดึงข้อมูล trip
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
      const now = new Date();
      const joinDeadline = new Date(data.join_deadline);
      if (now > joinDeadline) {
        router.push(`/trip/${tripId}/summary`);
        return;
      }

      setTrip(data as TripData);
      setLoading(false);
    };

    fetchTrip();
  }, [tripId, supabase, router]);

  // ตรวจสอบสิทธิ์การเข้าถึง
  useEffect(() => {
    const checkAccess = async () => {
      if (!tripId) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("group_id")
        .eq("trip_id", tripId)
        .single();

      if (tripError || !tripData) {
        console.error("ไม่พบข้อมูล trip:", tripError);
        return;
      }

      const groupId = tripData.group_id;

      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError || !memberData) {
        alert("คุณไม่ได้อยู่ในกลุ่มนี้");
        router.push("/home");
        return;
      }

      const { data: tripMember, error: tripMemberError } = await supabase
        .from("trip_members")
        .select("status")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (tripMemberError) {
        console.error("เช็ค trip_members error:", tripMemberError);
        return;
      }

      if (!tripMember || tripMember.status === "PENDING") {
        // สามารถเปิดหน้านี้ได้
        return;
      } else if (tripMember.status === "JOINED") {
        router.push(`/trip/${tripId}/summary`);
      } else if (tripMember.status === "CANCELLED") {
        router.push("/home");
      }
    };

    checkAccess();
  }, [tripId, supabase, router]);

  if (loading) return <p>Loading...</p>;
  if (!trip) return <p>ไม่พบข้อมูลทริป</p>;

  // ฟังก์ชันกด join
  const handleJoin = async () => {
    if (!memberName.trim()) {
      alert("กรุณากรอกชื่อก่อนเข้าร่วมทริป");
      return;
    }

    if (!selectedStart || !selectedEnd) {
      alert("กรุณาเลือกวันที่เข้าร่วมทริป");
      return;
    }

    const diffDays =
      (selectedEnd.getTime() - selectedStart.getTime()) /
        (1000 * 60 * 60 * 24) +
      1;
    if (diffDays !== trip.num_days) {
      alert(`คุณต้องเลือกวันที่ต่อเนื่องกัน ${trip.num_days} วัน`);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนเข้าร่วมทริป");
      return;
    }

    const { data, error } = await supabase
      .from("trip_members")
      .update({
        name: memberName.trim(),
        status: "JOINED",
        selected_start_date: formatDate(selectedStart),
        selected_end_date: formatDate(selectedEnd),
      })
      .eq("trip_id", trip.trip_id)
      .eq("user_id", user.id);

    if (error) {
      console.error("❌ Update trip_member error:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูลเข้าร่วมทริป");
      return;
    }

    console.log("✅ Updated trip_member:", data);
    router.push(`/trip/${trip.trip_id}/summary`);
  };

  // ฟังก์ชันกด not join
  const handleNotJoin = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
      return;
    }

    const { data: existingMember, error: fetchError } = await supabase
      .from("trip_members")
      .select("*")
      .eq("trip_id", trip.trip_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      alert("เกิดข้อผิดพลาด");
      return;
    }

    if (existingMember) {
      await supabase
        .from("trip_members")
        .update({ status: "CANCELLED" })
        .eq("trip_id", trip.trip_id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("trip_members").insert([
        {
          trip_id: trip.trip_id,
          user_id: user.id,
          name: memberName.trim() || "Guest",
          status: "CANCELLED",
        },
      ]);
    }

    router.push(`/trip/${trip.trip_id}/summary`);
  };

  return (
    <main className="flex flex-col p-4">
      <div className="flex flex-col gap-5 items-center">
        <h1 className="text-2xl font-semibold tracking-wide">Trip Details</h1>
        <StepForm currentStep={2} />
      </div>

      <div className="flex flex-row justify-between items-start mt-5 gap-8">
        <div className="flex flex-col w-1/2 items-center scale-80">
          <div className="origin-top">
            <TripDateRangePicker
              tripStartDate={new Date(trip.date_range_start)}
              tripEndDate={new Date(trip.date_range_end)}
              onChange={(start, end) => {
                setSelectedStart(start);
                setSelectedEnd(end);
              }}
            />
          </div>

          {selectedStart && selectedEnd && (
            <p className="text-gray-700 text-center text-xl mt-4">
              <strong>คุณเลือกวันที่:</strong>{" "}
              {selectedStart.toLocaleDateString("th-TH")} -{" "}
              {selectedEnd.toLocaleDateString("th-TH")}
              <br />
              <strong>จำนวนวันที่เลือก:</strong>{" "}
              {Math.floor(
                (selectedEnd.getTime() - selectedStart.getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}{" "}
              วัน
            </p>
          )}
        </div>

        <div className="flex flex-col w-1/2">
          <h1 className="text-xl font-bold text-center">{trip.trip_name}</h1>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-3 mt-5">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">สถานที่:</span>
              <span className="text-gray-800">{trip.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">งบต่อคน:</span>
              <span className="text-gray-800">
                {trip.budget_per_person} บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">จำนวนวัน:</span>
              <span className="text-gray-800">{trip.num_days} วัน</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                วันที่ปิดรับสมัคร:
              </span>
              <span className="text-gray-800">
                {new Date(trip.join_deadline).toLocaleDateString("th-TH")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">ช่วงวันที่ทริป:</span>
              <span className="text-gray-800">
                {new Date(trip.date_range_start).toLocaleDateString("th-TH")} -{" "}
                {new Date(trip.date_range_end).toLocaleDateString("th-TH")}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="memberName"
              className="text-base font-medium block mb-2 text-gray-700"
            >
              ชื่อของคุณ:
            </label>
            <input
              id="memberName"
              type="text"
              placeholder="กรอกชื่อก่อนเข้าร่วม"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>

          <div className="items-center mt-6">
            <div className="flex gap-4 justify-center">
              <Button
                variant="success"
                className="w-30 h-10 rounded-lg"
                onClick={handleJoin}
              >
                Join Trip
              </Button>
              <Button
                className="w-30 h-10 rounded-lg bg-gray-400 hover:bg-gray-500 text-white"
                onClick={handleNotJoin}
              >
                Not Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
