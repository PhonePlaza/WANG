"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import StepForm from "@/components/ui/step/StepContent";
import { Loader2 } from "lucide-react";

interface Trip {
  trip_id: number;
  trip_name: string;
  location: string | null;
  budget_per_person: number;
  num_days: number;
  date_range_start: string;
  date_range_end: string;
  vote_close_date: string | null;
  created_by: string;
}

interface TripLocationRow {
  location_id: number;
  location_name: string;
  trip_id: number;
}

interface LocationOption {
  id: number;
  name: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function TripVotePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.tripId);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [creatorName, setCreatorName] = useState<string>("ไม่ทราบชื่อ");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [votedLocationName, setVotedLocationName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [winningLocationName, setWinningLocationName] = useState<string | null>(null);

  const supabase = createClient();

  const updateWinningLocation = async () => {
    const { data: votes, error: votesError } = await supabase
      .from("trip_votes")
      .select("location_id")
      .eq("trip_id", tripId);

    if (votesError || !votes || votes.length === 0) {
      setWinningLocationName(null);
      return;
    }

    const voteCounts: Record<number, number> = {};
    votes.forEach((v: { location_id: number }) => {
      voteCounts[v.location_id] = (voteCounts[v.location_id] || 0) + 1;
    });

    let maxVotes = 0;
    let topLocationId: number | null = null;
    
    Object.entries(voteCounts).forEach(([locIdStr, count]) => {
      const locId = Number(locIdStr);
      if (count > maxVotes) {
        maxVotes = count;
        topLocationId = locId;
      }
    });

    if (topLocationId === null) return;
    
    const { data: locData } = await supabase
      .from("trip_locations")
      .select("location_name")
      .eq("location_id", topLocationId)
      .single();

    if (locData?.location_name) {
      const winningName = locData.location_name;
      setWinningLocationName(winningName);
      
      await supabase
        .from("trips")
        .update({ location: winningName })
        .eq("trip_id", tripId);
        
      setTrip(prev => (prev ? { ...prev, location: winningName } : null)); 
    }
  };

  const fetchTrip = async () => { 
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("trip_id", tripId)
      .single();

    if (error) return console.error("Fetch trip error:", error);

    if (data) {
      setTrip(data as Trip);
      fetchCreatorName(data.created_by);
      checkVoteStatus(data.trip_id, data.location);
      checkVoteClose(data as Trip);
      updateWinningLocation(); // โหลดผู้ชนะล่าสุดเมื่อเข้าหน้า
    }
  };

  const fetchCreatorName = async (userId: string) => { 
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (!error && data?.full_name) setCreatorName(data.full_name);
  };
    
  const fetchLocations = async () => { 
    const { data, error } = await supabase
      .from("trip_locations")
      .select("location_id, location_name, trip_id")
      .eq("trip_id", tripId);

    if (error) return console.error("Fetch locations error:", error);

    const mapped: LocationOption[] = (data as TripLocationRow[]).map((item) => ({
      id: item.location_id,
      name: item.location_name,
    }));
    setLocations(mapped);
  };
    
  const checkVoteStatus = async (trip_id: number, finalLocation: string | null) => { 
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (finalLocation) return; 

    const { data, error } = await supabase
      .from("trip_votes")
      .select("location_id")
      .eq("trip_id", trip_id)
      .eq("user_id", userData.user.id)
      .single();

    if (!error && data) {
      setHasVoted(true);
      const votedLoc = locations.find((loc) => loc.id === data.location_id);
      if (votedLoc) setVotedLocationName(votedLoc.name);
      else {
        const { data: locData } = await supabase
          .from("trip_locations")
          .select("location_name")
          .eq("location_id", data.location_id)
          .single();
        if (locData?.location_name) setVotedLocationName(locData.location_name);
      }
    }
  };

  const checkVoteClose = async (tripData: Trip) => { 
    if (!tripData.vote_close_date) return;
    const now = new Date();
    const closeDate = new Date(tripData.vote_close_date);

    if (now >= closeDate) {
      if (!tripData.location) {
        await updateWinningLocation(); 
      }
      router.push(`/trip/${tripData.trip_id}`);
    }
  };

  const handleVote = async () => { 
    if (!selectedLocation) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setLoading(true);
    
    // Check if already voted (for UPSERT behavior simulation)
    const { data: existingVote } = await supabase
        .from("trip_votes")
        .select("vote_id")
        .eq("trip_id", tripId)
        .eq("user_id", userData.user.id)
        .single();

    let error;
    if (existingVote) {
        // Update existing vote
        ({ error } = await supabase.from("trip_votes")
            .update({ location_id: selectedLocation })
            .eq("vote_id", existingVote.vote_id));
    } else {
        // Insert new vote
        ({ error } = await supabase.from("trip_votes").insert({
            trip_id: tripId,
            user_id: userData.user.id,
            location_id: selectedLocation,
        }));
    }
    
    setLoading(false);

    if (!error) {
      await updateWinningLocation(); 

      const votedName = locations.find((loc) => loc.id === selectedLocation)?.name || "";
      setHasVoted(true);
      setVotedLocationName(votedName);
      alert("โหวตเรียบร้อยแล้ว!");
    } else {
      console.error("Vote error:", error);
      alert("เกิดข้อผิดพลาดในการโหวต");
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchLocations().then(() => fetchTrip());
    }
  }, [tripId]);
    
  useEffect(() => {
    if (trip && locations.length > 0) {
      checkVoteStatus(trip.trip_id, trip.location);
    }
  }, [trip, locations]);

  if (!trip)
    return (
        <p className="text-center mt-20 text-gray-500 font-medium text-lg flex items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลดข้อมูลทริป...
        </p>
    );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto mt-8 space-y-8 bg-white shadow-2xl rounded-3xl border border-gray-100">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-inner border-b-2 border-indigo-100">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-wide text-gray-800">
            🗳️ Trip Vote: {trip.trip_name}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">จัดการและโหวตสถานที่ท่องเที่ยวของคุณ</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <StepForm currentStep={2} totalSteps={4}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 bg-indigo-50 p-8 rounded-2xl shadow-lg border border-indigo-200 space-y-5">
          <h2 className="text-2xl font-extrabold text-indigo-800 border-b-2 border-indigo-300 pb-3 mb-4">
            🗺️ รายละเอียดทริป
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs font-medium text-gray-500">สร้างโดย:</p>
                <p className="font-semibold text-lg text-gray-800">{creatorName}</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs font-medium text-gray-500">งบประมาณต่อคน:</p>
                <p className="font-semibold text-lg text-green-600">{trip.budget_per_person.toLocaleString()} บาท</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs font-medium text-gray-500">จำนวนวัน:</p>
                <p className="font-semibold text-lg">{trip.num_days} วัน</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs font-medium text-gray-500">ช่วงวันที่:</p>
                <p className="font-semibold text-lg">{formatDate(trip.date_range_start)} - {formatDate(trip.date_range_end)}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-indigo-200">
            <p className="mt-2 text-sm font-semibold text-red-600">
                ⚠️ วันปิดโหวต: {trip.vote_close_date ? formatDate(trip.vote_close_date) : "ยังไม่ระบุ"}
            </p>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-5">
          {hasVoted ? (
            <div className="text-center font-medium space-y-4">
              <span className="text-6xl block text-green-500">✔</span> 
              <p className="text-xl font-bold text-gray-800">คุณได้โหวตแล้ว</p>
              <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-300 shadow-inner">
                <p className="text-lg font-semibold">สถานที่ที่เลือก:</p>
                <p className="text-2xl font-extrabold">{votedLocationName}</p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-xl mb-4 text-gray-800 border-b pb-2">
                📍 เลือกสถานที่โหวต
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {locations.map((loc) => (
                  <label
                    key={loc.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedLocation === loc.id
                        ? "bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-200"
                        : "bg-gray-50 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300"
                    } font-medium`}
                  >
                    <input
                      type="radio"
                      name="location"
                      value={loc.id}
                      checked={selectedLocation === loc.id}
                      onChange={() => setSelectedLocation(loc.id)}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <span className="text-base">{loc.name}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleVote}
                disabled={loading || selectedLocation === null}
                className="mt-6 w-full py-3 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "ยืนยันการโหวต"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}