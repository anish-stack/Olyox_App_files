import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  BackHandler,
  Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';

import Constants from 'expo-constants';
import axios from 'axios';

// App Update Model
class AppUpdateModel {
  constructor() {
    this.currentVersion = Constants?.manifest?.version || '1.0.0';
    this.latestVersion = null;
    this.updateUrl = null;
    this.forceUpdate = false;
    this.releaseNotes = '';
    this.updateImage = null;
    this.downloadProgress = 0;
    this.isDownloading = false;
    this.downloadComplete = false;
    this.downloadPath = null;
    this.error = null;
  }

  async checkForUpdate(apiUrl = 'https://appapi.olyox.com/api/v1/admin/app-version/by-type/tiffin_vendor') {
    try {
      const response = await axios.get(apiUrl);
      const { 
        version, 
        downloadAppUrl, 
        isMandatory, 
        description,
        updateImage
      } = response?.data?.data;
   
      this.latestVersion = version || '0';
      this.updateUrl = downloadAppUrl;
      this.forceUpdate = isMandatory || false;
      this.releaseNotes = description || 'New version available with bug fixes and improvements';
      this.updateImage = updateImage || null;
      
      return this.needsUpdate();
    } catch (error) {
      this.error = error.message;
      console.log('❌ Update check failed:', error.message);
      return false;
    }
  }

  needsUpdate() {
    if (!this.latestVersion || !this.currentVersion) return false;
    
    // Simple version comparison (can be enhanced for semantic versioning)
    const current = this.currentVersion.split('.').map(Number);
    console.log("current",current)
    const latest = this.latestVersion.split('.').map(Number);
    console.log("latest",latest)

    
    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
      const a = current[i] || 0;
      const b = latest[i] || 0;
      if (a < b) return true;
      if (a > b) return false;
    }
    
    return false;
  }

  async downloadUpdate(onProgress) {
    if (!this.updateUrl) {
      throw new Error('No update URL available');
    }

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.downloadComplete = false;
    this.error = null;

    try {
      // Set download path based on platform
      if (Platform.OS === 'android') {
        this.downloadPath = `${FileSystem.documentDirectory}update.apk`;
      } else {
        // For iOS, we'll just store the URL for opening in browser
        this.downloadPath = this.updateUrl;
        this.downloadComplete = true;
        this.isDownloading = false;
        return this.downloadPath;
      }

      // Create download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        this.updateUrl,
        this.downloadPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          this.downloadProgress = progress;
          onProgress && onProgress(progress);
        }
      );

      // Start download
      const { uri } = await downloadResumable.downloadAsync();
      this.downloadComplete = true;
      this.isDownloading = false;
      return uri;
    } catch (error) {
      this.error = error.message;
      this.isDownloading = false;
      console.log('❌ Download failed:', error.message);
      throw error;
    }
  }

  async installUpdate() {
    try {
      if (Platform.OS === 'android') {
        if (!this.downloadComplete || !this.downloadPath) {
          throw new Error('Download not complete');
        }
        
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: this.downloadPath,
          flags: 1,
          type: 'application/vnd.android.package-archive',
        });
        return true;
      } else {
        // For iOS, open the App Store or provided URL
        await Linking.openURL(this.updateUrl);
        return true;
      }
    } catch (error) {
      this.error = error.message;
      console.log('❌ Installation failed:', error.message);
      throw error;
    }
  }
}

