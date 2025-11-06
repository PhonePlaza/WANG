"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import StepForm from "@/components/ui/step/StepContent";
import { createClient } from "@/lib/supabase/client";
import TripDateRangePicker from "@/components/ui/TripDate-Picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TripLocationInput from "@/components/ui/TripLocationInput";
import { Loader2 } from "lucide-react";


interface LocationOption {
    id: number;
    name: string;
}
function formatLocalDate(date: Date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
}

async function notifyTripCreatedAPI(params: {
    groupId: number;
    tripName: string;
    dateStart?: string | null;
    dateEnd?: string | null;
}) {
    try {
        await fetch("/api/trip/notify-created", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
        });
    } catch (e) {
        console.warn("notifyTripCreated failed:", e);
    }
}

function CreateTripInner() {
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
    const [groupId, setGroupId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const totalSteps = activeTab === "custom" ? 3 : 4;
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const id = searchParams.get("groupId");
        if (id) setGroupId(parseInt(id));
    }, [searchParams]);

    const insertTripMembers = useCallback(
        async (newTripId: number, groupId: number) => {
            const { data: members, error: memberError } = await supabase
                .from("group_members")
                .select("user_id")
                .eq("group_id", groupId);

            if (memberError || !members?.length) {
                console.error("Fetch group members error:", memberError);
                alert(
                    memberError
                        ? "เกิดข้อผิดพลาดในการดึงสมาชิกกลุ่ม"
                        : "ไม่มีสมาชิกในกลุ่มนี้"
                );
                return;
            }

            const tripMembersData = members.map((m) => ({
                trip_id: newTripId,
                user_id: m.user_id,
                status: "PENDING",
            }));

            const { error: tripMembersError } = await supabase
                .from("trip_members")
                .insert(tripMembersData);

            if (tripMembersError) {
                console.error("Insert trip_members error:", tripMembersError);
                alert("เกิดข้อผิดพลาดในการเพิ่มสมาชิกทริป");
                return;
            }

            alert("สร้างทริปและเพิ่มสมาชิกเรียบร้อยแล้ว!");
        },
        [supabase]
    );

    const handleCreateTrip = async (type: "custom" | "vote") => {
        setIsLoading(true); // 👈 เริ่ม Loading
        try {
            const budgetNumber = parseInt(tripBudget);
            const durationNumber = parseInt(tripDuration);
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                alert("กรุณาเข้าสู่ระบบก่อนสร้างทริป");
                setIsLoading(false);
                return;
            }

            if (!groupId) {
                alert("กรุณาเลือกกลุ่มก่อนกลับไปหน้า Home");
                setIsLoading(false);
                router.push(`/home`);
                return;
            }

            if (type === "custom") {
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
                    setIsLoading(false);
                    return;
                }

                if (
                    joinCloseDate &&
                    tripStartDate &&
                    new Date(joinCloseDate) >= tripStartDate
                ) {
                    alert("กรุณาเลือกวันที่ปิดการเข้าร่วมก่อนวันเริ่มทริป");
                    setIsLoading(false);
                    return;
                }

                const { data: tripData, error: tripError } = await supabase
                    .from("trips")
                    .insert([
                        {
                            trip_name: tripName,
                            location: tripLocation,
                            budget_per_person: budgetNumber,
                            num_days: durationNumber,
                            join_deadline: joinCloseDate,
                            date_range_start: formatLocalDate(tripStartDate),
                            date_range_end: formatLocalDate(tripEndDate),
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
                    setIsLoading(false);
                    return;
                }

                await insertTripMembers(tripData.trip_id, groupId);
                await notifyTripCreatedAPI({
                    groupId,
                    tripName,
                    dateStart: tripStartDate ? formatLocalDate(tripStartDate) : null,
                    dateEnd:   tripEndDate   ? formatLocalDate(tripEndDate)   : null,
                });
                router.push(`/trip/${tripData.trip_id}`);
            } else {
                if (
                    !tripName ||
                    tripLocations.length < 2 ||
                    !tripStartDate ||
                    !tripEndDate ||
                    !tripBudget ||
                    !tripDuration ||
                    !joinCloseDate ||
                    !voteCloseDate
                ) {
                    alert(
                        tripLocations.length < 2
                            ? "สำหรับ Vote Trip ต้องเพิ่มสถานที่มากกว่า 1 แห่ง"
                            : "กรุณากรอกข้อมูลให้ครบทุกช่อง"
                    );
                    setIsLoading(false);
                    return;
                }

                if (
                    joinCloseDate &&
                    tripStartDate &&
                    new Date(joinCloseDate) >= tripStartDate
                ) {
                    alert("วันที่ปิดการเข้าร่วมต้องน้อยกว่าวันเริ่มของทริป");
                    setIsLoading(false);
                    return;
                }

                if (
                    joinCloseDate &&
                    voteCloseDate &&
                    new Date(joinCloseDate) <= new Date(voteCloseDate)
                ) {
                    alert("วันที่ปิดโหวตต้องน้อยกว่าวันที่ปิดการเข้าร่วมของทริป");
                    setIsLoading(false);
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
                            date_range_start: formatLocalDate(tripStartDate),
                            date_range_end: formatLocalDate(tripEndDate),
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
                    setIsLoading(false);
                    return;
                }

                const { error: locError } = await supabase
                    .from("trip_locations")
                    .insert(
                        tripLocations.map((l) => ({
                            trip_id: tripData.trip_id,
                            location_name: l.name,
                        }))
                    );

                if (locError) {
                    console.error("Insert trip_locations error:", locError);
                    alert("เกิดข้อผิดพลาดในการบันทึก locations");
                    setIsLoading(false);
                    return;
                }

                await insertTripMembers(tripData.trip_id, groupId);
                await notifyTripCreatedAPI({
                    groupId,
                    tripName,
                    dateStart: tripStartDate ? formatLocalDate(tripStartDate) : null,
                    dateEnd:   tripEndDate   ? formatLocalDate(tripEndDate)   : null,
                });

                router.push(`/trip/${tripData.trip_id}/vote`);
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการสร้างทริป");
        } finally {
            setIsLoading(false); // 👈 สิ้นสุด Loading
        }
    };

    return (
        <main className="p-4 md:p-8 max-w-4xl mx-auto mt-8 space-y-8 bg-white shadow-2xl rounded-3xl border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border-b-2 border-indigo-100">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-wide text-gray-800">➕ Create New Trip</h1>
                    <p className="text-gray-500 mt-1 text-sm">กำหนดรายละเอียดทริปใหม่ของคุณ</p>
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
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                กำลังสร้างทริป...
                                            </>
                                        ) : (
                                            "Create Custom Trip"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

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
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                กำลังสร้างทริป...
                                            </>
                                        ) : (
                                            "Create Vote Trip"
                                        )}
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

