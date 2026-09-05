const admin = require('firebase-admin');

let messagingInstance = null;

function initFcm() {
  if (messagingInstance) return messagingInstance;
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return null;
  }
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
        })
      });
    }
    messagingInstance = admin.messaging();
    return messagingInstance;
  } catch (err) {
    console.warn('Firebase Admin initialization failed:', err.message);
    return null;
  }
}

async function sendPush({ token, title, body, data = {} }) {
  if (!token || token.startsWith('test-') || token.startsWith('mock-') || token === 'fake-token') {
    return { delivered: false, mode: 'mock', reason: 'Test/mock token provided' };
  }

  const messaging = initFcm();
  if (!messaging) {
    return { delivered: false, mode: 'mock', reason: 'Firebase env not configured' };
  }

  try {
    const response = await messaging.send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
    });
    return { delivered: true, messageId: response, mode: 'fcm' };
  } catch (err) {
    console.warn('FCM send error, falling back to mock mode:', err.message);
    return {
      delivered: false,
      mode: 'mock',
      reason: err.message,
      errorCode: err.code || err.errorInfo?.code
    };
  }
}

module.exports = { sendPush };