// Update UI Component
const AppUpdater = ({ apiUrl, onClose, customStyles }) => {
  const [updateModel] = useState(new AppUpdateModel());
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState(null);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
      ...customStyles?.modalContainer,
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      ...customStyles?.modalContent,
    },
    header: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
      color: '#333',
      ...customStyles?.header,
    },
    versionInfo: {
      fontSize: 16,
      color: '#666',
      marginBottom: 15,
      textAlign: 'center',
      ...customStyles?.versionInfo,
    },
    updateImage: {
      width: '100%',
      height: 180,
      resizeMode: 'contain',
      marginVertical: 15,
      borderRadius: 8,
      ...customStyles?.updateImage,
    },
    releaseNotes: {
      marginVertical: 15,
      padding: 10,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      ...customStyles?.releaseNotes,
    },
    releaseNotesText: {
      color: '#444',
      fontSize: 14,
      ...customStyles?.releaseNotesText,
    },
    progressContainer: {
      marginVertical: 15,
      ...customStyles?.progressContainer,
    },
    progressText: {
      textAlign: 'center',
      marginTop: 5,
      color: '#333',
      ...customStyles?.progressText,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      ...customStyles?.buttonContainer,
    },
    updateButton: {
      backgroundColor: '#4CAF50',
      padding: 12,
      borderRadius: 8,
      flex: 1,
      marginRight: 8,
      alignItems: 'center',
      ...customStyles?.updateButton,
    },
    laterButton: {
      backgroundColor: '#f5f5f5',
      padding: 12,
      borderRadius: 8,
      flex: 1,
      marginLeft: 8,
      alignItems: 'center',
      ...customStyles?.laterButton,
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
      ...customStyles?.buttonText,
    },
    laterButtonText: {
      color: '#333',
      fontSize: 16,
      ...customStyles?.laterButtonText,
    },
    errorText: {
      color: 'red',
      marginTop: 10,
      textAlign: 'center',
      ...customStyles?.errorText,
    },
  });

  useEffect(() => {
    const checkUpdate = async () => {
      const needsUpdate = await updateModel.checkForUpdate(apiUrl);
      if (needsUpdate) {
        setShowUpdateModal(true);
        
        // If force update, prevent closing the app
        if (updateModel.forceUpdate) {
          const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => true
          );
          
          return () => backHandler.remove();
        }
      }
    };
    
    checkUpdate();
  }, [apiUrl]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      
      await updateModel.downloadUpdate((progress) => {
        setDownloadProgress(progress);
      });
      
      setDownloadComplete(true);
      setIsDownloading(false);
      
      // On iOS, the installation starts immediately
      if (Platform.OS === 'ios') {
        handleInstall();
      }
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    try {
      await updateModel.installUpdate();
    } catch (err) {
      setError(`Installation failed: ${err.message}`);
    }
  };

  const handleClose = () => {
    if (updateModel.forceUpdate) {
      BackHandler.exitApp();
    } else {
      setShowUpdateModal(false);
      onClose && onClose();
    }
  };

  if (!showUpdateModal) return null;

  return (
    <Modal
      visible={showUpdateModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        if (!updateModel.forceUpdate) {
          handleClose();
        }
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.header}>🚀 Update Available</Text>
          
          <Text style={styles.versionInfo}>
            {`Current: v${updateModel.currentVersion} → Latest: v${updateModel.latestVersion}`}
          </Text>
          
          {updateModel.updateImage && (
            <Image 
              source={{ uri: updateModel.updateImage }}
              style={styles.updateImage}
             
            />
          )}
          
          <View style={styles.releaseNotes}>
            <Text style={styles.releaseNotesText}>
              {updateModel.releaseNotes}
            </Text>
          </View>
          
          {isDownloading && (
            <View style={styles.progressContainer}>
            
              <Text style={styles.progressText}>
                Downloading... {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          )}
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.buttonContainer}>
            {!downloadComplete ? (
              <>
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={handleDownload}
                  disabled={isDownloading}
                >
                  <Text style={styles.buttonText}>
                    {isDownloading ? 'Downloading...' : 'Update Now'}
                  </Text>
                </TouchableOpacity>
                
                {!updateModel.forceUpdate && (
                  <TouchableOpacity
                    style={styles.laterButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.laterButtonText}>Later</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={handleInstall}
                >
                  <Text style={styles.buttonText}>Install Now</Text>
                </TouchableOpacity>
                
                {!updateModel.forceUpdate && (
                  <TouchableOpacity
                    style={styles.laterButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.laterButtonText}>Later</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Usage Example


// Expected API response format:
// {
//   "latestVersion": "1.2.0",
//   "apkUrl": "https://yourdomain.com/downloads/app-v1.2.0.apk",
//   "forceUpdate": false,
//   "releaseNotes": "• Fixed login issues\n• Improved performance\n• Added new features",
//   "updateImage": "https://yourdomain.com/images/update-screen.jpg"
// }

export default AppUpdater;