import React from 'react';
import { View, Button, Alert, StyleSheet } from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationTestButton: React.FC = () => {
  const { isInitialized, showSystemNotification } = useNotifications();

  const testNotification = () => {
    if (!isInitialized) {
      Alert.alert('Error', 'Notifications not initialized yet');
      return;
    }

    showSystemNotification(
      'Test Notification',
      'This is a test notification from Woof! 🐕',
      { test: true }
    );
    
    Alert.alert('Success', 'Test notification sent!');
  };

  return (
    <View style={styles.container}>
      <Button
        title={`Test Notification ${isInitialized ? '✅' : '⏳'}`}
        onPress={testNotification}
        disabled={!isInitialized}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
});

export default NotificationTestButton;
