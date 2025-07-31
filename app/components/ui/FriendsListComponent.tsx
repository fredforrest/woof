import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Friend {
  id: string;
  displayName: string;
  email: string;
  isOnline?: boolean;
  lastSeen?: any;
}

interface FriendsListProps {
  onFriendPress?: (friend: Friend) => void;
}

const FriendsListComponent: React.FC<FriendsListProps> = ({ onFriendPress }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Listen for current user's friends list changes
    const unsubscribe = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(async (userDoc) => {
        if (!userDoc.exists) {
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const friendIds = userData?.friends || [];

        if (friendIds.length === 0) {
          setFriends([]);
          setFilteredFriends([]);
          setLoading(false);
          return;
        }

        try {
          // Fetch friend details
          const friendsData: Friend[] = [];
          
          // Process friends in batches of 10 (Firestore limit)
          for (let i = 0; i < friendIds.length; i += 10) {
            const batch = friendIds.slice(i, i + 10);
            const friendsSnapshot = await firestore()
              .collection('users')
              .where(firestore.FieldPath.documentId(), 'in', batch)
              .get();

            friendsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              
              // Determine if user is truly online (within last 5 minutes)
              const isRecentlyActive = data.lastSeen ? 
                (new Date().getTime() - (data.lastSeen.toDate ? data.lastSeen.toDate() : new Date(data.lastSeen)).getTime()) < 5 * 60 * 1000 : false;
              
              friendsData.push({
                id: doc.id,
                displayName: data.displayName || data.userName || 'Unknown User',
                email: data.email || '',
                isOnline: data.isOnline && isRecentlyActive, // Only online if both flags are true AND recently active
                lastSeen: data.lastSeen
              });
            });
          }

          // Sort friends alphabetically
          friendsData.sort((a, b) => a.displayName.localeCompare(b.displayName));
          
          setFriends(friendsData);
          setFilteredFriends(friendsData);
          setLoading(false);
          
        } catch (error) {
          console.error('Error fetching friends data:', error);
          setLoading(false);
        }
      }, error => {
        console.error('Error listening to user friends:', error);
        setLoading(false);
      });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    // Filter friends based on search query
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const handleRemoveFriend = async (friend: Friend) => {
    if (!currentUser) return;
    
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from both users' friends lists
              const batch = firestore().batch();
              
              batch.update(firestore().collection('users').doc(currentUser.uid), {
                friends: firestore.FieldValue.arrayRemove(friend.id)
              });
              
              batch.update(firestore().collection('users').doc(friend.id), {
                friends: firestore.FieldValue.arrayRemove(currentUser.uid)
              });

              await batch.commit();
              
              Alert.alert('Removed', `${friend.displayName} has been removed from your friends list.`);
              
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Never';
    
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Friends ({friends.length})
        </Text>
        
        {friends.length > 0 && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        )}
      </View>

      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Friends Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start by searching for users and sending friend requests!
          </Text>
        </View>
      ) : filteredFriends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Matches</Text>
          <Text style={styles.emptySubtitle}>
            No friends match your search query.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.friendsList}>
          {filteredFriends.map((friend) => (
            <View key={friend.id} style={styles.friendCard}>
              <TouchableOpacity
                style={styles.friendInfo}
                onPress={() => onFriendPress && onFriendPress(friend)}
              >
                <View style={styles.friendDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: friend.isOnline ? '#4CAF50' : '#999' }
                    ]} />
                  </View>
                  <Text style={styles.friendEmail}>{friend.email}</Text>
                  <Text style={styles.lastSeen}>
                    Last seen: {formatLastSeen(friend.lastSeen)}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFriend(friend)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  friendsList: {
    flex: 1,
  },
  friendCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
  },
  friendInfo: {
    flex: 1,
    padding: 15,
  },
  friendDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  friendEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  lastSeen: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  removeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default FriendsListComponent;
