// components/MapUpdaterClient.js
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function MapUpdaterClient({ routeCoords }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords.length > 0) {
      const bounds = routeCoords.map(c => [c[0], c[1]]);
      map.fitBounds(bounds);
    }
  }, [routeCoords]);

  return null;
}
