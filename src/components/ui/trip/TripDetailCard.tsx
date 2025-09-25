"use client";

import React from "react";

interface TripDetailCardProps {
  trip: {
    trip_id: number;
    trip_name: string;
    location: string;
    budget_per_person: number;
    num_days: number;
    join_deadline: string;
    date_range_start: string;
    date_range_end: string;
    created_by: string;
  };
}

export default function TripDetailCard({ trip }: TripDetailCardProps) {
  return (
    <div className="border rounded-lg p-6 w-full max-w-md shadow-md">
      <p><strong>ชื่อทริป:</strong> {trip.trip_name}</p>
      <p><strong>สถานที่:</strong> {trip.location}</p>
      <p><strong>งบต่อคน:</strong> {trip.budget_per_person}</p>
      <p><strong>จำนวนวัน:</strong> {trip.num_days}</p>
      <p>
        <strong>วันที่ปิดการเข้าร่วม:</strong>{" "}
        {trip.join_deadline}
      </p>
      <p>
        <strong>วันที่เริ่ม-สิ้นสุด:</strong>{" "}
        {trip.date_range_start} - {trip.date_range_end}
      </p>
    </div>
  );
}
