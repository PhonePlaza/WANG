"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import StepForm from "@/components/ui/step/StepContent";
import { createClient } from "@/lib/supabase/client";
import TripDateRangePicker from "@/components/ui/TripDate-Picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TripLocationInput from "@/components/ui/TripLocationInput";

interface LocationOption {
  id: number;
  name: string;
}

export default function CreateTripPage() {
  const [tripName, setTripName] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripDuration, setTripDuration] = useState("");
  const [voteCloseDate, setVoteCloseDate] = useState("");
  const [joinCloseDate, setJoinCloseDate] = useState("");
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);
  const [tripLocations, setTripLocations] = useState<LocationOption[]>([]);

  const [activeTab, setActiveTab] = useState<"custom" | "vote">("custom");
  const totalSteps = activeTab === "custom" ? 3 : 4;

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [GroupId, setGroupId] = useState<string | null>(null);
  useEffect(() => {
    const id = searchParams.get("GroupId");
    setGroupId(id);
  }, [searchParams]);

  const groupId = Number(GroupId);

  const insertTripMembers = async (newTripId: number, groupId: number) => {
    const { data: members, error: memberError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

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
  };

  const handleCreateTrip = async (type: "custom" | "vote") => {
    try {
      const budgetNumber = parseInt(tripBudget);
      const durationNumber = parseInt(tripDuration);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนสร้างทริป");
        return;
      }
      if (!groupId) {
        alert("กรุณาเลือกกลุ่มก่อนกลับไปหน้า Home");
        router.push(`/home`);
        return;
      }

      let newTripId: number | null = null;

      if (type === "custom") {
        if (
          joinCloseDate &&
          tripStartDate &&
          new Date(joinCloseDate) >= tripStartDate
        ) {
          alert("กรุณาเลือกวันที่ปิดการเข้าร่วมก่อนวันเริ่มทริป");
          return;
        }

        if (
          !tripName ||
          !tripLocation ||
          !tripBudget ||
          !tripDuration ||
          !joinCloseDate ||
          !tripStartDate ||
          !tripEndDate
        ) {
          alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
          return;
        }

        // Insert trip
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .insert([
            {
              trip_name: tripName,
              location: tripLocation,
              budget_per_person: budgetNumber,
              num_days: durationNumber,
              join_deadline: joinCloseDate,
              date_range_start: tripStartDate.toISOString().split("T")[0],
              date_range_end: tripEndDate.toISOString().split("T")[0],
              created_by: user.id,
              group_id: groupId,
              vote_close_date: null,
            },
          ])
          .select()
          .single();

        if (tripError || !tripData) {
          console.error("Insert trip error:", tripError);
          alert("เกิดข้อผิดพลาดในการสร้างทริป");
          return;
        }
        newTripId = tripData.trip_id;
        if (newTripId) {
          await insertTripMembers(newTripId, groupId);
          router.push(`/trip/${newTripId}`);
        }
      } else if (type === "vote") {
        if (
          joinCloseDate &&
          tripStartDate &&
          new Date(joinCloseDate) >= tripStartDate
        ) {
          alert("วันที่ปิดการเข้าร่วมต้องน้อยกว่าวันเริ่มของทริป");
          return;
        }
        if (
          joinCloseDate &&
          voteCloseDate &&
          new Date(joinCloseDate) <= new Date(voteCloseDate)
        ) {
          alert("วันที่ปิดโหวตต้องน้อยกว่าวันที่ปิดการเข้าร่วมของทริป");
          return;
        }
        if (
          !tripName ||
          tripLocations.length === 0 ||
          !tripStartDate ||
          !tripEndDate ||
          !tripBudget ||
          !tripDuration ||
          !joinCloseDate ||
          !voteCloseDate
        ) {
          alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
          return;
        }

        if (tripLocations.length < 2) {
          alert("สำหรับ Vote Trip ต้องเพิ่มสถานที่มากกว่า 1 แห่ง");
          return;
        }

        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .insert([
            {
              trip_name: tripName,
              location: null,
              budget_per_person: budgetNumber,
              num_days: durationNumber,
              join_deadline: joinCloseDate,
              date_range_start: tripStartDate.toISOString().split("T")[0],
              date_range_end: tripEndDate.toISOString().split("T")[0],
              created_by: user.id,
              group_id: groupId,
              vote_close_date: voteCloseDate,
            },
          ])
          .select()
          .single();

        if (tripError || !tripData) {
          console.error("Insert trip error:", tripError);
          alert("เกิดข้อผิดพลาดในการสร้างทริป");
          return;
        }

        newTripId = tripData.trip_id;

        const locData = tripLocations.map((l) => ({
          trip_id: newTripId,
          location_name: l.name,
        }));

        const { error: locError } = await supabase
          .from("trip_locations")
          .insert(locData);

        if (locError) {
          console.error("Insert trip_locations error:", locError);
          alert("เกิดข้อผิดพลาดในการบันทึก locations");
          return;
        }
        if (newTripId) {
          await insertTripMembers(newTripId, groupId);
          router.push(`/trip/${newTripId}/vote`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการสร้างทริป");
    }
  };

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto mt-8 space-y-8 bg-white shadow-2xl rounded-3xl border border-gray-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border-b-2 border-indigo-100">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-wide text-gray-800">
            ➕ Create New Trip
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            กำหนดรายละเอียดทริปใหม่ของคุณ
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <StepForm currentStep={1} totalSteps={totalSteps} />
        </div>
      </div>

      <div className="flex flex-col w-full px-4 pt-4 pb-8 bg-indigo-50 rounded-2xl shadow-lg border border-indigo-200">
        <Tabs
          defaultValue="custom"
          className="w-full max-w-xl mx-auto items-center mb-6"
          onValueChange={(value) => setActiveTab(value as "custom" | "vote")}
        >
          <TabsList className="bg-white border border-indigo-200 shadow-md">
            <TabsTrigger
              value="custom"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700 font-medium transition-colors"
            >
              Custom Trip
            </TabsTrigger>
            <TabsTrigger
              value="vote"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700 font-medium transition-colors"
            >
              Vote Trip
            </TabsTrigger>
          </TabsList>

          <div className="max-w-xl w-full mt-5">
            {/* Custom Trip Form */}
            <TabsContent value="custom">
              <div className="mt-6 flex flex-col w-full gap-6 p-6 bg-white rounded-xl shadow-inner border border-gray-100">
                <InputField
                  label="ชื่อทริป"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="ชื่อทริป"
                />
                <InputField
                  label="สถานที่"
                  value={tripLocation}
                  onChange={(e) => setTripLocation(e.target.value)}
                  placeholder="สถานที่ท่องเที่ยว"
                />
                <BudgetInput
                  label="งบต่อคน"
                  value={tripBudget}
                  onChange={(e) => setTripBudget(e.target.value)}
                />
                <DurationInput
                  label="จำนวนวัน"
                  value={tripDuration}
                  onChange={(e) => setTripDuration(e.target.value)}
                />
                <DateInput
                  label="วันที่ปิดการเข้าร่วม"
                  value={joinCloseDate}
                  onChange={(e) => setJoinCloseDate(e.target.value)}
                />
                <DateRangeDisplay
                  tripStartDate={tripStartDate}
                  tripEndDate={tripEndDate}
                  setTripStartDate={setTripStartDate}
                  setTripEndDate={setTripEndDate}
                />
                <div className="flex justify-center w-full">
                  <Button
                    variant="success3"
                    size="lg"
                    className="w-100"
                    onClick={() => handleCreateTrip("custom")}
                  >
                    Create Custom Trip
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Vote Trip Form */}
            <TabsContent value="vote">
              <div className="flex flex-col gap-5 p-6 bg-white rounded-xl shadow-inner border border-gray-100">
                <InputField
                  label="ชื่อทริป"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="ชื่อทริป"
                />
                <div className="pt-2">
                  <p className="text-base font-medium text-gray-700 mb-2">
                    สถานที่ (สำหรับโหวต):
                  </p>
                  <TripLocationInput
                    locations={tripLocations}
                    setLocations={setTripLocations}
                  />
                </div>
                <BudgetInput
                  label="งบต่อคน"
                  value={tripBudget}
                  onChange={(e) => setTripBudget(e.target.value)}
                />
                <DurationInput
                  label="จำนวนวัน"
                  value={tripDuration}
                  onChange={(e) => setTripDuration(e.target.value)}
                />
                <DateInput
                  label="วันที่ปิดการโหวต"
                  value={voteCloseDate}
                  onChange={(e) => setVoteCloseDate(e.target.value)}
                />
                <DateInput
                  label="วันที่ปิดการเข้าร่วม"
                  value={joinCloseDate}
                  onChange={(e) => setJoinCloseDate(e.target.value)}
                />
                <DateRangeDisplay
                  tripStartDate={tripStartDate}
                  tripEndDate={tripEndDate}
                  setTripStartDate={setTripStartDate}
                  setTripEndDate={setTripEndDate}
                />
                <div className="flex justify-center w-full">
                  <Button
                    variant="success3"
                    size="lg"
                    className="w-100"
                    onClick={() => handleCreateTrip("vote")}
                  >
                    Create Vote Trip
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </main>
  );
}

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
    <label className="text-base font-medium text-gray-700 w-32 shrink-0">
      {label}:
    </label>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="px-4 py-2 border border-gray-300 rounded-lg text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-shadow"
    />
  </div>
);

const DateInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
    <label className="text-base font-medium text-gray-700 w-32 shrink-0">
      {label}:
    </label>
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="px-4 py-2 border border-gray-300 rounded-lg text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-shadow"
    />
  </div>
);

const BudgetInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
    <label className="text-base font-medium text-gray-700 w-32 shrink-0">
      {label}:
    </label>
    <div className="flex items-center w-full border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
      <input
        type="text"
        placeholder="0.00"
        value={value}
        onChange={onChange}
        className="flex-grow px-4 py-2 text-base outline-none bg-transparent border-none"
      />
      <span className="text-base font-medium text-gray-600 bg-gray-100 px-3 py-2 border-l border-gray-300 rounded-r-lg select-none">
        บาท
      </span>
    </div>
  </div>
);

const DurationInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
    <label className="text-base font-medium text-gray-700 w-32 shrink-0">
      {label}:
    </label>
    <div className="flex items-center w-full border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
      <input
        type="text"
        placeholder="0"
        value={value}
        onChange={onChange}
        className="flex-grow px-4 py-2 text-base outline-none bg-transparent border-none"
      />
      <span className="text-base font-medium text-gray-600 bg-gray-100 px-3 py-2 border-l border-gray-300 rounded-r-lg select-none">
        วัน
      </span>
    </div>
  </div>
);

