import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { migrateRoomsToParticipants } from '../../utils/roomParticipants';

const MigrationButton: React.FC = () => {
  const [migrating, setMigrating] = useState(false);

  const handleMigration = async () => {
    if (migrating) return;

    Alert.alert(
      'Run Migration',
      'This will add participants field to existing chat rooms. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Migration',
          onPress: async () => {
            setMigrating(true);
            try {
              await migrateRoomsToParticipants();
              Alert.alert('Success', 'Migration completed successfully!');
            } catch (error) {
              console.error('Migration error:', error);
              Alert.alert('Error', 'Migration failed. Check console for details.');
            } finally {
              setMigrating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, migrating && styles.disabledButton]} 
        onPress={handleMigration}
        disabled={migrating}
      >
        {migrating ? (
          <>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.buttonText}>  Running Migration...</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Run Room Migration</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.description}>
        Adds participants field to existing rooms for new security features
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 250,
  },
});

export default MigrationButton;
