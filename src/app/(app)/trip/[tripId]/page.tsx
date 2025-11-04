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

type MemberStatus = "PENDING" | "JOINED" | "CANCELLED";

export default function TripPage() {
  const params = useParams();
  const tripId = params.tripId;
  const router = useRouter();
  const supabase = createClient();

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<MemberStatus>("PENDING");
  const [memberName, setMemberName] = useState("");
  const [savedStart, setSavedStart] = useState<Date | null>(null);
  const [savedEnd, setSavedEnd] = useState<Date | null>(null);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [stepInfo, setStepInfo] = useState({ currentStep: 2, totalSteps: 3 });

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calculateDays = (start: Date, end: Date) => {
    return (
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  };

  useEffect(() => {
    const fetchTripAndStatus = async () => {
      if (!tripId) return;

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("trip_id", tripId)
        .single();

      if (tripError) {
        console.error("Supabase fetch error:", tripError);
        setLoading(false);
        return;
      }

      const now = new Date();
      const voteEndDate = new Date(tripData.vote_close_date);
      if (now < voteEndDate) {
        router.push(`/trip/${tripId}/vote`);
        return;
      }

      const joinDeadline = new Date(tripData.join_deadline);

      if (now > joinDeadline) {
        setIsDeadlinePassed(true);
        router.push(`/trip/${tripId}/dashboard`);
        return;
      }

      setTrip(tripData as TripData);

      if (tripData.vote_close_date) {
        
        setStepInfo({ currentStep: 3, totalSteps: 4 });
      } else {
        
        setStepInfo({ currentStep: 2, totalSteps: 3 });
      }

      const checkRandomLocation = async () => {
        if (!tripData.vote_close_date) return;
        const now = new Date();
        const voteClose = new Date(tripData.vote_close_date);

        if (now >= voteClose && !tripData.location) {
          const { data: locationsData, error } = await supabase
            .from("trip_locations")
            .select("location_name")
            .eq("trip_id", tripData.trip_id);

          if (error || !locationsData || locationsData.length === 0) return;

          const randomIndex = Math.floor(Math.random() * locationsData.length);
          const randomLocation = locationsData[randomIndex].location_name;

          await supabase
            .from("trips")
            .update({ location: randomLocation })
            .eq("trip_id", tripData.trip_id);

          setTrip({ ...tripData, location: randomLocation });
        }
      };

      checkRandomLocation();

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: groupMemberData, error: groupMemberError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", tripData.group_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (groupMemberError || !groupMemberData) {
        alert("คุณไม่ได้อยู่ในกลุ่มนี้");
        router.push("/home");
        return;
      }

      const { data: tripMember, error: memberError } = await supabase
        .from("trip_members")
        .select("status, name, selected_start_date, selected_end_date")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("เช็ค trip_members error:", memberError);
      }

      if (tripMember) {
        setMemberStatus(tripMember.status as MemberStatus);
        setMemberName(tripMember.name || "");

        if (tripMember.selected_start_date && tripMember.selected_end_date) {
          const startDate = new Date(tripMember.selected_start_date);
          const endDate = new Date(tripMember.selected_end_date);

          setSelectedStart(startDate);
          setSelectedEnd(endDate);

          setSavedStart(startDate);
          setSavedEnd(endDate);
        }
      }

      setLoading(false);
    };

    fetchTripAndStatus();
  }, [tripId, supabase, router]);

  const handleJoin = async () => {
    if (!memberName.trim()) {
      alert("กรุณากรอกชื่อก่อนเข้าร่วมทริป");
      return;
    }

    if (!selectedStart || !selectedEnd) {
      alert("กรุณาเลือกวันที่เข้าร่วมทริป");
      return;
    }

    if (!trip) {
      alert("ไม่พบข้อมูลทริป กรุณาลองใหม่");
      return;
    }

    const diffDays = calculateDays(selectedStart, selectedEnd);
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

    const updateData = {
      trip_id: trip.trip_id,
      user_id: user.id,
      name: memberName.trim(),
      status: "JOINED" as MemberStatus,
      selected_start_date: formatDate(selectedStart),
      selected_end_date: formatDate(selectedEnd),
    };

    const { error: updateError } = await supabase
      .from("trip_members")
      .upsert([updateData], { onConflict: "trip_id, user_id" });

    if (updateError) {
      console.error("❌ Update trip_member error:", updateError);
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูลเข้าร่วมทริป");
      return;
    }

    setSavedStart(selectedStart);
    setSavedEnd(selectedEnd);
    setMemberStatus("JOINED");
    alert("✅ อัปเดตสถานะเป็น Join เรียบร้อย");
  };

  const handleNotJoin = async () => {
    if (!trip) {
      alert("ไม่พบข้อมูลทริป กรุณาลองใหม่");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
      return;
    }

    const updateData = {
      trip_id: trip.trip_id,
      user_id: user.id,
      name: memberName.trim() || user.email || "Guest",
      status: "CANCELLED" as MemberStatus,
      selected_start_date: null,
      selected_end_date: null,
    };

    const { error: updateError } = await supabase
      .from("trip_members")
      .upsert([updateData], { onConflict: "trip_id, user_id" });

    if (updateError) {
      console.error("❌ Update trip_member error:", updateError);
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูลการไม่เข้าร่วม");
      return;
    }

    setMemberStatus("CANCELLED");
    setSelectedStart(null);
    setSelectedEnd(null);
    setSavedStart(null);
    setSavedEnd(null);
    alert("❌ อัปเดตสถานะเป็น Not Join เรียบร้อยแล้ว");
  };

  const renderButtons = () => {
    const isJoined = memberStatus === "JOINED";
    const isCancelled = memberStatus === "CANCELLED";

    return (
      <div className="flex gap-4 justify-center">
        <Button
          variant={isJoined ? "default" : "outline"}
          className={`w-40 h-10 rounded-lg font-semibold ${
            isJoined
              ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
          onClick={handleJoin}
        >
          {isJoined ? "Update Dates" : "Join Trip"}
        </Button>

        <Button
          variant={isCancelled ? "default" : "outline"}
          className={`w-40 h-10 rounded-lg font-semibold ${
            isCancelled
              ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
              : "border border-gray-400 text-gray-700 hover:bg-gray-100"
          }`}
          onClick={handleNotJoin}
          disabled={isCancelled}
        >
          {isJoined ? "Cancel" : isCancelled ? "Cancelled" : "Not Join"}
        </Button>
      </div>
    );
  };

  if (loading) return <p>Loading...</p>;
  if (!trip) return <p>ไม่พบข้อมูลทริป</p>;
  if (isDeadlinePassed)
    return <p>วันปิดรับสมัครได้ผ่านไปแล้ว. กำลังนำไปหน้าสรุป...</p>;

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto mt-8 space-y-8 bg-white shadow-2xl rounded-3xl border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border-b-2 border-indigo-100">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-wide text-gray-800">
            🗓️ เลือกวันเข้าร่วมทริป
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            ยืนยันชื่อและช่วงวันที่คุณต้องการเข้าร่วม
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <StepForm currentStep={stepInfo.currentStep} totalSteps={stepInfo.totalSteps} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between mt-5 gap-8 p-8 bg-indigo-50 rounded-2xl shadow-lg border border-indigo-200">
        <div className="flex flex-col w-full md:w-1/2 items-center scale-90">
          {savedStart && savedEnd && memberStatus === "JOINED" && (
            <div className="text-center mb-5 p-4 border border-indigo-300 rounded-xl bg-indigo-100 shadow-md w-full">
              <p className="text-sm font-semibold text-indigo-800 mb-1">
                วันที่ถูกบันทึกไว้ในระบบ (Current Selection):
              </p>
              <p className="text-xl font-bold text-indigo-900">
                {savedStart.toLocaleDateString("th-TH")} -{" "}
                {savedEnd.toLocaleDateString("th-TH")}
              </p>
            </div>
          )}

          <TripDateRangePicker
            tripStartDate={new Date(trip.date_range_start)}
            tripEndDate={new Date(trip.date_range_end)}
            onChange={(start, end) => {
              setSelectedStart(start);
              setSelectedEnd(end);
            }}
            disabled={memberStatus === "CANCELLED"}
          />

          {selectedStart && selectedEnd && (
            <p className="text-gray-700 text-center text-l mt-4 p-2 w-full">
              <strong>คุณกำลังเลือกวันที่:</strong>{" "}
              {selectedStart.toLocaleDateString("th-TH")} -{" "}
              {selectedEnd.toLocaleDateString("th-TH")}
              <br />
              <strong>จำนวนวันที่เลือก:</strong>{" "}
              {calculateDays(selectedStart, selectedEnd)} วัน
            </p>
          )}
        </div>

        <div className="flex flex-col w-full md:w-1/2">
          <div
            className={`text-center p-2 font-bold rounded-lg ${
              memberStatus === "JOINED"
                ? "bg-green-100 text-green-700 border border-green-300"
                : memberStatus === "CANCELLED"
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-yellow-100 text-yellow-700 border border-yellow-300"
            }`}
          >
            {memberStatus === "JOINED" && "✅ สถานะปัจจุบัน: เข้าร่วม"}
            {memberStatus === "CANCELLED" && "❌ สถานะปัจจุบัน: ไม่เข้าร่วม"}
            {memberStatus === "PENDING" &&
              "⚠️ สถานะปัจจุบัน: ยังไม่ได้ตัดสินใจ"}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-3 mt-5">
            <DetailRow label="ชื่อทริป" value={trip.trip_name} />
            <DetailRow label="สถานที่" value={trip.location} />
            <DetailRow
              label="งบต่อคน"
              value={`${trip.budget_per_person} บาท`}
            />
            <DetailRow label="จำนวนวัน" value={`${trip.num_days} วัน`} />
            <DetailRow
              label="วันที่ปิดรับสมัคร"
              value={new Date(trip.join_deadline).toLocaleDateString("th-TH")}
            />
            <DetailRow
              label="ช่วงวันที่ทริป"
              value={`${new Date(trip.date_range_start).toLocaleDateString(
                "th-TH"
              )} - ${new Date(trip.date_range_end).toLocaleDateString(
                "th-TH"
              )}`}
            />
          </div>

          <div className="mt-5 p-5 bg-white border border-gray-200 rounded-xl shadow-inner">
            <label
              htmlFor="memberName"
              className="text-base font-semibold block mb-2 text-gray-700"
            >
              ⭐ ชื่อที่คุณจะใช้เข้าร่วมทริป:
            </label>
            <input
              id="memberName"
              type="text"
              placeholder="กรอกชื่อก่อนเข้าร่วม เช่น ชื่อเล่น หรือชื่อจริง"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              disabled={memberStatus === "CANCELLED"}
              className="px-4 py-2 border rounded-lg text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full transition duration-150 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="items-center mt-6">{renderButtons()}</div>
        </div>
      </div>
    </main>
  );
}

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex justify-between border-b border-gray-100 last:border-b-0 py-1">
    <span className="font-medium text-gray-600">{label}:</span>
    <span className="text-gray-800 font-medium">{value}</span>
  </div>
);
