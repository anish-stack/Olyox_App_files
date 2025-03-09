import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Animated, {
  FadeInUp,
  FadeOutDown,
  SlideInRight,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const DOCUMENTS = [
  { id: 'dl', title: 'Driver\'s License', label:'Driver\'s License', icon: 'car-outline' },
  { id: 'rc', title: 'Registration Certificate',label:'Registration Certificate', icon: 'document-text-outline' },
  { id: 'insurance', title: 'Insurance',label:'Insurance', icon: 'card-outline' },
  { id: 'aadharFront', title: 'aadharFront', label:'Front Side Of Aadhar',icon: 'card-outline' },
  { id: 'aadharBack', title: 'aadharBack',label:'Back Side Of Aadhar', icon: 'card-outline' },
  { id: 'pancard', title: 'pancard', label:'Pan Card', icon: 'card-outline' },
  { id: 'profile', title: 'profile', label:'Profile Image', icon: 'person' },
];

const API_URL = 'demoapi.olyox.com/api/v1/rider/rider-upload';

export default function Documents() {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const navigation = useNavigation();
  const [uploadProgress, setUploadProgress] = useState({});

  const isAllUploaded = DOCUMENTS.every(doc => images[doc.id]);

  const pickImage = async (type) => {
    try {
      setLoading(prev => ({ ...prev, [type]: true }));
      setError(prev => ({ ...prev, [type]: null }));

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError(prev => ({
          ...prev,
          [type]: 'Permission to access media library was denied'
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,

      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        // Simulate upload progress
        setUploadProgress(prev => ({ ...prev, [type]: 0 }));
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[type] || 0;
            if (current >= 100) {
              clearInterval(interval);
              return prev;
            }
            return { ...prev, [type]: current + 10 };
          });
        }, 200);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setImages(prev => ({ ...prev, [type]: result.assets[0].uri }));
        setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, [type]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const onLogin = async () => {
    try {
      const token = await SecureStore.deleteItemAsync('auth_token_cab');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      })
      console.log("logout done ✔️")
    } catch (error) {
      console.log("logout Error ✔️",error)
    }
  }

  const handleSubmit = async () => {
    if (!isAllUploaded) return;

    try {
      setLoading(prev => ({ ...prev, submit: true }));

      // Get the authentication token
      const token = await SecureStore.getItemAsync('auth_token_cab');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Create FormData object
      const formData = new FormData();

      // Append each image to FormData with its document type
      Object.entries(images).forEach(([docType, uri]) => {
        // Get the file extension from the URI
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('documents', {
          uri: uri,
          name: `${docType}.${fileType}`,
          type: `image/${fileType}`,
        });

        // Also append the document type
        formData.append('documentTypes', docType);
      });

      // Make the API request
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({ ...prev, submit: percentCompleted }));
        },
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Documents uploaded successfully!',
          [{ text: 'OK' }]
        );

        navigation.navigate('Wait_Screen')
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.log("Error I am Error")
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit documents';
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      setError(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
      setUploadProgress(prev => ({ ...prev, submit: 0 }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Document Upload</Text>
        <Text style={styles.subtitle}>
          Please upload clear photos of your documents
        </Text>
        <TouchableOpacity onPress={()=>onLogin()}>
          <Text>Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.documentsContainer}>
          {DOCUMENTS.map((doc, index) => (
            <Animated.View
              key={doc.id}
              entering={SlideInRight.delay(index * 200)}
              style={styles.documentCard}
            >
              <TouchableOpacity
                style={[
                  styles.uploadArea,
                  images[doc.id] && styles.uploadAreaSuccess,
                  error[doc.id] && styles.uploadAreaError,
                ]}
                onPress={() => pickImage(doc.id)}
                disabled={loading[doc.id]}
              >
                {loading[doc.id] ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#007AFF" />
                    <Text style={styles.loadingText}>Uploading...</Text>
                    {uploadProgress[doc.id] !== undefined && (
                      <Text style={styles.progressText}>
                        {uploadProgress[doc.id]}%
                      </Text>
                    )}
                  </View>
                ) : images[doc.id] ? (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: images[doc.id] }}
                      style={styles.preview}
                    />
                    <View style={styles.overlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      <Text style={styles.changeText}>Tap to change</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name={doc.icon} size={32} color="#666" />
                    <Text style={styles.documentTitle}>{doc.label}</Text>
                    <Text style={styles.uploadText}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>

              {error[doc.id] && (
                <Animated.Text
                  style={styles.errorText}
                  entering={FadeInUp}
                  exiting={FadeOutDown}
                >
                  {error[doc.id]}
                </Animated.Text>
              )}
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isAllUploaded || loading.submit) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isAllUploaded || loading.submit}
      >
        {loading.submit ? (
          <View style={styles.submitLoadingContainer}>
            <ActivityIndicator color="#FFF" />
            {uploadProgress.submit !== undefined && (
              <Text style={styles.submitProgressText}>
                {uploadProgress.submit}%
              </Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.submitButtonText}>Submit Documents</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </>
        )}
      </TouchableOpacity>

      {error.submit && (
        <Animated.Text
          style={[styles.errorText, styles.submitErrorText]}
          entering={FadeInUp}
          exiting={FadeOutDown}
        >
          {error.submit}
        </Animated.Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  documentsContainer: {
    flex: 1,
    padding: 20,
  },
  documentCard: {
    marginBottom: 20,
  },
  uploadArea: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E1E4E8',
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 160,
  },
  uploadAreaSuccess: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
  },
  uploadAreaError: {
    borderColor: '#FF5252',
    borderStyle: 'solid',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  progressText: {
    marginTop: 4,
    fontSize: 12,
    color: '#007AFF',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  preview: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeText: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  submitLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitProgressText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
  },
  submitErrorText: {
    textAlign: 'center',
    marginBottom: 20,
  },
});