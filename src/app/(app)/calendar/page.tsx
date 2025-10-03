"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Users, CalendarDays, Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// สร้าง Supabase client (ใส่ URL และ Key ของคุณ)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

interface Trip {
  trip_id: number;
  trip_name: string;
  date_range_start: string;
  date_range_end: string;
  location: string;
  group_id: number;
  num_days: number;
  budget_per_person: number;
  created_at: string;
  created_by: string;
  group?: {
    group_name: string;
    num_member: number;
  };
  status?: 'planning' | 'confirmed' | 'completed';
}

interface DisplayTrip {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  members: number;
  color: string;
  status: 'planning' | 'confirmed' | 'completed';
  budget?: number;
  days?: number;
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [trips, setTrips] = useState<DisplayTrip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTrip, setSelectedTrip] = useState<DisplayTrip | null>(null);
  const [showTripModal, setShowTripModal] = useState<boolean>(false);
  const [showDayEventsModal, setShowDayEventsModal] = useState<boolean>(false);
  const [selectedDayTrips, setSelectedDayTrips] = useState<DisplayTrip[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      // ดึงข้อมูล trips พร้อม group data
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          *,
          group:group_id (
            group_name,
            num_member
          )
        `)
        .order('date_range_start', { ascending: true });

      if (tripsError) {
        throw tripsError;
      }

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ component ใช้งาน
      const displayTrips: DisplayTrip[] = (tripsData || []).map((trip: Trip, index: number) => {
        const startDate = new Date(trip.date_range_start);
        const endDate = new Date(trip.date_range_end);
        const now = new Date();
        
        // กำหนดสถานะตามวันที่
        let status: 'planning' | 'confirmed' | 'completed' = 'planning';
        if (endDate < now) {
          status = 'completed';
        } else if (startDate <= now && endDate >= now) {
          status = 'confirmed';
        }

        // กำหนดสีตาม index
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
        const color = colors[index % colors.length];

        return {
          id: trip.trip_id,
          title: trip.trip_name,
          startDate: startDate,
          endDate: endDate,
          location: trip.location,
          members: trip.group?.num_member || 0,
          color: color,
          status: status,
          budget: trip.budget_per_person,
          days: trip.num_days
        };
      });

      setTrips(displayTrips);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => { 
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); 
    return firstDay === 0 ? 6 : firstDay - 1; 
  };
  const navigateMonth = (dir: number) => { 
    const newDate = new Date(currentDate); 
    newDate.setMonth(currentDate.getMonth() + dir); 
    setCurrentDate(newDate); 
  };
  const isDateInTrip = (date: number, trip: DisplayTrip) => { 
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), date); 
    return d >= trip.startDate && d <= trip.endDate; 
  };
  const getTripForDate = (date: number) => trips.filter(trip => isDateInTrip(date, trip));
  const isToday = (date: number) => { 
    const today = new Date(); 
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), date); 
    return d.toDateString() === today.toDateString(); 
  };

  const getStatusColor = (status: DisplayTrip['status']) => { 
    switch(status){
      case'confirmed':return'bg-blue-500';
      case'planning':return'bg-yellow-500';
      case'completed':return'bg-gray-500';
      default:return'bg-gray-300';
    } 
  };
  
  const getBorderStatusColor = (status: DisplayTrip['status']) => { 
    switch(status){
      case'confirmed':return'border-l-blue-500';
      case'planning':return'border-l-yellow-500';
      case'completed':return'border-l-gray-500';
      default:return'border-l-gray-300';
    } 
  };

  const handleCreateTripClick = () => { 
    alert('จะนำทางไปหน้าสร้างทริป (ยังไม่ได้เชื่อมต่อ)'); 
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    for(let i=0;i<firstDay;i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }
    
    for(let date=1; date<=daysInMonth; date++){
      const dayTrips = getTripForDate(date);
      const isCurrentDay = isToday(date);
      days.push(
        <div 
          key={date} 
          className={`h-24 border border-gray-200 p-1 relative ${isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
        >
          <div className={`text-sm font-medium ${isCurrentDay?'text-blue-600':'text-gray-900'}`}>
            {date}
          </div>
          {dayTrips.length>0 && (
            <div className="mt-1 space-y-1">
              {dayTrips.slice(0,2).map((trip,index)=>(
                <div 
                  key={`${trip.id}-${index}`} 
                  className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${trip.color}`} 
                  title={trip.title}
                  onClick={(e)=>{
                    e.stopPropagation();
                    console.log('Clicked trip:', trip.title, 'ID:', trip.id);
                    setSelectedTrip(trip);
                    setShowTripModal(true);
                  }}
                >
                  {trip.title}
                </div>
              ))}
              {dayTrips.length>2 && (
                <div 
                  className="text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-800 hover:underline px-1"
                  onClick={(e)=>{
                    e.stopPropagation();
                    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), date).toLocaleDateString('th-TH', {day: 'numeric', month: 'long', year: 'numeric'});
                    setSelectedDate(dateStr);
                    setSelectedDayTrips(dayTrips);
                    setShowDayEventsModal(true);
                  }}
                >
                  +{dayTrips.length-2} อื่นๆ
                </div>
              )}
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
              <button 
                onClick={handleCreateTripClick} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> สร้างทริปใหม่
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">เกิดข้อผิดพลาด:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={()=>navigateMonth(-1)} 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={()=>setCurrentDate(new Date())} 
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                    <button 
                      onClick={()=>navigateMonth(1)} 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-500">กำลังโหลดข้อมูลทริป...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-0 mb-2">
                        {dayNames.map(day=>
                          <div key={day} className="h-8 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-500">{day}</span>
                          </div>
                        )}
                      </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">สถิติทริป</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ทริปทั้งหมด</span>
                    <span className="font-semibold">{trips.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">กำลังวางแผน</span>
                    <span className="font-semibold text-yellow-600">
                      {trips.filter(t=>t.status==='planning').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ยืนยันแล้ว</span>
                    <span className="font-semibold text-blue-600">
                      {trips.filter(t=>t.status==='confirmed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">เสร็จสิ้น</span>
                    <span className="font-semibold text-gray-600">
                      {trips.filter(t=>t.status==='completed').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upcoming Trips */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ทริปที่กำลังจะมา</h3>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i=>
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trips
                      .filter(trip=>trip.startDate>=new Date())
                      .sort((a,b)=>a.startDate.getTime()-b.startDate.getTime())
                      .slice(0,3)
                      .map(trip=>(
                        <div 
                          key={trip.id} 
                          className={`border-l-4 ${getBorderStatusColor(trip.status)} bg-gray-50 p-3 rounded-r cursor-pointer hover:bg-gray-100 transition-colors`} 
                          onClick={()=>{setSelectedTrip(trip); setShowTripModal(true);}}
                        >
                          <h4 className="font-medium text-gray-900">{trip.title}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4" />
                              {trip.startDate.toLocaleDateString('th-TH',{month:'short',day:'numeric'})}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {trip.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {trip.members}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                    {trips.filter(trip=>trip.startDate>=new Date()).length===0 && (
                      <p className="text-gray-500 text-center py-4">ไม่มีทริปที่กำลังจะมา</p>
                    )}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะทริป</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-sm text-gray-600">กำลังวางแผน</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600">ยืนยันแล้ว</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-500 rounded"></div>
                    <span className="text-sm text-gray-600">เสร็จสิ้น</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Detail Modal */}
          {showTripModal && selectedTrip && (
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" 
              onClick={()=>setShowTripModal(false)}
            >
              <div 
                className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform animate-slideUp" 
                onClick={(e)=>e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{selectedTrip.title}</h3>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <MapPin className="w-4 h-4 text-blue-600"/>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">สถานที่</p>
                        <p className="font-medium text-gray-900">{selectedTrip.location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CalendarDays className="w-4 h-4 text-green-600"/>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">วันที่</p>
                        <p className="font-medium text-gray-900">
                          {selectedTrip.startDate.toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})}
                          {selectedTrip.startDate.getTime()!==selectedTrip.endDate.getTime() && 
                            ` - ${selectedTrip.endDate.toLocaleDateString('th-TH',{month:'long',day:'numeric'})}`
                          }
                        </p>
                        {selectedTrip.days && (
                          <p className="text-xs text-gray-500 mt-1">{selectedTrip.days} วัน</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Users className="w-4 h-4 text-purple-600"/>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">สมาชิก</p>
                        <p className="font-medium text-gray-900">{selectedTrip.members} คน</p>
                      </div>
                    </div>

                    {selectedTrip.budget !== undefined && selectedTrip.budget !== null && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <span className="text-yellow-600 font-semibold">฿</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">งบประมาณต่อคน</p>
                          <p className="font-medium text-gray-900">
                            {selectedTrip.budget === 0 ? 'ยังไม่ระบุ' : `${selectedTrip.budget.toLocaleString('th-TH')} บาท`}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full ${selectedTrip.color} flex items-center justify-center`}>
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">สถานะ</p>
                        <p className="font-medium text-gray-900">
                          {selectedTrip.status==='planning'?'กำลังวางแผน':
                           selectedTrip.status==='confirmed'?'ยืนยันแล้ว':'เสร็จสิ้น'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 bg-blue-400 hover:bg-blue-500 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                      ดูรายละเอียด
                    </button>
                    <button 
                      onClick={()=>setShowTripModal(false)} 
                      className="flex-1 bg-red-400 hover:bg-red-500 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Day Events List Modal */}
          {showDayEventsModal && (
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" 
              onClick={()=>setShowDayEventsModal(false)}
            >
              <div 
                className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden transform animate-slideUp" 
                onClick={(e)=>e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Event ทั้งหมดในวันที่</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedDate}</p>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                  <div className="space-y-3">
                    {selectedDayTrips.map((trip, index) => (
                      <div
                        key={`day-trip-${trip.id}-${index}`}
                        className={`border-l-4 ${trip.color.replace('bg-', 'border-l-')} bg-gray-50 p-4 rounded-r cursor-pointer hover:bg-gray-100 transition-colors`}
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
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{trip.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{trip.members} คน</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                <span>
                                  {trip.startDate.toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}
                                  {trip.startDate.getTime() !== trip.endDate.getTime() && 
                                    ` - ${trip.endDate.toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}`
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(trip.status)}`}></div>
                                <span className="text-xs">
                                  {trip.status === 'planning' ? 'วางแผน' : 
                                   trip.status === 'confirmed' ? 'ยืนยัน' : 'เสร็จสิ้น'}
                                </span>
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
                    onClick={()=>setShowDayEventsModal(false)} 
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    ปิด
                  </button>
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