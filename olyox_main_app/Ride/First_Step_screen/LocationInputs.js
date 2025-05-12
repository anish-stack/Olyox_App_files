"use client"

import { useRef } from "react"
import { View, TextInput, TouchableOpacity, Animated, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import styles from "./Styles"

const LocationInputs = ({ state, setState, isFetchingLocation, onMapSelect }) => {
  const pickupInputRef = useRef(null)
  const dropoffInputRef = useRef(null)
  const loadingAnimation = useRef(new Animated.Value(0)).current
  const debounceTimer = useRef(null)

  const fetchSuggestions = (input, type) => {
    if (!input || input.length < 2) {
      setState((prev) => ({ ...prev, suggestions: [] }))
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    setState((prev) => ({ ...prev, loading: true }))

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://api.srtutorsbureau.com/autocomplete?input=${encodeURIComponent(input)}`)
        const data = await response.json()

        setState((prev) => ({
          ...prev,
          suggestions: data || [],
          loading: false,
          activeInput: type,
        }))
      } catch (error) {
        console.error("Suggestion error:", error)
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to fetch suggestions",
        }))
      }
    }, 300)
  }

  return (
    <View style={styles.inputsContainer}>
      {/* Pickup Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputIconContainer}>
          <Icon name="circle" size={12} color="#35C14F" />
        </View>

        <TextInput
          ref={pickupInputRef}
          style={styles.input}
          placeholder="Enter pickup location"
          placeholderTextColor="#999"
          value={state.pickup}
          onChangeText={(text) => {
            setState((prev) => ({ ...prev, pickup: text }))
            fetchSuggestions(text, "pickup")
          }}
          onFocus={() => {
            setState((prev) => ({ ...prev, activeInput: "pickup" }))
          }}
          multiline
        />

        {isFetchingLocation && state.activeInput === "pickup" ? (
          <Animated.View
            style={{
              opacity: loadingAnimation,
              transform: [
                {
                  scale: loadingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <ActivityIndicator size="small" color="#35C14F" />
          </Animated.View>
        ) : (
          <TouchableOpacity style={styles.mapButton} onPress={() => onMapSelect("pickup")}>
            <Icon name="map-marker" size={24} color="#35C14F" />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropoff Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputIconContainer}>
          <Icon name="square" size={12} color="#D93A2D" />
        </View>

        <TextInput
          ref={dropoffInputRef}
          style={styles.input}
          placeholder="Enter drop-off location"
          placeholderTextColor="#999"
          value={state.dropoff}
          onChangeText={(text) => {
            setState((prev) => ({ ...prev, dropoff: text }))
            fetchSuggestions(text, "dropoff")
          }}
          onFocus={() => {
            setState((prev) => ({ ...prev, activeInput: "dropoff" }))
          }}
          multiline
        />

        {state.loading && state.activeInput === "dropoff" ? (
          <Animated.View
            style={{
              opacity: loadingAnimation,
              transform: [
                {
                  scale: loadingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <ActivityIndicator size="small" color="#D93A2D" />
          </Animated.View>
        ) : (
          <TouchableOpacity style={styles.mapButton} onPress={() => onMapSelect("dropoff")}>
            <Icon name="map-marker" size={24} color="#D93A2D" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default LocationInputs
