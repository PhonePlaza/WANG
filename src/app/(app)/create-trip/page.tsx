"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonBack } from "@/components/ui/button-back";
import { Button } from "@/components/ui/button";
import StepForm from "@/components/ui/step/StepContent";
import { createClient } from "@/lib/supabase/client";
import TripDateRangePicker from "@/components/ui/TripDate-Picker";

export default function CreateTripPage() {
  const [tripName, setTripName] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripDuration, setTripDuration] = useState("");
  const [tripDateClose, setTripDateClose] = useState("");
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const handleCreateTrip = async () => {
    if (
      !tripName ||
      !tripLocation ||
      !tripBudget ||
      !tripDuration ||
      !tripDateClose ||
      !tripStartDate ||
      !tripEndDate
    ) {
      alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    const budgetNumber = parseInt(tripBudget);
    const durationNumber = parseInt(tripDuration);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนสร้างทริป");
        return;
      }

      // Insert และดึง trip_id ของทริปใหม่
      const { data, error } = await supabase
        .from("trips")
        .insert([
          {
            trip_name: tripName,
            location: tripLocation,
            budget_per_person: budgetNumber,
            num_days: durationNumber,
            join_deadline: tripDateClose,
            date_range_start: tripStartDate
              ? tripStartDate.toISOString().split("T")[0]
              : null,
            date_range_end: tripEndDate
              ? tripEndDate.toISOString().split("T")[0]
              : null,
            created_by: user.id,
          },
        ])
        .select(); // ต้องมี select() เพื่อดึง trip_id

      if (error || !data) {
        console.error("Supabase insert error:", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        return;
      }

      const newTripId = data[0].trip_id;
      alert("สร้างทริปเรียบร้อยแล้ว!");

      // ล้างฟอร์ม
      setTripName("");
      setTripLocation("");
      setTripBudget("");
      setTripDuration("");
      setTripDateClose("");
      setTripStartDate(null);
      setTripEndDate(null);

      // ไปหน้า trip ของทริปใหม่
      router.push(`/trip/${newTripId}`);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };
  return (
    <main className="flex flex-col p-6">
      <div className="flex flex-row p-6 gap-50 items-start">
        <ButtonBack />
        <StepForm currentStep={1} />
      </div>

      <div className="flex flex-col items-center">
        <h1 className="text-xl font-semibold">Create Trip</h1>

        {/* ชื่อทริป */}
        <div className="mt-6 flex items-center gap-4">
          <label htmlFor="tripName" className="text-base font-medium w-32">
            กรอกชื่อทริป:
          </label>
          <input
            id="tripName"
            type="text"
            placeholder="ชื่อทริป"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
          />
        </div>

        {/* สถานที่ */}
        <div className="mt-6 flex items-center gap-4">
          <label htmlFor="tripLocation" className="text-base font-medium w-32">
            สถานที่:
          </label>
          <input
            id="tripLocation"
            type="text"
            placeholder="สถานที่ท่องเที่ยว"
            value={tripLocation}
            onChange={(e) => setTripLocation(e.target.value)}
            className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
          />
        </div>

        {/* งบต่อคน */}
        <div className="mt-6 flex items-center gap-4">
          <label htmlFor="tripBudget" className="text-base font-medium w-32">
            งบต่อคน:
          </label>
          <input
            id="tripBudget"
            type="text"
            placeholder="เช่น 1500"
            value={tripBudget}
            onChange={(e) => setTripBudget(e.target.value)}
            className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
          />
        </div>

        {/* จำนวนวัน */}
        <div className="mt-6 flex items-center gap-4">
          <label htmlFor="tripDuration" className="text-base font-medium w-32">
            จำนวนวัน:
          </label>
          <input
            id="tripDuration"
            type="text"
            placeholder="2"
            value={tripDuration}
            onChange={(e) => setTripDuration(e.target.value)}
            className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
          />
        </div>

        {/* วันที่ปิดการเข้าร่วม */}
        <div className="mt-6 flex items-center gap-4">
          <label htmlFor="tripDateClose" className="text-base font-medium w-32">
            วันที่ปิดการเข้าร่วม:
          </label>
          <input
            id="tripDateClose"
            type="date"
            value={tripDateClose}
            onChange={(e) => setTripDateClose(e.target.value)}
            className="px-2 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
          />
        </div>

        {/* เลือกกรอบวันที่ทริป */}
        <div className="mt-10">
          <TripDateRangePicker
            tripStartDate={new Date()}
            tripEndDate={
              new Date(new Date().setDate(new Date().getDate() + 360))
            }
            onChange={(start, end) => {
              setTripStartDate(start);
              setTripEndDate(end);
            }}
          />
        </div>

        <div className="w-full flex justify-center mt-10 gap-4">
          <Button variant="success" size="xl" onClick={handleCreateTrip}>
            Create Trip
          </Button>
        </div>
      </div>
    </main>
  );
}
