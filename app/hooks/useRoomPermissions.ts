import { useLayoutEffect } from 'react';
import { Alert, TouchableOpacity, Text } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

interface UseRoomPermissionsReturn {
  handleDeleteRoomFromChat: () => Promise<void>;
}

export const useRoomPermissions = (roomId: string, roomName: string): UseRoomPermissionsReturn => {
  const navigation = useNavigation();
  const currentUser = auth().currentUser;

  const handleDeleteRoomFromChat = async () => {
    if (!currentUser) return;

    try {
      // Check if user is the room creator
      const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
      
      if (!roomDoc.exists) {
        Alert.alert('Error', 'Room not found.');
        return;
      }

      const roomData = roomDoc.data();
      
      if (roomData?.createdBy !== currentUser.uid) {
        Alert.alert('Permission Denied', 'Only the room creator can delete this room.');
        return;
      }

      Alert.alert(
        'Delete Room',
        `Are you sure you want to delete "${roomName}"? This action cannot be undone and will delete all messages.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete all messages first
                const messagesRef = firestore()
                  .collection('chatRooms')
                  .doc(roomId)
                  .collection('messages');
                
                const messagesSnapshot = await messagesRef.get();
                const batch = firestore().batch();
                
                messagesSnapshot.docs.forEach(doc => {
                  batch.delete(doc.ref);
                });
                
                // Delete the room document
                const roomRef = firestore().collection('chatRooms').doc(roomId);
                batch.delete(roomRef);
                
                await batch.commit();
                
                Alert.alert('Success', 'Room deleted successfully.');
                navigation.goBack(); // Navigate back to chat rooms
              } catch (error) {
                console.error('Error deleting room:', error);
                Alert.alert('Error', 'Failed to delete room. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error checking room ownership:', error);
      Alert.alert('Error', 'Could not check room permissions.');
    }
  };

  // Configure navigation header with delete button
  const setupHeaderButton = () => {
    const checkRoomOwnership = async () => {
      if (!currentUser) return;

      try {
        const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
        const roomData = roomDoc.data();
        
        // Only show delete button if user is room creator
        if (roomData?.createdBy === currentUser.uid) {
          navigation.setOptions({
            headerRight: () => {
              const React = require('react');
              return React.createElement(TouchableOpacity, {
                onPress: handleDeleteRoomFromChat,
                style: { padding: 8, marginRight: 10 }
              }, React.createElement(Text, { style: { fontSize: 18 } }, '🗑️'));
            },
          });
        }
      } catch (error) {
        console.error('Error checking room ownership:', error);
      }
    };

    checkRoomOwnership();
  };

  useLayoutEffect(() => {
    setupHeaderButton();
  }, [navigation, roomId, currentUser]);

  return {
    handleDeleteRoomFromChat,
  };
};
