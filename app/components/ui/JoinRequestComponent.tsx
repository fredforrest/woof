import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import firestore, { doc, updateDoc, arrayUnion } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { logSecurityEvent } from '../../utils/security';

interface JoinRequestProps {
  roomId: string;
  roomName: string;  
  onRequestSent: () => void;
  onCancel: () => void;
}

const JoinRequestComponent: React.FC<JoinRequestProps> = ({ 
  roomId, 
  roomName, 
  onRequestSent, 
  onCancel 
}) => {
  const [requesting, setRequesting] = useState(false);
  const currentUser = auth().currentUser;

  const handleJoinRequest = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to request access.');
      return;
    }

    try {
      setRequesting(true);

      // Check if user already sent a request
      const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
      
      if (!roomDoc.exists) {
        Alert.alert('Error', 'Room not found.');
        return;
      }

      const roomData = roomDoc.data();
      const joinRequests = roomData?.joinRequests || [];
      const participants = roomData?.participants || [];

      if (participants.includes(currentUser.uid)) {
        Alert.alert('Info', 'You are already a member of this room.');
        onRequestSent();
        return;
      }

      if (joinRequests.some((req: any) => req.userId === currentUser.uid)) {
        Alert.alert('Info', 'You have already sent a join request for this room.');
        onRequestSent();
        return;
      }

      // Add join request
      const newRequest = {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: currentUser.displayName || 'Unknown User',
        requestedAt: new Date().toISOString(), // Use regular timestamp instead
        status: 'pending'
      };

      // Get the room reference and ensure it has the proper structure
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const roomSnapshot = await roomRef.get();
      
      if (!roomSnapshot.exists) {
        throw new Error('Room not found');
      }
      
      const currentRoomData = roomSnapshot.data();
      
      // Ensure joinRequests field exists, if not initialize it
      if (!currentRoomData?.joinRequests || currentRoomData.joinRequests.length === 0) {
        // Initialize with empty array
        await roomRef.update({
          joinRequests: [{
            userId: currentUser.uid,
            requestedAt: new Date().toISOString(),
            status: 'pending'
          }]
        });
      } else {
        // Add to existing array
        await roomRef.update({
          joinRequests: arrayUnion({
            userId: currentUser.uid,
            requestedAt: new Date().toISOString(),
            status: 'pending'
          })
        });
      }

      // Log security event - temporarily disabled for debugging
      /*
      await logSecurityEvent('join_request_sent', {
        roomId,
        roomName,
        userId: currentUser.uid
      });
      */
            
      Alert.alert('Success', 'Join request sent successfully!');

      Alert.alert('Request Sent!', 'Your join request has been sent to the room owner. You\'ll be notified when they respond.');
      onRequestSent();

    } catch (error) {
      console.error('Error sending join request:', error);
      Alert.alert('Error', 'Failed to send join request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔒 Private Room</Text>
      <Text style={styles.roomName}>"{roomName}"</Text>
      <Text style={styles.description}>
        This is a private room. You need permission from the room owner to join. 
        Would you like to send a join request?
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onCancel}
          disabled={requesting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.requestButton, requesting && styles.disabledButton]} 
          onPress={handleJoinRequest}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.requestButtonText}>Send Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#e65100',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff9800',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  requestButton: {
    backgroundColor: '#ff9800',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  requestButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default JoinRequestComponent;
