
const admin = require("firebase-admin");
const path = require("path");

// Custom error classes for more specific error handling
class FirebaseInitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FirebaseInitializationError';
  }
}

class NotificationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
  }
}

// Logging utility
const logger = {
  info: (message) => console.log(`ℹ️ ${message}`),
  warn: (message) => console.warn(`⚠️ ${message}`),
  error: (message) => console.error(`❌ ${message}`),
  debug: (message) => console.debug(`🐛 ${message}`)
};

/**
 * Initialize Firebase Admin SDK with enhanced error handling
 * @returns {boolean} Initialization status
 */
const initializeFirebase = () => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    logger.info('Firebase already initialized');
    return true;
  }

  try {
    // Resolve service account path
    const serviceAccountPath = path.resolve(
      __dirname, 
      "olyox-6215a-firebase-adminsdk-fbsvc-471080c570.json"
    );

    // Validate service account file exists
    try {
      require.resolve(serviceAccountPath);
    } catch (fileError) {
      throw new FirebaseInitializationError(
        `Service account file not found: ${serviceAccountPath}`
      );
    }

    // Load service account
    const serviceAccount = require(serviceAccountPath);

    // Validate service account structure
    if (!serviceAccount.project_id || !serviceAccount.private_key) {
      throw new FirebaseInitializationError(
        'Invalid service account configuration'
      );
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Optional: Add other configuration if needed
      // projectId: serviceAccount.project_id,
    });

    logger.info('Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    // Detailed error logging
    if (error instanceof FirebaseInitializationError) {
      logger.error(`Firebase Initialization Failed: ${error.message}`);
    } else if (error.code === 'ENOENT') {
      logger.error('Service account file could not be read');
    } else if (error.code === 'app/invalid-credential') {
      logger.error('Invalid Firebase credentials. Check service account.');
    } else {
      logger.error(`Unexpected Firebase Init Error: ${error.message}`);
    }

    // Rethrow to allow caller to handle
    throw error;
  }
};


const sendNotification = async (token, title, body, eventData = {}) => {
  try {
    // Validate input
    if (!token) {
      throw new NotificationError(
        'No FCM token provided', 
        'INVALID_TOKEN'
      );
    }

    // Ensure Firebase is initialized
    try {
      initializeFirebase();
    } catch (initError) {
      throw new NotificationError(
        'Failed to initialize Firebase', 
        'INIT_FAILED'
      );
    }

    // Default notification content
    const defaultTitle = "👑 Royal Proclamation!";
    const defaultBody = "Hear ye, hear ye! Anish and Manish have ascended the throne. All hail the kings who rule with wisdom, strength, and unstoppable swag! 👑🔥🦁";

    // Prepare notification message
    const message = {
      token: token,
      notification: {
        title: title || defaultTitle,
        body: body || defaultBody,
      },
      data: {
        // Ensure all data values are strings
        event: eventData.event || "DEFAULT_EVENT",
        ...Object.fromEntries(
          Object.entries(eventData).map(([k, v]) => [k, String(v)])
        ),
      },
    };

    // Send notification
    const response = await admin.messaging().send(message);
    
    logger.info(`Notification sent successfully: ${response}`);
    return response;

  } catch (error) {
    // Detailed error handling
    switch (error.code) {
      case 'messaging/invalid-argument':
        logger.warn(`Invalid FCM message argument: ${error.message}`);
        break;
      case 'messaging/invalid-recipient':
        logger.warn(`Invalid FCM token (${token.substring(0, 10)}...)`);
        break;
      case 'app/invalid-credential':
        logger.error('Firebase credential error. Check service account.');
        break;
      case 'INIT_FAILED':
        logger.error('Firebase initialization failed');
        break;
      case 'INVALID_TOKEN':
        logger.warn('No FCM token provided');
        break;
      default:
        logger.error(`Notification send failed: ${error.message}`);
    }

    // Rethrow or return null based on error type
    if (error instanceof NotificationError) {
      return null;
    }
    throw error;
  }
};

// Test hook for direct module execution
if (require.main === module) {
  const testToken = process.env.TEST_FCM_TOKEN;
  if (testToken) {
    sendNotification(testToken, "Test Notification", "This is a test notification")
      .then(() => logger.info("Test notification completed"))
      .catch(logger.error);
  }
}

module.exports = sendNotification;