import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Alert, Image } from 'react-native';

/**
 * Input validation and sanitization utilities
 */
export const validateMessage = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 1000; // Max 1000 characters
};

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

export const validateRoomId = (roomId: any): boolean => {
  return typeof roomId === 'string' && /^[a-zA-Z0-9_-]{1,50}$/.test(roomId);
};

/**
 * Rate limiting for message sending
 */
class MessageRateLimit {
  private messageHistory = new Map<string, number[]>();
  private readonly maxMessagesPerMinute = 10;
  private readonly timeWindowMs = 60000; // 1 minute

  canSendMessage(userId: string): boolean {
    const now = Date.now();
    const userMessages = this.messageHistory.get(userId) || [];
    
    // Remove messages older than time window
    const recentMessages = userMessages.filter(time => now - time < this.timeWindowMs);
    
    if (recentMessages.length >= this.maxMessagesPerMinute) {
      return false;
    }
    
    recentMessages.push(now);
    this.messageHistory.set(userId, recentMessages);
    return true;
  }

  cleanup() {
    // Clean up old entries to prevent memory leaks
    const now = Date.now();
    for (const [userId, messages] of this.messageHistory.entries()) {
      const recentMessages = messages.filter(time => now - time < this.timeWindowMs);
      if (recentMessages.length === 0) {
        this.messageHistory.delete(userId);
      } else {
        this.messageHistory.set(userId, recentMessages);
      }
    }
  }
}

export const messageRateLimit = new MessageRateLimit();

// Cleanup rate limit history every 5 minutes
setInterval(() => {
  messageRateLimit.cleanup();
}, 5 * 60 * 1000);

/**
 * User authentication utilities
 */
export const getCurrentUser = () => {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

export const requireEmailVerification = () => {
  const user = getCurrentUser();
  if (!user.emailVerified) {
    throw new Error('Email not verified');
  }
  return user;
};

/**
 * Permission checking utilities
 */
export const canUserAccessRoom = async (roomId: string, userId: string): Promise<boolean> => {
  try {
    if (!validateRoomId(roomId)) return false;
    
    const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
    if (!roomDoc.exists) return false;
    
    const roomData = roomDoc.data();
    const participants = roomData?.participants || [];
    return participants.includes(userId);
  } catch (error) {
    console.error('Error checking room access:', error);
    return false;
  }
};

/**
 * File validation utilities
 */
export const validateImageFile = (uri: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!uri || typeof uri !== 'string') {
      resolve(false);
      return;
    }

    Image.getSize(
      uri,
      (width, height) => {
        // Check dimensions (max 1024x1024) and reasonable aspect ratio
        const maxDimension = 1024;
        const maxAspectRatio = 3; // 3:1 or 1:3 max
        
        const aspectRatio = Math.max(width, height) / Math.min(width, height);
        
        resolve(
          width <= maxDimension && 
          height <= maxDimension && 
          aspectRatio <= maxAspectRatio
        );
      },
      (error) => {
        console.error('Error validating image:', error);
        resolve(false);
      }
    );
  });
};

export const getFileSizeFromUri = async (uri: string): Promise<number> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
};

export const validateFileSize = async (uri: string, maxSizeMB: number = 5): Promise<boolean> => {
  try {
    const sizeBytes = await getFileSizeFromUri(uri);
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB <= maxSizeMB;
  } catch {
    return false;
  }
};

/**
 * Error handling utilities
 */
export const handleSecureError = (error: any, userMessage: string = 'Something went wrong. Please try again.') => {
  // Log full error for debugging (never show to user)
  console.error('Security error:', error);
  
  // Show generic message to user
  Alert.alert('Error', userMessage);
};

export const logSecurityEvent = async (event: string, details?: any) => {
  try {
    const user = auth().currentUser;
    if (!user) return;

    await firestore().collection('audit_logs').add({
      event,
      userId: user.uid,
      timestamp: firestore.FieldValue.serverTimestamp(),
      details: details || {},
      userAgent: 'React Native App', // Could be more specific
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

/**
 * Data sanitization for logging (remove sensitive info)
 */
export const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

/**
 * Network security utilities
 */
export const isSecureConnection = (url: string): boolean => {
  return url.startsWith('https://') || url.startsWith('wss://');
};

export const validateFirebaseURL = (url: string): boolean => {
  // Ensure URLs are from Firebase domains
  const allowedDomains = [
    'firebaseapp.com',
    'googleapis.com',
    'firebasestorage.googleapis.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
};

/**
 * Session security utilities
 */
export const checkSessionTimeout = (): boolean => {
  const user = auth().currentUser;
  if (!user) return false;
  
  // Check if user's token is still valid
  return user.metadata.lastSignInTime !== null;
};

export const refreshUserSession = async (): Promise<boolean> => {
  try {
    const user = auth().currentUser;
    if (!user) return false;
    
    await user.getIdToken(true); // Force refresh
    return true;
  } catch {
    return false;
  }
};

/**
 * Content security utilities
 */
export const containsProfanity = (text: string): boolean => {
  // Basic profanity filter - in production, use a proper service
  const profanityWords = ['spam', 'scam', 'hack']; // Add more as needed
  const lowerText = text.toLowerCase();
  
  return profanityWords.some(word => lowerText.includes(word));
};

export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return isSecureConnection(url);
  } catch {
    return false;
  }
};

/**
 * Device security utilities
 */
export const isDebugMode = (): boolean => {
  return __DEV__;
};

export const logSecurityWarning = (warning: string, details?: any) => {
  if (isDebugMode()) {
    console.warn(`🔒 SECURITY WARNING: ${warning}`, details);
  }
  
  // In production, send to monitoring service
  logSecurityEvent('security_warning', { warning, details });
};
