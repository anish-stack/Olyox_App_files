import React, { useEffect, useState, useRef } from "react";
import { View, Text, Button, ScrollView, AppState } from "react-native";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import {
  registerBackgroundSocketTask,
  testBackgroundTaskNow,
  getLastRunTime,
} from "./context/backgroundTasks/socketTask";

export default function Test() {
  const [status, setStatus] = useState("Checking...");
  const [isRegistered, setIsRegistered] = useState(false);
  const [lastRun, setLastRun] = useState("N/A");
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const init = async () => {
      const fetchStatus = await BackgroundFetch.getStatusAsync();
      setStatus(
        fetchStatus === BackgroundFetch.BackgroundFetchStatus.Available
          ? "✅ Available"
          : "❌ Not Available"
      );

      const registered = await TaskManager.isTaskRegisteredAsync("background-socket-task");
      setIsRegistered(registered);

      const lastRunTime = await getLastRunTime();
      setLastRun(lastRunTime ? new Date(lastRunTime).toLocaleString() : "Never");
    };

    registerBackgroundSocketTask();
    init();

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/active/) && nextAppState === "background") {
      console.log("📴 App has moved to the background - start monitoring or background task here");
      // You can trigger some async task here or log
      await testBackgroundTaskNow(); // Optional: simulate your background task
    }

    appState.current = nextAppState;
  };

  const handleManualTest = async () => {
    await testBackgroundTaskNow();
    const time = await getLastRunTime();
    setLastRun(time ? new Date(time).toLocaleString() : "Never");
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#f0f0f0",
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 20, fontWeight: "bold" }}>
        📦 Background Socket Diagnostics
      </Text>
      <Text style={{ marginBottom: 10 }}>Status: {status}</Text>
      <Text style={{ marginBottom: 10 }}>
        Task Registered: {isRegistered ? "✅ Yes" : "❌ No"}
      </Text>
      <Text style={{ marginBottom: 10 }}>Last Run: {lastRun}</Text>
      <View style={{ marginTop: 20, width: "100%", alignItems: "center" }}>
        <Button title="🔁 Run Task Now" onPress={handleManualTest} />
      </View>
    </ScrollView>
  );
}
