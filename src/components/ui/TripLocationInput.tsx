import React, { useState } from "react";

// ประกาศ type สำหรับ location
interface LocationOption {
  id: number;
  name: string;
}

// Props ของ component
interface TripLocationInputProps {
  locations: LocationOption[];
  setLocations: React.Dispatch<React.SetStateAction<LocationOption[]>>;
}

const TripLocationInput: React.FC<TripLocationInputProps> = ({ locations, setLocations }) => {
  const [input, setInput] = useState<string>("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !locations.some(l => l.name === trimmed)) {
      setLocations([...locations, { id: Date.now(), name: trimmed }]);
      setInput("");
    }
  };

  const handleRemove = (locName: string) => {
    setLocations(locations.filter(l => l.name !== locName));
  };

  return (
    <div className="w-full p-4 border rounded-lg shadow-sm">
      {/* Input + Add button */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter location"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3 py-2 border rounded focus:outline-none"
        />
        <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-blue-600">
          Add
        </button>
      </div>

      {/* List ของ location */}
      {locations.length > 0 && (
        <div className="space-y-1">
          {locations.map((loc) => (
            <div key={loc.id} className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded">
              <span>{loc.name}</span>
              <button onClick={() => handleRemove(loc.name)} className="text-red-500 font-bold px-2">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripLocationInput;
