"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Users, CalendarDays, Plus } from 'lucide-react';

// Custom CSS for animations
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  .animate-slideUp { animation: slideUp 0.3s ease-out; }
`;

// Interface สำหรับ Trip
interface Trip {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  members: number;
  color: string;
  status: 'planning' | 'confirmed' | 'completed';
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripModal, setShowTripModal] = useState<boolean>(false);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const sampleTrips: Trip[] = [
        { id: 1, title: "เชียงใหม่ทริป", startDate: new Date(2025, 9, 15), endDate: new Date(2025, 9, 18), location: "เชียงใหม่", members: 5, color: "bg-blue-500", status: "confirmed" },
        { id: 2, title: "ภูเก็ตวีคเอนด์", startDate: new Date(2025, 9, 25), endDate: new Date(2025, 9, 27), location: "ภูเก็ต", members: 8, color: "bg-green-500", status: "planning" },
        { id: 3, title: "กรุงเทพ One Day", startDate: new Date(2025, 9, 5), endDate: new Date(2025, 9, 5), location: "กรุงเทพ", members: 3, color: "bg-purple-500", status: "completed" },
        { id: 4, title: "เกาะสมุย Retreat", startDate: new Date(2025, 10, 8), endDate: new Date(2025, 10, 12), location: "เกาะสมุย", members: 6, color: "bg-orange-500", status: "planning" }
      ];
      setTimeout(() => {
        setTrips(sampleTrips);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrips(); }, []);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => { const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); return firstDay === 0 ? 6 : firstDay - 1; };
  const navigateMonth = (dir: number) => { const newDate = new Date(currentDate); newDate.setMonth(currentDate.getMonth() + dir); setCurrentDate(newDate); };
  const isDateInTrip = (date: number, trip: Trip) => { const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), date); return d >= trip.startDate && d <= trip.endDate; };
  const getTripForDate = (date: number) => trips.filter(trip => isDateInTrip(date, trip));
  const isToday = (date: number) => { const today = new Date(); const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), date); return d.toDateString() === today.toDateString(); };

  const getStatusColor = (status: Trip['status']) => { switch(status){case'confirmed':return'bg-blue-500';case'planning':return'bg-yellow-500';case'completed':return'bg-gray-500';default:return'bg-gray-300';} };
  const getBorderStatusColor = (status: Trip['status']) => { switch(status){case'confirmed':return'border-l-blue-500';case'planning':return'border-l-yellow-500';case'completed':return'border-l-gray-500';default:return'border-l-gray-300';} };

  const handleCreateTripClick = () => { alert('จะนำทางไปหน้าสร้างทริป (ยังไม่ได้เชื่อมต่อ)'); };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    for(let i=0;i<firstDay;i++) days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    for(let date=1; date<=daysInMonth; date++){
      const dayTrips = getTripForDate(date);
      const isCurrentDay = isToday(date);
      days.push(
        <div key={date} className={`h-24 border border-gray-200 p-1 relative cursor-pointer hover:bg-gray-50 ${isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
          onClick={()=>{ if(dayTrips.length>0){ setSelectedTrip(dayTrips[0]); setShowTripModal(true); } }}
        >
          <div className={`text-sm font-medium ${isCurrentDay?'text-blue-600':'text-gray-900'}`}>{date}</div>
          {dayTrips.length>0 && (
            <div className="mt-1 space-y-1">
              {dayTrips.slice(0,2).map((trip,index)=>(
                <div key={`${trip.id}-${index}`} className={`text-xs px-1 py-0.5 rounded text-white truncate ${trip.color}`} title={trip.title}>{trip.title}</div>
              ))}
              {dayTrips.length>2 && <div className="text-xs text-gray-500">+{dayTrips.length-2} อื่นๆ</div>}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <React.Fragment>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ปฏิทินทริป</h1>
                <p className="text-gray-600 mt-1">จัดการและติดตามทริปทั้งหมดของคุณ</p>
              </div>
              <button onClick={handleCreateTripClick} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" /> สร้างทริปใหม่
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                  <div className="flex gap-2">
                    <button onClick={()=>navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={()=>setCurrentDate(new Date())} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Today</button>
                    <button onClick={()=>navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-500">Loading trip data...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-0 mb-2">{dayNames.map(day=><div key={day} className="h-8 flex items-center justify-center"><span className="text-sm font-medium text-gray-500">{day}</span></div>)}</div>
                      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">{renderCalendarDays()}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trip Statistics */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">สถิติทริป</h3>
                <div className="space-y-4">
                  <div className="flex justify-between"><span className="text-gray-600">ทริปทั้งหมด</span><span className="font-semibold">{trips.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">กำลังวางแผน</span><span className="font-semibold text-yellow-600">{trips.filter(t=>t.status==='planning').length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">ยืนยันแล้ว</span><span className="font-semibold text-blue-600">{trips.filter(t=>t.status==='confirmed').length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">เสร็จสิ้น</span><span className="font-semibold text-gray-600">{trips.filter(t=>t.status==='completed').length}</span></div>
                </div>
              </div>

              {/* Upcoming Trips */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ทริปที่กำลังจะมา</h3>
                {loading ? (
                  <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="animate-pulse"><div className="h-4 bg-gray-200 rounded mb-2"></div><div className="h-3 bg-gray-200 rounded w-3/4"></div></div>)}</div>
                ) : (
                  <div className="space-y-3">
                    {trips.filter(trip=>trip.startDate>=new Date()).sort((a,b)=>a.startDate.getTime()-b.startDate.getTime()).slice(0,3).map(trip=>(
                      <div key={trip.id} className={`border-l-4 ${getBorderStatusColor(trip.status)} bg-gray-50 p-3 rounded-r cursor-pointer hover:bg-gray-100 transition-colors`} onClick={()=>{setSelectedTrip(trip); setShowTripModal(true);}}>
                        <h4 className="font-medium text-gray-900">{trip.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />{trip.startDate.toLocaleDateString('th-TH',{month:'short',day:'numeric'})}</div>
                          <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{trip.location}</div>
                          <div className="flex items-center gap-1"><Users className="w-4 h-4" />{trip.members}</div>
                        </div>
                      </div>
                    ))}
                    {trips.filter(trip=>trip.startDate>=new Date()).length===0 && <p className="text-gray-500 text-center py-4">No upcoming trips</p>}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะทริป</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3"><div className="w-4 h-4 bg-yellow-500 rounded"></div><span className="text-sm text-gray-600">กำลังวางแผน</span></div>
                  <div className="flex items-center gap-3"><div className="w-4 h-4 bg-blue-500 rounded"></div><span className="text-sm text-gray-600">ยืนยันแล้ว</span></div>
                  <div className="flex items-center gap-3"><div className="w-4 h-4 bg-gray-500 rounded"></div><span className="text-sm text-gray-600">เสร็จสิ้น</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Detail Modal */}
          {showTripModal && selectedTrip && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={()=>setShowTripModal(false)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform animate-slideUp" onClick={(e)=>e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{selectedTrip.title}</h3>
                    <button onClick={()=>setShowTripModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  {/* Modal content */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-full"><MapPin className="w-4 h-4 text-blue-600"/></div>
                      <div><p className="text-sm text-gray-500">Location</p><p className="font-medium text-gray-900">{selectedTrip.location}</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-full"><CalendarDays className="w-4 h-4 text-green-600"/></div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">
                          {selectedTrip.startDate.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}
                          {selectedTrip.startDate.getTime()!==selectedTrip.endDate.getTime() && ` - ${selectedTrip.endDate.toLocaleDateString('en-US',{month:'long',day:'numeric'})}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-full"><Users className="w-4 h-4 text-purple-600"/></div>
                      <div><p className="text-sm text-gray-500">Members</p><p className="font-medium text-gray-900">{selectedTrip.members} people</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full ${selectedTrip.color} flex items-center justify-center`}><div className="w-3 h-3 bg-white rounded-full"></div></div>
                      <div><p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium text-gray-900">
                          {selectedTrip.status==='planning'?'Planning':selectedTrip.status==='confirmed'?'Confirmed':'Completed'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors">View Details</button>
                    <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors">Edit Trip</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

export default Calendar;
