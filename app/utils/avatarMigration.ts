import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

/**
 * Update user's avatar URL across all their messages in all chat rooms
 */
export const updateUserAvatarInMessages = async (newAvatarURL: string) => {
  const currentUser = auth().currentUser;
  if (!currentUser) return;

  try {
    // Get all chat rooms
    const chatRoomsSnapshot = await firestore().collection('chatRooms').get();
    
    let batch = firestore().batch();
    let batchCount = 0;
    
    for (const roomDoc of chatRoomsSnapshot.docs) {
      const roomId = roomDoc.id;
      
      // Get all messages from this user in this room
      const messagesSnapshot = await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .where('userId', '==', currentUser.uid)
        .get();
      
      for (const messageDoc of messagesSnapshot.docs) {
        batch.update(messageDoc.ref, {
          senderAvatarUrl: newAvatarURL
        });
        batchCount++;
        
        // Firestore batch limit is 500, so commit and start a new batch if needed
        if (batchCount >= 400) {
          // Leave some buffer before the 500 limit
          await batch.commit();
          batch = firestore().batch(); // Create new batch
          batchCount = 0;
        }
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('Successfully updated avatar URLs in all messages');
  } catch (error) {
    console.error('Error updating avatar URLs in messages:', error);
  }
};

/**
 * Clean up old avatar files from Firebase Storage
 */
export const cleanupOldAvatars = async (currentAvatarURL: string) => {
  const currentUser = auth().currentUser;
  if (!currentUser) return;

  try {
    // List all files in the user's avatar folder
    const avatarRef = storage().ref(`avatars`);
    const result = await avatarRef.listAll();
    
    for (const item of result.items) {
      const itemURL = await item.getDownloadURL();
      
      // If this isn't the current avatar and it belongs to this user, delete it
      if (itemURL !== currentAvatarURL && item.name.includes(currentUser.uid)) {
        await item.delete();
        console.log(`Deleted old avatar: ${item.name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old avatars:', error);
  }
};
