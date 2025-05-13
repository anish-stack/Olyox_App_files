const admin = require("firebase-admin");
require('dotenv').config();

// Custom error classes
class FirebaseInitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FirebaseInitializationError";
  }
}

// Add the missing NotificationError class
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
 * Initialize Firebase Admin SDK with proper env handling
 */
const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    logger.info("Firebase already initialized");
    return true;
  }

  try {
    if (!process.env.FIREBASE_CREDENTIAL) {
      throw new FirebaseInitializationError("FIREBASE_CREDENTIAL is missing in environment variables.");
    }
    console.log("process.env.FIREBASE_CREDENTIAL", process.env.FIREBASE_CREDENTIAL)
    // Improved JSON parsing with error handling
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIAL);
    } catch (jsonError) {
      throw new FirebaseInitializationError(
        `Failed to parse FIREBASE_CREDENTIAL as JSON: ${jsonError.message}. ` +
        "Ensure credentials are properly escaped."
      );
    }

    if (!serviceAccount.project_id || !serviceAccount.private_key) {
      throw new FirebaseInitializationError("Invalid service account JSON structure.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info("✅ Firebase Admin SDK initialized successfully");
    return true;
  } catch (error) {
    if (error instanceof FirebaseInitializationError) {
      logger.error(`Firebase Initialization Error: ${error.message}`);
    } else if (error instanceof SyntaxError) {
      logger.error("Invalid JSON in FIREBASE_CREDENTIAL. Ensure it is properly escaped.");
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