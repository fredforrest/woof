import firestore from '@react-native-firebase/firestore';
import { logSecurityEvent } from './security';

/**
 * Migration script to add participants field to existing chat rooms
 * This is required for the new security rules to work properly
 */
export const migrateRoomsToParticipants = async (): Promise<void> => {
  try {
    console.log('🔄 Starting room participants migration...');
    
    const roomsSnapshot = await firestore().collection('chatRooms').get();
    let updateCount = 0;
    let errorCount = 0;

    // Process rooms one by one instead of using batch
    for (const roomDoc of roomsSnapshot.docs) {
      try {
        const roomData = roomDoc.data();
        
        // Skip if participants field already exists and has content
        if (roomData.participants && Array.isArray(roomData.participants) && roomData.participants.length > 0) {
          console.log(`Room ${roomDoc.id} already has participants, skipping...`);
          continue;
        }

        // Get all unique users who have sent messages in this room
        const messagesSnapshot = await firestore()
          .collection('chatRooms')
          .doc(roomDoc.id)
          .collection('messages')
          .limit(100) // Limit to avoid too much data
          .get();

        const participants = new Set<string>();
        
        // Add room creator if available
        if (roomData.createdBy) {
          participants.add(roomData.createdBy);
        }

        // Add all message senders (check both senderId and userId fields)
        messagesSnapshot.docs.forEach(messageDoc => {
          const messageData = messageDoc.data();
          if (messageData.senderId) {
            participants.add(messageData.senderId);
          }
          if (messageData.userId) {
            participants.add(messageData.userId);
          }
        });

        // Convert Set to Array and update room
        const participantsArray = Array.from(participants);
        
        if (participantsArray.length > 0) {
          // Update room individually
          await firestore()
            .collection('chatRooms')
            .doc(roomDoc.id)
            .update({
              participants: participantsArray,
              updatedAt: firestore.FieldValue.serverTimestamp()
            });
          
          updateCount++;
          console.log(`✅ Updated room ${roomDoc.id} with ${participantsArray.length} participants`);
        } else {
          console.log(`⚠️ No participants found for room ${roomDoc.id}`);
        }
        
      } catch (roomError) {
        console.error(`❌ Error processing room ${roomDoc.id}:`, roomError);
        errorCount++;
      }
    }

    console.log(`✅ Migration completed: ${updateCount} rooms updated, ${errorCount} errors`);
    
    // Log security event only if we updated something
    if (updateCount > 0) {
      await logSecurityEvent('rooms_participants_migration', {
        roomsUpdated: updateCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Log error
    try {
      await logSecurityEvent('rooms_participants_migration_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log migration error:', logError);
    }
    
    // Don't throw error to prevent app crash
    console.log('Migration failed but app will continue...');
  }
};

/**
 * Utility to add a user to a room's participants
 */
export const addUserToRoomParticipants = async (roomId: string, userId: string): Promise<void> => {
  try {
    await firestore()
      .collection('chatRooms')
      .doc(roomId)
      .update({
        participants: firestore.FieldValue.arrayUnion(userId)
      });

    await logSecurityEvent('user_added_to_room', {
      roomId,
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding user to room participants:', error);
    throw error;
  }
};

/**
 * Utility to remove a user from a room's participants
 */
export const removeUserFromRoomParticipants = async (roomId: string, userId: string): Promise<void> => {
  try {
    await firestore()
      .collection('chatRooms')
      .doc(roomId)
      .update({
        participants: firestore.FieldValue.arrayRemove(userId)
      });

    await logSecurityEvent('user_removed_from_room', {
      roomId,
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error removing user from room participants:', error);
    throw error;
  }
};
