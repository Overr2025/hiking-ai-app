// index.js
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useMap as leafletUseMap } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });

function MapUpdaterClient({ routeCoords }) {
  let map;
  try {
    map = leafletUseMap();
  } catch (e) {
    return null;
  }

  useEffect(() => {
    if (routeCoords.length > 0 && map) {
      const bounds = routeCoords.map(c => [c[0], c[1]]);
      map.fitBounds(bounds);
    }
  }, [routeCoords]);

  return null;
}

export default function HikingApp() {
  const [target, setTarget] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [mounted, setMounted] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeNames, setRouteNames] = useState([]);
  const [routeDescription, setRouteDescription] = useState("");
  const [elevationData, setElevationData] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFindRoutes = async () => {
    if (!target || !difficulty) {
      alert("Unesi cilj i težinu rute.");
      return;
    }

    try {
      const response = await fetch(`/api/hribi?goal=${encodeURIComponent(target)}&difficulty=${encodeURIComponent(difficulty)}`);
      const data = await response.json();

      if (!response.ok || !data?.places?.length) {
        alert("Ruta nije pronađena. Prikazujemo testnu rutu.");
        setAiResponse("Trasa: Pokljuka → Konjščica → Vodnikov dom → Konjsko sedlo → Dom Planika → Mali Triglav → Triglav");
        setRouteDescription("Testna ruta: Klasični pristup Triglavu sa Pokljuke, preko poznatih planinarskih tačaka.");
        const testPlaces = ["Pokljuka", "Konjščica", "Vodnikov dom", "Konjsko sedlo", "Dom Planika", "Mali Triglav", "Triglav"];
        const coords = await Promise.all(testPlaces.map(p => geocodeLocation(p, target)));
        const validCoords = coords.filter(Boolean);
        setRouteCoords(validCoords);
        setRouteNames(testPlaces.filter((_, i) => coords[i]));

        if (validCoords.length > 0) {
          const elevationPoints = await fetchElevation(validCoords);
          setElevationData(elevationPoints);
        }
        return;
      }

      setRouteDescription(data.description);
      setAiResponse("Trasa: " + data.places.join(" → "));

      const coords = await Promise.all(data.places.map(p => geocodeLocation(p, target)));
      const validCoords = coords.filter(Boolean);
      const matchedNames = data.places.filter((_, idx) => coords[idx]);
      setRouteCoords(validCoords);
      setRouteNames(matchedNames);

      if (validCoords.length > 0) {
        const elevationPoints = await fetchElevation(validCoords);
        setElevationData(elevationPoints);
      }
    } catch (err) {
      console.error("Greška u dohvaćanju rute:", err);
      alert("Došlo je do greške prilikom dohvaćanja rute.");
    }
  };

  const geocodeLocation = async (name, goal) => {
    let country = "Slovenia";
    const goalLower = goal.toLowerCase();
    if (goalLower.includes("zugspitze") || goalLower.includes("garmisch")) country = "Germany";
    else if (goalLower.includes("grossglockner") || goalLower.includes("austria")) country = "Austria";

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name + ', ' + country)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (err) {
      console.error("Geocoding error for", name);
    }
    return null;
  };

  const fetchElevation = async (coords) => {
    try {
      const results = await Promise.all(
        coords.map(async ([lat, lon]) => {
          const res = await fetch(`/api/elevation?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          return {
            name: `${lat.toFixed(3)},${lon.toFixed(3)}`,
            elevation: data?.elevation || 0
          };
        })
      );
      return results;
    } catch (err) {
      console.error("Elevation fetch failed:", err);
      return [];
    }
  };

  const downloadGPX = () => {
    if (routeCoords.length === 0) return;
    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="HikingAI" xmlns="http://www.topografix.com/GPX/1/1">`;
    const gpxFooter = `</gpx>`;
    const waypoints = routeCoords.map((coord, idx) => {
      return `<wpt lat="${coord[0]}" lon="${coord[1]}"><name>${routeNames[idx] || "Waypoint"}</name></wpt>`;
    }).join("");
    const gpxContent = `${gpxHeader}${waypoints}${gpxFooter}`;

    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ruta.gpx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Hiking Assistant</h1>

      <Card className="mb-4">
        <CardContent>
          <p>📍 Preporučene rute</p>

          <input
            type="text"
            placeholder="Unesi cilj (npr. Triglav)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <select
            className="border rounded p-2 w-full mb-2"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">Odaberi težinu rute</option>
            <option value="lahka">Laka (lahka)</option>
            <option value="zahtevna">Zahtjevna (zahtevna)</option>
            <option value="zelo zahtevna">Vrlo zahtjevna (zelo zahtevna)</option>
            <option value="brezpotje">Neprečišćena staza (brezpotje)</option>
          </select>

          <div className="flex gap-2">
            <Button onClick={handleFindRoutes}>Pronađi rute</Button>
            <Button onClick={downloadGPX} variant="outline">📅 Preuzmi GPX</Button>
          </div>

          {aiResponse && (
            <div className="mt-4 p-4 border rounded bg-gray-100 whitespace-pre-wrap">
              {aiResponse}
            </div>
          )}

          {routeDescription && (
            <div className="mt-2 p-4 border rounded bg-blue-50 text-sm">
              <strong>Opis rute:</strong> {routeDescription}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent>
          <p>🗺️ Dinamički prikaz trase</p>

          {mounted && (
            <MapContainer
              center={[46.38, 13.84]}
              zoom={13}
              style={{ height: "400px", width: "100%" }}
              whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapUpdaterClient routeCoords={routeCoords} />

              {routeCoords.map((pos, idx) => (
                <Marker key={idx} position={pos}>
                  <Popup>{routeNames[idx] || `Tačka ${idx + 1}`}</Popup>
                </Marker>
              ))}

              {routeCoords.length > 1 && (
                <Polyline positions={routeCoords} pathOptions={{ color: "blue" }} />
              )}
            </MapContainer>
          )}
        </CardContent>
      </Card>

      {elevationData.length > 0 && (
        <Card className="mb-4">
          <CardContent>
            <p className="mb-2">📈 Visinski profil trase</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={elevationData}>
                <XAxis dataKey="name" hide />
                <YAxis unit="m" />
                <Tooltip formatter={(value) => `${value} m`} />
                <Line type="monotone" dataKey="elevation" stroke="#8884d8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent>
          <p>🚨 SOS dugme</p>
          <Button className="mt-2 bg-red-600 text-white">Pošalji SOS</Button>
        </CardContent>
      </Card>
    </div>
  );
}
