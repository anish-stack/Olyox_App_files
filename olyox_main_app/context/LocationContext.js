import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const locationWatcher = useRef(null);

  const ACCURACY_THRESHOLD = 700;
  const MAX_HISTORY_LENGTH = 5;  

  const getSmoothedLocation = (coords) => {
    const updatedHistory = [...locationHistory, coords].slice(-MAX_HISTORY_LENGTH);
    setLocationHistory(updatedHistory);

    const avgLat = updatedHistory.reduce((sum, loc) => sum + loc.latitude, 0) / updatedHistory.length;
    const avgLng = updatedHistory.reduce((sum, loc) => sum + loc.longitude, 0) / updatedHistory.length;

    return {
      ...coords,
      latitude: avgLat,
      longitude: avgLng,
    };
  };

  const startWatchingLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMsg("Location services are disabled");
        return;
      }

      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 1,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          const { coords } = loc;

          console.log("📡 Location update:", coords);

          if (coords.accuracy <= ACCURACY_THRESHOLD) {
            // Optional: Use smoothed location
            const smoothedCoords = getSmoothedLocation(coords);
            setLocation({ coords: smoothedCoords });
            setErrorMsg(null);
          } else {
            console.log("❌ Ignored (Low Accuracy):", coords.accuracy);
          }
        }
      );

      locationWatcher.current = watcher;
    } catch (error) {
      console.error("Error setting up location watcher:", error);
      setErrorMsg("Error watching location");
    }
  };

  useEffect(() => {
    startWatchingLocation();

    return () => {
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
    };
  }, []);

  return (
    <LocationContext.Provider value={{ location, errorMsg }}>
      {children}
    </LocationContext.Provider>
  );
};

// Custom hook to use location
export const useLocation = () => useContext(LocationContext);
