import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../components/navigation/types';
import { useNavigation } from '@react-navigation/native';

const CreateRoomScreen = ({}) => {

    const navigation = useNavigation<RootStackNavigationProp>();
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    // check if roomName is empty
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter a room name.');
      return;
    }
    if (isCreating) return; // Prevent double taps

    setIsCreating(true);
    const currentUser = auth().currentUser;

    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to create a room.');
      setIsCreating(false);
      return;
    }

    try {
      const now = firestore.FieldValue.serverTimestamp(); // Use server timestamp

      await firestore().collection('chatRooms').add({
        name: roomName,
        description: description,
        createdAt: now,
        lastMessageTimestamp: now, // Initialize sort timestamp
        lastMessageText: 'Room created.', // Optional initial text
        createdBy: currentUser.uid,
        participants: [currentUser.uid], // Required for new security rules
        isPrivate: isPrivate,
        joinRequests: [], // Array to store pending join requests for private rooms
      });

      Alert.alert('Success', 'Room created!');
      setRoomName('');
      setDescription('');
      // Optionally navigate back or to the new room
      navigation.navigate('ChatRooms'); // Adjust as needed

    } catch (error) {
      console.error("Error creating room: ", error);
      Alert.alert('Error', 'Could not create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Room Name"
        value={roomName}
        onChangeText={setRoomName}
      />
      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
      />
      
      {/* Privacy Toggle */}
      <View style={styles.privacyContainer}>
        <Text style={styles.privacyLabel}>Room Privacy:</Text>
        <View style={styles.privacyOptions}>
          <TouchableOpacity
            style={[styles.privacyButton, !isPrivate && styles.selectedButton]}
            onPress={() => setIsPrivate(false)}
          >
            <Text style={[styles.privacyButtonText, !isPrivate && styles.selectedText]}>
              🌍 Public
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.privacyButton, isPrivate && styles.selectedButton]}
            onPress={() => setIsPrivate(true)}
          >
            <Text style={[styles.privacyButtonText, isPrivate && styles.selectedText]}>
              🔒 Private
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.privacyDescription}>
          {isPrivate 
            ? "Only invited users can join. You'll approve join requests."
            : "Anyone can join this room instantly."
          }
        </Text>
      </View>
      
      <Button
        title={isCreating ? "Creating..." : "Create Room"}
        onPress={handleCreateRoom}
        disabled={isCreating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  privacyContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  privacyOptions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  privacyButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedButton: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  },
  privacyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  selectedText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  privacyDescription: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default CreateRoomScreen;