import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../components/navigation/types';
import { useNavigation } from '@react-navigation/native';
import JoinRoomComponent from '../components/ui/JoinRoomComponent';
import JoinRequestComponent from '../components/ui/JoinRequestComponent';
import JoinRequestNotifications from '../components/ui/JoinRequestNotifications';
import { Swipeable } from 'react-native-gesture-handler';


interface Room {
    id: string;
    name: string;
    description?: string;
    lastMessageTimestamp?: any;
    lastMessageText?: string;
    participants?: string[];
    createdBy?: string;
    isPrivate?: boolean;
    joinRequests?: any[];
    // Add other fields if needed
  }

  // --- ChatRooms Component ---
const ChatRooms = ({ }) => { // Pass navigation prop
    const navigation = useNavigation<RootStackNavigationProp>();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const currentUser = auth().currentUser;


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


  // --- Helper function to check if user can access room ---
  const canAccessRoom = (room: Room): boolean => {
    if (!currentUser) return false;
    
    // User can access if they created the room or are in participants
    return room.createdBy === currentUser.uid || 
           (room.participants?.includes(currentUser.uid) || false);
  };

  // --- Helper function to get room status ---
  const getRoomStatus = (room: Room): string => {
    if (!currentUser) return '';
    
    if (room.createdBy === currentUser.uid) return 'Owner';
    if (room.participants?.includes(currentUser.uid)) return 'Member';
    
    // Check if user has pending join request
    if (room.isPrivate && room.joinRequests?.some(req => req.userId === currentUser.uid)) {
      return 'Pending';
    }
    
    return room.isPrivate ? 'Request' : 'Join';
  };

  // --- Handle room press ---
  const handleRoomPress = (room: Room) => {
    if (canAccessRoom(room)) {
      // Navigate to chat if user has access
      navigation.navigate('ChatScreen', {roomId: room.id, roomName: room.name});
    } else if (room.isPrivate) {
      // Show join request modal for private rooms
      setSelectedRoom(room);
      setShowRequestModal(true);
    } else {
      // Show join modal for public rooms
      setSelectedRoom(room);
      setShowJoinModal(true);
    }
  };

  // --- Handle successful room join ---
  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    setShowRequestModal(false);
    setSelectedRoom(null);
    // Refresh the rooms list to show updated membership
    onRefresh();
  };

  // --- Handle room deletion ---
  const handleDeleteRoom = (room: Room) => {
    if (!currentUser) return;

    // Only allow room creators to delete rooms
    if (room.createdBy !== currentUser.uid) {
      Alert.alert('Permission Denied', 'Only the room creator can delete this room.');
      return;
    }

    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"? This action cannot be undone and will delete all messages.`,
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
                .doc(room.id)
                .collection('messages');
              
              const messagesSnapshot = await messagesRef.get();
              const batch = firestore().batch();
              
              messagesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              
              // Delete the room document
              const roomRef = firestore().collection('chatRooms').doc(room.id);
              batch.delete(roomRef);
              
              await batch.commit();
              
              Alert.alert('Success', 'Room deleted successfully.');
            } catch (error) {
              console.error('Error deleting room:', error);
              Alert.alert('Error', 'Failed to delete room. Please try again.');
            }
          },
        },
      ]
    );
  };

  // --- Render delete button for swipe ---
  const renderDeleteButton = (room: Room) => {
    // Only show delete button for room creators
    if (!currentUser || room.createdBy !== currentUser.uid) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteRoom(room)}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  // --- Render Item for FlatList ---
  const renderItem = ({ item }: { item: Room}) => {
    const roomStatus = getRoomStatus(item);
    const hasAccess = canAccessRoom(item);
    
    const roomContent = (
      <TouchableOpacity
        style={[styles.row, item.isPrivate && styles.privateRow]}
        onPress={() => handleRoomPress(item)}
      >
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.roomName}>
              {item.isPrivate ? '🔒 ' : '🌍 '}{item.name}
            </Text>
            <Text style={[
              styles.statusBadge, 
              roomStatus === 'Owner' && styles.ownerBadge,
              roomStatus === 'Member' && styles.memberBadge,
              roomStatus === 'Join' && styles.joinBadge,
              roomStatus === 'Request' && styles.requestBadge,
              roomStatus === 'Pending' && styles.pendingBadge
            ]}>
              {roomStatus}
            </Text>
          </View>
          <Text style={styles.roomDescription}>
            {item.description || 'No description'} 
            {item.isPrivate && ' • Private Room'}
          </Text>
          {/* Show last message only if user has access */}
          {hasAccess && (
            <Text style={styles.lastMessage}>{item.lastMessageText || ''}</Text>
          )}
          {!hasAccess && (
            <Text style={styles.joinPrompt}>
              {item.isPrivate 
                ? roomStatus === 'Pending' 
                  ? 'Join request pending approval'
                  : 'Tap to request access'
                : 'Tap to join this room'
              }
            </Text>
          )}
        </View>
        {/* Add appropriate icon */}
        <Text style={styles.chevron}>
          {hasAccess ? '>' : item.isPrivate ? '📩' : '+'}
        </Text>
      </TouchableOpacity>
    );

    // Only wrap with Swipeable if user is the room creator
    if (currentUser && item.createdBy === currentUser.uid) {
      return (
        <Swipeable renderRightActions={() => renderDeleteButton(item)}>
          {roomContent}
        </Swipeable>
      );
    }

    return roomContent;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Notification Header */}
      {pendingRequestsCount > 0 && (
        <View style={styles.notificationHeader}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setShowNotificationsModal(true)}
          >
            <Text style={styles.notificationText}>
              🔔 {pendingRequestsCount} pending join request{pendingRequestsCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.tapText}>Tap to manage</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Pending Requests Button */}
        <TouchableOpacity
          style={[styles.fab, styles.requestsFab]}
          onPress={() => navigation.navigate("PendingRequests")}
        >
          <Text style={styles.fabText}>🔔</Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Create Room Button */}
        <TouchableOpacity
          style={[styles.fab, styles.newChatButton]}
          onPress={() => navigation.navigate("Create Room")}
        >
          <Text style={styles.newchatText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.notificationModalContainer}>
          <View style={styles.notificationModalHeader}>
            <Text style={styles.notificationModalTitle}>Join Requests</Text>
            <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <JoinRequestNotifications 
            onRequestsChange={(count) => setPendingRequestsCount(count)}
          />
        </View>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedRoom && (
            <JoinRoomComponent
              roomId={selectedRoom.id}
              roomName={selectedRoom.name}
              onJoinSuccess={handleJoinSuccess}
              onCancel={() => setShowJoinModal(false)}
            />
          )}
        </View>
      </Modal>

      {/* Join Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedRoom && (
            <JoinRequestComponent
              roomId={selectedRoom.id}
              roomName={selectedRoom.name}
              onRequestSent={handleJoinSuccess}
              onCancel={() => setShowRequestModal(false)}
            />
          )}
        </View>
      </Modal>
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
  privateRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    backgroundColor: '#fff8e1',
  },
  textContainer: {
    flex: 1, // Takes available space
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 50,
  },
  ownerBadge: {
    backgroundColor: '#4CAF50',
    color: '#FFF',
  },
  memberBadge: {
    backgroundColor: '#2196F3',
    color: '#FFF',
  },
  joinBadge: {
    backgroundColor: '#FF9800',
    color: '#FFF',
  },
  requestBadge: {
    backgroundColor: '#9C27B0',
    color: '#FFF',
  },
  pendingBadge: {
    backgroundColor: '#607D8B',
    color: '#FFF',
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
   joinPrompt: {
     fontSize: 12,
     color: '#FF9800',
     marginTop: 5,
     fontStyle: 'italic',
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
    backgroundColor: '#2196F3',
  },
  newchatText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationHeader: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  notificationButton: {
    alignItems: 'center',
  },
  notificationText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tapText: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  notificationModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2196F3',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  notificationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  requestsFab: {
    backgroundColor: '#FF9800',
  },
  fabText: {
    color: '#fff',
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ChatRooms;