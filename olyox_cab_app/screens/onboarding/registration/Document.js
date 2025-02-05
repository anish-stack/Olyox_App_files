import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState, useEffect } from "react";

const DocumentUpload = ({ documents, onUpload }) => {
  const [uploadStatus, setUploadStatus] = useState({
    license: false,
    insurance: false,
    registration: false
  });

  const [fadeAnims] = useState({
    license: new Animated.Value(1),
    insurance: new Animated.Value(0.5),
    registration: new Animated.Value(0.5)
  });

  useEffect(() => {
    // Animate buttons when their status changes
    Object.keys(uploadStatus).forEach(key => {
      Animated.timing(fadeAnims[key], {
        toValue: uploadStatus[key] || key === getNextUploadable() ? 1 : 0.5,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  }, [uploadStatus]);

  const getNextUploadable = () => {
    if (!uploadStatus.license) return "license";
    if (!uploadStatus.insurance) return "insurance";
    if (!uploadStatus.registration) return "registration";
    return null;
  };

  const pickImage = async (documentType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onUpload(documentType, result.assets[0], result.assets[0].uri);
      setUploadStatus(prev => ({
        ...prev,
        [documentType]: true
      }));
    }
  };

  const getUploadStatus = (type) => {
    if (uploadStatus[type]) return "check-circle";
    if (type === getNextUploadable()) return "upload";
    return "lock";
  };

  const getButtonColor = (type) => {
    if (uploadStatus[type]) return "#4CAF50";
    if (type === getNextUploadable()) return "#2196F3";
    return "#bbb";
  };

  const renderUploadButton = (documentType, label) => {
    const isDisabled = documentType !== getNextUploadable() && !uploadStatus[documentType];
    const iconName = getUploadStatus(documentType);
    const buttonColor = getButtonColor(documentType);

    return (
      <Animated.View style={[styles.documentContainer, { opacity: fadeAnims[documentType] }]}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            isDisabled && styles.disabledButton,
            uploadStatus[documentType] && styles.successButton
          ]}
          onPress={() => !isDisabled && pickImage(documentType)}
          disabled={isDisabled}
        >
          <Icon name={iconName} size={24} color={buttonColor} />
          <Text style={[
            styles.uploadButtonText,
            { color: buttonColor }
          ]}>
            {uploadStatus[documentType] ? `${label} ✓` : label}
          </Text>
        </TouchableOpacity>
        {documents[documentType] && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: documents[documentType] }} style={styles.previewImage} />
            <View style={styles.checkmarkOverlay}>
              <Icon name="check-circle" size={40} color="#4CAF50" />
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderUploadButton("license", "Upload License")}
      {renderUploadButton("insurance", "Upload Insurance")}
      {renderUploadButton("registration", "Upload Registration")}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    padding: 15,
  },
  documentContainer: {
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.2,
    // shadowRadius: 4,
    // elevation: 4,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  disabledButton: {
    backgroundColor: "#f5f5f5",
    borderColor: "#bbb",
  },
  successButton: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  uploadButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  imageContainer: {
    position: "relative",
    marginTop: 10,
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderRadius: 10,
  },
  checkmarkOverlay: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 2,
  }
});

export default DocumentUpload;