const DateRangeDisplay = ({
  tripStartDate,
  tripEndDate,
  setTripStartDate,
  setTripEndDate,
}: {
  tripStartDate: Date | null;
  tripEndDate: Date | null;
  setTripStartDate: (date: Date | null) => void;
  setTripEndDate: (date: Date | null) => void;
}) => {
  const [pickerKey, setPickerKey] = useState(0);
  const duration =
    tripStartDate && tripEndDate
      ? Math.floor(
          (tripEndDate.getTime() - tripStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;
  const handleResetCalendar = () => {
    setTripStartDate(null);
    setTripEndDate(null);
    setPickerKey((prev) => prev + 1);
  };

  return (
    <div className="w-full flex flex-col items-center sm:items-start pt-4 border-t border-gray-100">
      <p className="text-base font-medium text-gray-700 mb-3">
        เลือกช่วงวันที่:
      </p>

      <div className="flex flex-col w-full items-center">
        <div className="origin-top">
          <TripDateRangePicker
            tripStartDate={tripStartDate || new Date()}
            tripEndDate={
              tripEndDate ||
              new Date(new Date().setDate(new Date().getDate() + 360))
            }
            onChange={(start, end) => {
              setTripStartDate(start);
              setTripEndDate(end);
            }}
          />
        </div>

        {tripStartDate && tripEndDate && (
          <div className="flex flex-col items-center mt-3">
            <p className="text-gray-700 text-center text-base mb-3">
              <strong className="font-semibold text-indigo-700">
                คุณเลือกวันที่:
              </strong>{" "}
              {tripStartDate.toLocaleDateString("th-TH")} -{" "}
              {tripEndDate.toLocaleDateString("th-TH")}
              <br />
              <strong className="font-semibold text-indigo-700">
                จำนวนวันที่เลือก:
              </strong>{" "}
              {duration} วัน
            </p>
            {/* 🔹 ปุ่มรีเซ็ตเฉพาะปฏิทิน */}
            <button
              onClick={handleResetCalendar}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
            >
              เลือกใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
