import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../components/navigation/types';
import { useNavigation } from '@react-navigation/native';

const CreateRoomScreen = ({}) => {

    const navigation = useNavigation<RootStackNavigationProp>();
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
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
});

export default CreateRoomScreen;