const InputField = React.memo(
    ({
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
    )
);
InputField.displayName = "InputField";

const DateInput = React.memo(
    ({
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
    )
);
DateInput.displayName = "DateInput";

const BudgetInput = React.memo(
    ({
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
    )
);
BudgetInput.displayName = "BudgetInput";

const DurationInput = React.memo(
    ({
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
    )
);
DurationInput.displayName = "DurationInput";

const DateRangeDisplay = React.memo(
    ({
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

        const handleResetCalendar = useCallback(() => {
            setTripStartDate(null);
            setTripEndDate(null);
            setPickerKey((prev) => prev + 1);
        }, [setTripStartDate, setTripEndDate]);

        return (
            <div className="w-full flex flex-col items-center sm:items-start pt-4 border-t border-gray-100">
                <p className="text-base font-medium text-gray-700 mb-3">
                    เลือกช่วงวันที่:
                </p>
                <div className="flex flex-col w-full items-center">
                    <div className="origin-top">
                        <TripDateRangePicker
                            key={pickerKey}
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
                            <button
                                onClick={handleResetCalendar}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
                            >
                                เลือกใหม่
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);
DateRangeDisplay.displayName = "DateRangeDisplay";
export default function CreateTripPage() {
    return (
        <Suspense
            fallback={
                <main className="p-6 max-w-4xl mx-auto">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังโหลดแบบฟอร์ม…
                    </div>
                </main>
            }
        >
            <CreateTripInner />
        </Suspense>
    );
}
