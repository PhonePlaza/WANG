"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Users, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";


/**
 * ==============================================================================
 * 1. STYLES, TYPES, & HELPERS
 * ==============================================================================
 */

/** Custom CSS for animations */
const customStyles = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.animate-fadeIn { animation: fadeIn 0.2s ease-out; }
.animate-slideUp { animation: slideUp 0.3s ease-out; }
`;

/** Type definition for data from v_trip_overview or fallback query */
type OverviewRow = {
  trip_id: number;
  trip_name: string;
  group_id: number;
  group_name: string;
  date_range_start: string;
  date_range_end: string;
  location: string;
  num_days: number | null;
  budget_per_person: number | null;
  created_by: string;
  member_count: number | string | null;
};

/**
 * Type definition for the trip data when directly querying the 'trips' table
 * (Used in the fallback logic).
 */
type TripRowFallback = {
  trip_id: number;
  trip_name: string;
  group_id: number;
  date_range_start: string;
  date_range_end: string;
  location: string;
  num_days: number | null;
  budget_per_person: number | null;
};

/** Type definition for the trip data displayed in the component */
type DisplayTrip = {
  id: number;
  title: string;
  groupName: string;
  startDate: Date;
  endDate: Date;
  location: string;
  members: number;
  color: string;
  status: "planning" | "completed";
  budget?: number | null;
  days?: number | null;
};

/** Utility functions for colors and status */
const colorPool = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
const colorFromId = (id: number) => colorPool[Math.abs(id) % colorPool.length];

/** Helper function to get color based on trip status for borders/backgrounds */
const getStatusColor = (s: DisplayTrip["status"]) =>
  s === "planning" ? "bg-yellow-500" : "bg-gray-500";

/**
 * 💡 FIXED UTILITY FUNCTION: Converts nullable values from Supabase (number or string) to a number (0 if null/undefined).
 * This eliminates the use of 'any'.
 */
const toNumber = (v: number | string | null | undefined): number => (
  (v === null || v === undefined) ? 0 : Number(v)
);


/**
 * ==============================================================================
 * 2. MAIN COMPONENT
 * ==============================================================================
 */

export default function Calendar() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // State for Auth/Data
  const [userId, setUserId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Calendar/Trip Data
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trips, setTrips] = useState<DisplayTrip[]>([]);

  // State for Modals
  const [selectedTrip, setSelectedTrip] = useState<DisplayTrip | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [selectedDayTrips, setSelectedDayTrips] = useState<DisplayTrip[]>([]);
  const [selectedDate, setSelectedDate] = useState("");


  /**
   * ----------------------------------------------------------------------------
   * Effect: Session Check (Auth)
   * ----------------------------------------------------------------------------
   */
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (cancel) return;
      if (error || !session) {
        setError(error?.message ?? "Auth session missing! กรุณาเข้าสู่ระบบอีกครั้ง");
        setHasSession(false);
        setLoading(false);
        return;
      }
      setHasSession(true);
      setUserId(session.user.id);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(!!session);
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancel = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);


  /**
   * ----------------------------------------------------------------------------
   * Function: Fetch Trips
   * * *** ⬇️ โค้ดที่แก้ไขแล้ว ⬇️ ***
   * ----------------------------------------------------------------------------
   */
  const fetchTrips = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // 1️⃣ ดึง trip_id ที่ user เป็นสมาชิก
      const { data: userTrips, error: userTripsErr } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", userId);

      if (userTripsErr) throw userTripsErr;
      if (!userTrips || userTrips.length === 0) {
        setTrips([]);
        setLoading(false);
        return;
      }

      const tripIds = userTrips.map((t) => t.trip_id);

      // 2️⃣ ดึงข้อมูล trip ตาม tripIds
      const { data, error: tripsErr } = await supabase
        .from("trips")
        .select(`
          trip_id, trip_name, group_id,
          date_range_start, date_range_end,
          location, num_days, budget_per_person
        `)
        .in("trip_id", tripIds);

      if (tripsErr) throw tripsErr;

      const tripsData: TripRowFallback[] = data || []; 

      if (tripsData.length === 0) {
        setTrips([]);
        setLoading(false);
        return;
      }

      // 2.5: ดึงชื่อ group จาก group_id ทั้งหมดที่ได้มา
      const groupIds = [...new Set(tripsData.map(t => t.group_id))];
      
      //
      // ‼️‼️‼️ นี่คือบรรทัดที่แก้ไขแล้ว ‼️‼️‼️
      //
      const { data: groupsData, error: groupsErr } = await supabase
        .from("group") // <-- ‼️ แก้จาก "groups" เป็น "group"
        .select("group_id, group_name")
        .in("group_id", groupIds);

      if (groupsErr) throw groupsErr;

      // สร้าง Map (ตัวค้นหา) เพื่อจับคู่ group_id -> group_name
      const groupNameMap = new Map<number, string>();
      (groupsData || []).forEach(g => {
        groupNameMap.set(g.group_id, g.group_name);
      });

      // 3️⃣ นับจำนวนสมาชิกแต่ละ trip
      const { data: membersData, error: membersErr } = await supabase
        .from("trip_members")
        .select("trip_id")
        .in("trip_id", tripIds);

      if (membersErr) throw membersErr;

      const memberCounts = new Map<number, number>();
      (membersData || []).forEach((m: { trip_id: number }) => {
        memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) || 0) + 1);
      });

      // 4️⃣ map tripsData เป็น DisplayTrip
      const now = new Date();
      const display: DisplayTrip[] = tripsData.map((t) => {
        const startDate = new Date(t.date_range_start);
        const endDate = new Date(t.date_range_end);
        const status: DisplayTrip["status"] = endDate < now ? "completed" : "planning";
        return {
          id: t.trip_id,
          title: t.trip_name,
          groupName: groupNameMap.get(t.group_id) || "Unknown Group", 
          startDate,
          endDate,
          location: t.location,
          members: memberCounts.get(t.trip_id) || 0,
          color: colorFromId(t.group_id),
          status,
          budget: t.budget_per_person ?? null,
          days: t.num_days ?? null,
        };
      }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      setTrips(display);
    } catch (e) {
      console.error("Error fetching trips:", e);
      setError(
        e && typeof e === "object" && "message" in e
          ? (e as { message: string }).message
          : "เกิดข้อผิดพลาดในการดึงข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  };


  /**
   * ----------------------------------------------------------------------------
   * Effect: Trigger Fetch Trips when userId is available
   * ----------------------------------------------------------------------------
   */
  useEffect(() => { 
    if (userId) {
      fetchTrips(); 
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps


  /**
   * ----------------------------------------------------------------------------
   * Helper Functions for Calendar Logic and UI
   * ----------------------------------------------------------------------------
   */
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => { 
    return new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  };
  const navigateMonth = (dir: number) => { 
    const nd = new Date(currentDate); 
    nd.setMonth(currentDate.getMonth() + dir); 
    setCurrentDate(nd); 
  };
  const isToday = (date: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    const today = new Date();
    return checkDate.getFullYear() === today.getFullYear() &&
           checkDate.getMonth() === today.getMonth() &&
           checkDate.getDate() === today.getDate();
  };
  const isDateInTrip = (date: number, t: DisplayTrip) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(t.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(t.endDate);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  };
  const getTripForDate = (date: number) => trips.filter((t) => isDateInTrip(date, t));


  /**
   * ----------------------------------------------------------------------------
   * Function: Render Calendar Days
   * ----------------------------------------------------------------------------
   */
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate); // 0=Sunday, 1=Monday...
    const days: React.ReactNode[] = [];
    
    // Add empty divs for the days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200 bg-gray-50" />);
    }
    
    // Render days of the month
    for (let date = 1; date <= daysInMonth; date++) {
      const dayTrips = getTripForDate(date);
      const today = isToday(date);
      
      days.push(
        <div 
          key={date} 
          className={`h-24 border border-gray-200 p-1 relative overflow-hidden ${
            today ? "bg-blue-50 border-blue-300" : "bg-white"
          }`}
        >
          <div className={`text-sm font-medium ${today ? "text-blue-600" : "text-gray-900"}`}>
            {date}
          </div>
          {dayTrips.length > 0 && (
            <div className="mt-1 space-y-1">
              {/* Show up to 2 trips */}
              {dayTrips.slice(0, 2).map((trip, idx) => (
                <div
                  key={`${trip.id}-${idx}`}
                  className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${trip.color}`}
                  title={trip.title}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedTrip(trip); 
                    setShowTripModal(true); 
                  }}
                >
                  {trip.title}
                </div>
              ))}
              {/* Show 'more' link if there are more than 2 trips */}
              {dayTrips.length > 2 && (
                <div
                  className="text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-800 hover:underline px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), date)
                      .toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
                    setSelectedDate(dateStr);
                    setSelectedDayTrips(dayTrips);
                    setShowDayEventsModal(true);
                  }}
                >
                  +{dayTrips.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };


  /**
   * ----------------------------------------------------------------------------
   * Component Render
   * ----------------------------------------------------------------------------
   */
  return (
    <React.Fragment>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trip Calendar</h1>
                <p className="text-gray-600 mt-1">track all your trips</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">Error occurred:</p>
              <p className="text-sm">{error}</p>
              {hasSession === false && (
                <button 
                  onClick={() => router.push("/auth")} 
                  className="mt-3 text-sm px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  Sign In Again
                </button>
              )}
            </div>
          )}

          {/* Main Layout (Calendar + Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Calendar View */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm">
                
                {/* Calendar Navigation */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigateMonth(-1)} 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date())} 
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => navigateMonth(1)} 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                        <p className="text-gray-500">Loading trips...</p>
                      </div>
                    </div>
                  ) : trips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
                      <p className="mb-3">No trips found in your calendar</p>
                      <p className="text-sm text-gray-400 mb-4">Create a new trip or join a group to find out more.</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => router.push("/group")} 
                          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          Manage Groups
                        </button>
                        <button 
                          onClick={() => router.push("/home")} 
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Create New Trip
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Day Labels */}
                      <div className="grid grid-cols-7 gap-0 mb-2">
                        {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d, i) => (
                          <div key={i} className="h-8 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-500">{d}</span>
                          </div>
                        ))}
                      </div>
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                        {renderCalendarDays()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Trip Statistics */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Trips</span>
                    <span className="font-semibold text-lg">{trips.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Planning</span>
                    <span className="font-semibold text-lg text-yellow-600">{trips.filter(t=>t.status==='planning').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold text-lg text-gray-600">{trips.filter(t=>t.status==='completed').length}</span>
                  </div>
                </div>
              </div>
              
              {/* Upcoming Trips */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upcoming Trips
                </h3>
                {trips.filter((t) => t.status === "planning").length === 0 ? (
                  <p className="text-gray-500 text-sm">No upcoming trips</p>
                ) : (
                  <div className="space-y-3">
                    {trips
                      .filter((t) => t.status === "planning")
                      .slice(0, 5)
                      .map((trip) => (
                        <div
                          key={trip.id}
                          className={`p-3 border-l-4 ${
                            trip.status === "planning"
                              ? "border-l-yellow-500"
                              : "border-l-gray-500"
                          } bg-gray-50 rounded-r-lg cursor-pointer hover:bg-gray-100 transition`}
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm break-words">
                                {trip.title}
                              </p>
                              <p className="text-xs text-gray-500">{trip.location}</p>
                              <p className="text-xs text-gray-400">
                                {trip.startDate.toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Trip Status Legend */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Trip Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-700">Planning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="text-gray-700">Completed</span>
                  </div>
                </div>
              </div>

            </div>
            
            
            {/* ------------------------------------------------------------------ */}
            {/* Trip Detail Modal */}
            {/* ------------------------------------------------------------------ */}
            {showTripModal && selectedTrip && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowTripModal(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform animate-slideUp" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-bold text-gray-900">{selectedTrip.title}</h3>
                    </div>
                    <div className="space-y-4 mb-6">
                      {/* Group Name */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-purple-100 rounded-full"><Users className="w-4 h-4 text-purple-600" /></div>
                        <div><p className="text-sm text-gray-500">Group</p><p className="font-medium text-gray-900">{selectedTrip.groupName}</p></div>
                      </div>
                      {/* Location */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-full"><MapPin className="w-4 h-4 text-blue-600" /></div>
                        <div><p className="text-sm text-gray-500">Location</p><p className="font-medium text-gray-900">{selectedTrip.location}</p></div>
                      </div>
                      {/* Date */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-green-100 rounded-full"><CalendarDays className="w-4 h-4 text-green-600" /></div>
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="font-medium text-gray-900">
                            {selectedTrip.startDate.toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
                            {selectedTrip.startDate.getTime() !== selectedTrip.endDate.getTime() &&
                              ` - ${selectedTrip.endDate.toLocaleDateString("en-US",{month:"long",day:"numeric"})}`}
                          </p>
                          {selectedTrip.days && <p className="text-xs text-gray-500 mt-1">{selectedTrip.days} days</p>}
                        </div>
                      </div>
                      {/* Members */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-pink-100 rounded-full"><Users className="w-4 h-4 text-pink-600" /></div>
                        <div><p className="text-sm text-gray-500">Members</p><p className="font-medium text-gray-900">{selectedTrip.members} people</p></div>
                      </div>
                      {/* Budget */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-orange-100 rounded-full">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Budget per person</p>
                          <p className="font-medium text-gray-900">
                            {selectedTrip.budget && selectedTrip.budget > 0 
                              ? `฿${Number(selectedTrip.budget).toLocaleString()}`
                              : <span className="text-gray-400">Not specified</span>
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <button 
                        onClick={() => setShowTripModal(false)} 
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* ------------------------------------------------------------------ */}
            {/* Day Events Modal */}
            {/* ------------------------------------------------------------------ */}
            {showDayEventsModal && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowDayEventsModal(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden transform animate-slideUp" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">All Events on</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedDate}</p>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                    <div className="space-y-3">
                      {selectedDayTrips.map((trip, idx) => (
                        <div
                          key={`day-trip-${trip.id}-${idx}`}
                          className={`border-l-4 ${
                            trip.status === "planning"
                              ? "border-l-yellow-500"
                              : "border-l-gray-500"
                          } bg-gray-50 p-4 rounded-r cursor-pointer hover:bg-gray-100 transition-colors`}
                          onClick={() => { 
                            setShowDayEventsModal(false); 
                            setSelectedTrip(trip); 
                            setShowTripModal(true); 
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">{trip.title}</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /><span>{trip.location}</span></div>
                                <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{trip.members} people</span></div>
                                <div className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />
                                  <span>
                                    {trip.startDate.toLocaleDateString("en-US",{day:"numeric",month:"short"})}
                                    {trip.startDate.getTime() !== trip.endDate.getTime() &&
                                      ` - ${trip.endDate.toLocaleDateString("en-US",{day:"numeric",month:"short"})}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className={`w-3 h-3 rounded-full ${getStatusColor(trip.status)}`} />
                                  <span className="text-xs capitalize">{trip.status}</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-200">
                    <button 
                      onClick={() => setShowDayEventsModal(false)} 
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}