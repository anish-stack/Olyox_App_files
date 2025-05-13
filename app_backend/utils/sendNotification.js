const admin = require("firebase-admin");
require('dotenv').config();

// Custom error classes
class FirebaseInitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FirebaseInitializationError";
  }
}

class NotificationError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = "NotificationError";
    this.code = code;
  }
}

// Logger utility
const logger = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  warn: (msg) => console.warn(`⚠️ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  debug: (msg) => console.debug(`🐛 ${msg}`),
};

/**
 * Initialize Firebase Admin SDK with credentials from environment variables
 */
const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    logger.info("Firebase already initialized");
    return true;
  }

  try {
    // Check for required environment variables
    const requiredVars = [
      'FIREBASE_TYPE',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_CLIENT_ID',
      'FIREBASE_AUTH_URI',
      'FIREBASE_TOKEN_URI',
      'FIREBASE_AUTH_PROVIDER_CERT_URL',
      'FIREBASE_CLIENT_CERT_URL',
      'FIREBASE_UNIVERSE_DOMAIN'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new FirebaseInitializationError(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Create service account object from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info("✅ Firebase Admin SDK initialized successfully");
    return true;
  } catch (error) {
    if (error instanceof FirebaseInitializationError) {
      logger.error(`Firebase Initialization Error: ${error.message}`);
    } else {
      logger.error(`Unexpected Firebase Initialization Error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Send a notification to a device via Firebase Cloud Messaging
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} eventData - Additional data to send with notification
 * @returns {Promise<string>} - Notification ID or null if failed
 */
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
        logger.warn(`Invalid FCM token (${token?.substring(0, 10)}...)`);
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