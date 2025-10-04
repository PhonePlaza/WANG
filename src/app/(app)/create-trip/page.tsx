"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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

      //mock group_id ไว้ก่อน (เช่นกลุ่ม 1)
      const mockGroupId = 1;

      // Insert trip
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .insert([
          {
            trip_name: tripName,
            location: tripLocation,
            budget_per_person: budgetNumber,
            num_days: durationNumber,
            join_deadline: tripDateClose,
            date_range_start: tripStartDate.toISOString().split("T")[0],
            date_range_end: tripEndDate.toISOString().split("T")[0],
            created_by: user.id,
            group_id: mockGroupId,
          },
        ])
        .select()
        .single();

      if (tripError || !tripData) {
        console.error("Insert trip error:", tripError);
        alert("เกิดข้อผิดพลาดในการสร้างทริป");
        return;
      }

      const newTripId = tripData.trip_id;

      //ดึงสมาชิกใน group
      const { data: members, error: memberError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", mockGroupId);

      if (memberError) {
        console.error("Fetch group members error:", memberError);
        alert("เกิดข้อผิดพลาดในการดึงสมาชิกกลุ่ม");
        return;
      }

      if (!members || members.length === 0) {
        alert("ไม่มีสมาชิกในกลุ่มนี้");
        return;
      }

      //เตรียมข้อมูลสำหรับ trip_members
      const tripMembersData = members.map((m) => ({
        trip_id: newTripId,
        user_id: m.user_id,
        status: "PENDING",
      }));

      //Insert trip_members
      const { error: tripMembersError } = await supabase
        .from("trip_members")
        .insert(tripMembersData);

      if (tripMembersError) {
        console.error("Insert trip_members error:", tripMembersError);
        alert("เกิดข้อผิดพลาดในการเพิ่มสมาชิกทริป");
        return;
      }

      alert("สร้างทริปและเพิ่มสมาชิกเรียบร้อยแล้ว!");
      router.push(`/trip/${newTripId}`);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <main className="flex flex-col p-4">
      <div className="flex flex-col gap-5 items-center">
        <h1 className="text-2xl font-semibold tracking-wid">Create Trip</h1>
        <StepForm currentStep={1} />
      </div>

      <div className="flex justify-center items-center w-full min-h-screen mt-5">
        <div className="flex flex-col gap-4">
          {/* ชื่อทริป */}
          <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-4 w-full">
                <label
                  htmlFor="tripLocation"
                  className="text-base font-medium w-32"
                >
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
              <div className="flex items-center gap-4 w-full">
                <label
                  htmlFor="tripBudget"
                  className="text-base font-medium w-32"
                >
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
              <div className="flex items-center gap-4 w-full">
                <label
                  htmlFor="tripDuration"
                  className="text-base font-medium w-32"
                >
                  จำนวนวัน:
                </label>
                <input
                  id="tripDuration"
                  type="text"
                  placeholder="เช่น 2"
                  value={tripDuration}
                  onChange={(e) => setTripDuration(e.target.value)}
                  className="px-3 py-2 border rounded-md text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[500px]"
                />
              </div>

              {/* วันที่ปิดการเข้าร่วม */}
              <div className="flex items-center gap-4 w-full">
                <label
                  htmlFor="tripDateClose"
                  className="text-base font-medium w-32"
                >
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
              <div className="w-full flex-col justify-center">
                <div className="inline-block scale-90">
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

                {tripStartDate && tripEndDate && (
                  <p className="mt-0 text-gray-500 font-small">
                    Range:{" "}
                    {tripStartDate.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" - "}
                    {tripEndDate.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
          
          <div className="flex justify-center w-full gap-4 mt-4">
            <Button
              variant="success"
              size="xl"
              className="w-10 h-10 rounded-lg tracking-wide"
              onClick={handleCreateTrip}
            >
              Create Trip
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
