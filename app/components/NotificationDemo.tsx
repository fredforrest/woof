import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useNotifee } from '../hooks';

const NotificationDemo = () => {
  const [permissionStatus, setPermissionStatus] = useState<string>('Unknown');
  const {
    isInitialized,
    showMessageNotification,
    showFriendRequestNotification,
    showRoomActivityNotification,
    showNotification,
    cancelRoomNotifications,
  } = useNotifee();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      let statusText = 'Unknown';
      
      switch (settings.authorizationStatus) {
        case AuthorizationStatus.AUTHORIZED:
          statusText = 'Authorized ✅';
          break;
        case AuthorizationStatus.DENIED:
          statusText = 'Denied ❌';
          break;
        case AuthorizationStatus.NOT_DETERMINED:
          statusText = 'Not Determined ⚪';
          break;
        case AuthorizationStatus.PROVISIONAL:
          statusText = 'Provisional ⚡';
          break;
        default:
          statusText = `Status: ${settings.authorizationStatus}`;
      }
      
      console.log('🔔 Permission Status:', statusText);
      console.log('🔔 Full settings:', JSON.stringify(settings, null, 2));
      setPermissionStatus(statusText);
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      setPermissionStatus('Error ❌');
    }
  };

  const requestPermissions = async () => {
    try {
      console.log('🔔 Requesting permissions...');
      const settings = await notifee.requestPermission();
      console.log('🔔 Permission result:', JSON.stringify(settings, null, 2));
      await checkPermissions();
      
      if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
        Alert.alert('Success', 'Notifications enabled!');
      } else {
        Alert.alert('Permission Denied', 'You may need to enable notifications in device settings manually.');
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions: ' + error);
    }
  };

  const handleSimpleNotification = async () => {
    await showNotification(
      'Test Notification',
      'This is a test notification from your app!'
    );
  };

  const handleChatNotification = async () => {
    await showMessageNotification(
      'John Doe',
      'Hey there! How are you doing?',
      'General Chat',
      'room_123',
      'user_456'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Notification Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Init: {isInitialized ? '✅' : '❌'} | Perms: {permissionStatus}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.smallButton} onPress={requestPermissions}>
          <Text style={styles.smallButtonText}>Request</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallButton} onPress={checkPermissions}>
          <Text style={styles.smallButtonText}>Check</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.testButton} onPress={handleSimpleNotification}>
          <Text style={styles.smallButtonText}>Test Simple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={handleChatNotification}>
          <Text style={styles.smallButtonText}>Test Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    maxHeight: 150,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smallButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    flex: 0.48,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 6,
    flex: 0.48,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationDemo;