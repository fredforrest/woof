import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNotifee } from '../hooks';

const NotificationDemo = () => {
  const {
    isInitialized,
    showMessageNotification,
    showFriendRequestNotification,
    showRoomActivityNotification,
    showSimpleNotification,
    cancelRoomNotifications,
  } = useNotifee();

  const handleChatNotification = async () => {
    await showMessageNotification(
      'John Doe',
      'Hey there! How are you doing?',
      'General Chat',
      'room_123',
      'user_456'
    );
  };

  const handleFriendRequestNotification = async () => {
    await showFriendRequestNotification(
      'Jane Smith',
      'user_789'
    );
  };

  const handleRoomJoinRequest = async () => {
    await showRoomActivityNotification(
      'join_request',
      'Mike Johnson',
      'Dog Lovers',
      'room_456',
      'user_321'
    );
  };

  const handleSimpleNotification = async () => {
    await showSimpleNotification(
      'Welcome!',
      'Thanks for trying out the notification system!'
    );
  };

  const handleClearNotifications = async () => {
    await cancelRoomNotifications('room_123');
    Alert.alert('Cleared', 'Room notifications cleared!');
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Initializing notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Notification Demo</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleChatNotification}>
        <Text style={styles.buttonText}>💬 Show Chat Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleFriendRequestNotification}>
        <Text style={styles.buttonText}>👥 Show Friend Request</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleRoomJoinRequest}>
        <Text style={styles.buttonText}>🏠 Show Room Join Request</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSimpleNotification}>
        <Text style={styles.buttonText}>✨ Show Simple Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearNotifications}>
        <Text style={styles.buttonText}>🗑️ Clear Room Notifications</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationDemo;
