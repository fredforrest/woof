import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { addUserToRoomParticipants } from '../../utils/roomParticipants';
import { logSecurityEvent } from '../../utils/security';

interface JoinRoomProps {
  roomId: string;
  roomName: string;  
  onJoinSuccess: () => void;
  onCancel: () => void;
}

const JoinRoomComponent: React.FC<JoinRoomProps> = ({ 
  roomId, 
  roomName, 
  onJoinSuccess, 
  onCancel 
}) => {
  const [joining, setJoining] = useState(false);
  const currentUser = auth().currentUser;

  const handleJoinRoom = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to join a room.');
      return;
    }

    try {
      setJoining(true);

      // Check if user is already a participant
      const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
      
      if (!roomDoc.exists) {
        Alert.alert('Error', 'Room not found.');
        return;
      }

      const roomData = roomDoc.data();
      const participants = roomData?.participants || [];

      if (participants.includes(currentUser.uid)) {
        Alert.alert('Info', 'You are already a member of this room.');
        onJoinSuccess();
        return;
      }

      // Add user to participants array
      console.log('Attempting to join room:', roomId); // Debug log
      console.log('Current user:', currentUser.uid); // Debug log
      console.log('Room data:', roomData); // Debug log
      
      await addUserToRoomParticipants(roomId, currentUser.uid);
      console.log('Successfully added user to participants'); // Debug log

      // Log security event - temporarily disabled for debugging
      /*
      await logSecurityEvent('room_joined', {
        roomId,
        roomName,
        userId: currentUser.uid
      });
      */

      Alert.alert('Success', `You have joined "${roomName}"!`);
      onJoinSuccess();

    } catch (error) {
      console.error('Error joining room:', error);
      Alert.alert('Error', 'Failed to join room. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Room</Text>
      <Text style={styles.roomName}>"{roomName}"</Text>
      <Text style={styles.description}>
        Do you want to join this chat room? You'll be able to send and receive messages.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onCancel}
          disabled={joining}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.joinButton, joining && styles.disabledButton]} 
          onPress={handleJoinRoom}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.joinButtonText}>Join Room</Text>
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
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
  joinButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  joinButtonText: {
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

export default JoinRoomComponent;
