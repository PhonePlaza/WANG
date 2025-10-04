"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./TripDatePicker.css";

interface TripDateRangePickerProps {
  tripStartDate: Date;
  tripEndDate: Date;
  onChange?: (start: Date, end: Date) => void; 
}

export default function TripDateRangePicker({
  tripStartDate,
  tripEndDate,
  onChange,
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
    />
  );
}
