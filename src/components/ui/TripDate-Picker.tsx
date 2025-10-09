"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./TripDatePicker.css";

interface TripDateRangePickerProps {
  tripStartDate: Date;
  tripEndDate: Date;
  onChange?: (start: Date, end: Date) => void;
  // ⭐ 1. เพิ่ม Prop 'disabled' ใน Interface
  disabled?: boolean;
  withPortal?: boolean; // ⭐ เพิ่ม Prop นี้ถ้าคุณเคยใช้มันเพื่อแก้ปัญหาล้นขอบ
}

export default function TripDateRangePicker({
  tripStartDate,
  tripEndDate,
  onChange,
  // ⭐ 2. รับค่า 'disabled' และกำหนดค่าเริ่มต้นเป็น false
  disabled = false,
  withPortal = false,
}: TripDateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  return (
    <DatePicker
      selected={startDate}
      onChange={(dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);
        if (start && end && onChange) onChange(start, end);
      }}
      startDate={startDate}
      endDate={endDate}
      selectsRange
      minDate={tripStartDate}
      maxDate={tripEndDate}
      inline
      // ⭐ 3. ส่งค่า disabled และ withPortal ต่อไปยัง DatePicker
      disabled={disabled}
      withPortal={withPortal}
    />
  );
}
