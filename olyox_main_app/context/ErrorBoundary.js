import React, { Component } from "react";
import { View, Text, Button, Alert } from "react-native";
import axios from "axios";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state to display fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Send the error to the backend
    this.setState({ errorInfo });

    // Send error details to the backend for tracking
    axios.post("https://your-backend-api.com/log_error", {
      error: error.toString(),
      errorInfo: JSON.stringify(errorInfo),
      timestamp: new Date(),
    }).catch((backendError) => {
      console.error("Error reporting to backend:", backendError);
    });
  }

  handleGoBack = () => {
    console.log("object")
  };

  render() {
    if (this.state.hasError) {
      // Show error message and button to go back to the Home screen
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            Something went wrong. Please try again later.
          </Text>
        
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundaryWrapper(props) {
 
  return <ErrorBoundary {...props} />;
}
