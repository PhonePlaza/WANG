import React, { Dispatch, SetStateAction, useState } from "react";

interface LocationInputProps {
  tripLocations: string[];
  setTripLocations: Dispatch<SetStateAction<string[]>>;
}

export default function LocationInput({
  tripLocations,
  setTripLocations,
}: LocationInputProps) {
  const [newLocation, setNewLocation] = useState("");

  const handleAddLocation = () => {
    if (newLocation.trim() === "") return; // ไม่เพิ่มถ้าว่าง
    setTripLocations([...tripLocations, newLocation.trim()]);
    setNewLocation(""); // เคลียร์ input
  };

  const handleRemoveLocation = (index: number) => {
    setTripLocations(tripLocations.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Input + Add button */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="กรอกสถานที่ใหม่"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          className="px-3 py-2 border rounded-md w-[400px]"
        />
        <button
          type="button"
          onClick={handleAddLocation}
          className="px-3 py-2 bg-blue-500 text-white rounded"
        >
          Add
        </button>
      </div>

      {/* รายการสถานที่ */}
      <div className="flex flex-col gap-2">
        {tripLocations.map((loc, index) => (
          <div
            key={index}
            className="flex items-center justify-between border p-2 rounded"
          >
            <span>{loc}</span>
            <button
              type="button"
              onClick={() => handleRemoveLocation(index)}
              className="px-2 py-1 bg-red-500 text-white rounded"
            >
              ลบ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
