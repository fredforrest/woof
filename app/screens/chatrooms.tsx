import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { RootStackNavigationProp } from '../components/navigation/types';
import { useNavigation } from '@react-navigation/native';


interface Room {
    id: string;
    name: string;
    description?: string;
    lastMessageTimestamp?: any;
    lastMessageText?: string;
    // Add other fields if needed
  }

  // --- ChatRooms Component ---
const ChatRooms = ({ }) => { // Pass navigation prop
    const navigation = useNavigation<RootStackNavigationProp>();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);


  // --- Firestore Listener Setup ---
  // 1. Use useEffect to set up a listener for Firestore collection changes
  // 2. Use the 'onSnapshot' method to listen for real-time updates
  // 3. Use the 'orderBy' method to sort the chat rooms by last message timestamp
  useEffect(() => {
    const subscriber = firestore()
      .collection('chatRooms')
      .orderBy('lastMessageTimestamp', 'desc')
      .onSnapshot(querySnapshot => {
        // 3. Type the fetchedRooms array using the Interface
        const fetchedRooms: Room[] = [];
        if (querySnapshot) {
          querySnapshot.forEach(documentSnapshot => {
            fetchedRooms.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as Room); // Use 'as Room' to assure TypeScript it matches
          });
        }

        setRooms(fetchedRooms);
        if (loading) {
          setLoading(false);
        }
         setRefreshing(false); // Stop refresh indicator if it was active
      }, error => {
         // Handle errors during snapshot listening
         console.error("Error fetching rooms: ", error);
         setLoading(false);
         setRefreshing(false);
         // Maybe show an error message to the user
      });

    // Unsubscribe from events when the component unmounts
    return () => subscriber();
  }, []);

  // --- Pull to Refresh Logic ---
   const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically receive the latest data
    // If you needed to force a re-fetch *without* a listener, you'd call a function here.
    // With onSnapshot, setting refreshing to true is mainly for the UI indicator.
    // Firestore's listener handles the data refresh automatically.
    // We set refreshing back to false inside the onSnapshot callback.
   };


  // --- Render Item for FlatList ---
  const renderItem = ({ item }: { item: Room}) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        // Navigate to the Chat screen with the roomId and roomName
        navigation.navigate('ChatScreen', {roomId: item.id, roomName: item.name});
      }}
    >
      <View style={styles.textContainer}>
        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={styles.roomDescription}>{item.description || 'No description'}</Text>
        {/* Optional: Display last message text or timestamp */}
        <Text style={styles.lastMessage}>{item.lastMessageText || ''}</Text>
      </View>
      {/* Add Chevron Icon Here - Example using text, replace with real icon */}
      <Text style={styles.chevron}>{'>'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rooms}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No chat rooms available.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => navigation.navigate("Create Room")}>
        <Text style={styles.newchatText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  textContainer: {
    flex: 1, // Takes available space
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
   lastMessage: {
     fontSize: 12,
     color: '#999',
     marginTop: 5,
   },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 10,
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196F3',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  newchatText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ChatRooms;