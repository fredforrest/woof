import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  AppState,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useHeaderHeight } from '@react-navigation/elements';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { 
  validateMessage, 
  sanitizeInput, 
  validateRoomId, 
  messageRateLimit, 
  getCurrentUser, 
  canUserAccessRoom, 
  validateImageFile, 
  validateFileSize, 
  handleSecureError, 
  logSecurityEvent 
} from '../utils/security';


interface Message {
  id: string;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  userId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  isTyping?: boolean; // Optional typing indicator
  photoURL? : string; // URL for photo messages
}

const ChatScreen = ({ route }: any) => {
  const { roomId } = route.params; // Get roomId from navigation parameters
  
  // Security: Validate roomId
  if (!validateRoomId(roomId)) {
    Alert.alert('Error', 'Invalid room ID');
    return (
      <View style={styles.center}>
        <Text>Invalid room</Text>
      </View>
    );
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastVisible, setLastVisible] = useState<FirebaseFirestoreTypes.DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const currentUser = auth().currentUser;
  const headerHeight = useHeaderHeight(); // Get header height for KAV offset
  const isTyping = useRef(false); // Ref to track typing status
  const isTypingTimeout = useRef<NodeJS.Timeout | null>(null); // Ref to manage typing timeout

  // Ref for the FlatList
  const flatListRef = useRef<FlatList>(null);

  // Security: Clear sensitive data when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // Clear messages from memory for security
        setMessages([]);
        setNewMessage('');
      }
    });
    
    return () => subscription?.remove();
  }, []);

  const pickAndSendPhoto = async () => {
    try {
      const user = getCurrentUser();
      
      // Check rate limit
      if (!messageRateLimit.canSendMessage(user.uid)) {
        Alert.alert('Rate Limit', 'Please wait before sending another message.');
        return;
      }

      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.7,
        },
        async response => {
          if (response.didCancel) return;
          if (response.errorCode) {
            handleSecureError(response.errorCode, 'Could not pick image.');
            return;
          }
          
          const uri = response.assets && response.assets[0]?.uri;
          if (!uri) return;

          // Validate image file
          const isValidImage = await validateImageFile(uri);
          const isValidSize = await validateFileSize(uri, 5); // 5MB limit

          if (!isValidImage) {
            Alert.alert('Invalid File', 'Please select a valid image (max 1024x1024px).');
            return;
          }

          if (!isValidSize) {
            Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
            return;
          }

          handleSendPhoto(uri);
        }
      );
    } catch (error) {
      handleSecureError(error, 'Could not access photo library.');
    }
  };

  // --- Effect Hook for Fetching Messages ---
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') {
      console.error('Invalid roomId provided:', roomId);
      Alert.alert('Error', 'Cannot load chat. Invalid room ID.');
      setLoading(false);
      return;
    }

    let messagesListener: (() => void) | null = null;

    const setupMessagesListener = async () => {
      try {
        // Security: Check if user has access to this room
        const user = getCurrentUser();
        const hasAccess = await canUserAccessRoom(roomId, user.uid);
        
        if (!hasAccess) {
          Alert.alert('Access Denied', 'You do not have permission to view this chat.');
          setLoading(false);
          return;
        }

        // Log security event
        await logSecurityEvent('chat_room_accessed', { roomId });

        // Initial fetch of last 50 messages
        const initialSnapshot = await firestore()
          .collection('chatRooms')
          .doc(roomId)
          .collection('messages')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        const fetchedMessages: Message[] = [];
        initialSnapshot.forEach(doc => {
          const data = doc.data();
          if (data?.createdAt) {
            fetchedMessages.push({
              id: doc.id,
              ...data,
            } as Message);
          }
        });

        setMessages(fetchedMessages.reverse());
        setLastVisible(initialSnapshot.docs[initialSnapshot.docs.length - 1]);
        setHasMore(initialSnapshot.size === 50);
        setLoading(false);

        // Set up real-time listener for new messages only
        if (initialSnapshot.docs.length > 0) {
          messagesListener = firestore()
            .collection('chatRooms')
            .doc(roomId)
            .collection('messages')
            .where('createdAt', '>', initialSnapshot.docs[0].data().createdAt)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
              newSnapshot => {
                const newMessages: Message[] = [];
                newSnapshot.forEach(doc => {
                  const data = doc.data();
                  if (data?.createdAt) {
                    newMessages.push({
                      id: doc.id,
                      ...data,
                    } as Message);
                  }
                });
                
                if (newMessages.length > 0) {
                  setMessages(prev => {
                    const existingIds = new Set(prev.map(msg => msg.id));
                    const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
                    return [...prev, ...uniqueNewMessages.reverse()];
                  });
                }
              },
              error => {
                console.error(`Error listening for new messages: `, error);
                handleSecureError(error, 'Error loading new messages.');
              }
            );
        }
      } catch (error) {
        console.error(`Error fetching messages for room ${roomId}: `, error);
        if ((error as any).code === 'permission-denied') {
          Alert.alert("Permission Error", "You don't have permission to view these messages.");
        } else {
          handleSecureError(error, "Could not load messages.");
        }
        setLoading(false);
      }
    };

    setupMessagesListener();

    return () => {
      if (messagesListener) {
        messagesListener();
      }
    };
  }, [roomId]);

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // --- Handle Typing ---
  const handleTyping = (text: string) => {
    // Security: Sanitize and validate input
    const sanitizedText = sanitizeInput(text);
    setNewMessage(sanitizedText);

    if (!isTyping.current) {
      isTyping.current = true;
      // Notify others that the user is typing
      firestore()
        .collection('chatRooms')
        .doc(roomId)
        .update({ [`typing.${currentUser?.uid}`]: true })
        .catch(error => {
          console.error('Error updating typing status:', error);
        });
    }

    if (isTypingTimeout.current) {
      clearTimeout(isTypingTimeout.current);
    }

    isTypingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      // Notify others that the user stopped typing
      firestore()
        .collection('chatRooms')
        .doc(roomId)
        .update({ [`typing.${currentUser?.uid}`]: false })
        .catch(error => {
          console.error('Error updating typing status:', error);
        });
    }, 2000); // Reset typing state after 2 seconds of inactivity
  };

  // --- Callback Hook for Sending Messages ---
  const handleSendMessage = useCallback(async () => {
    try {
      const user = getCurrentUser();
      
      // Security: Validate message
      if (!validateMessage(newMessage)) {
        Alert.alert('Invalid Message', 'Message must be between 1 and 1000 characters.');
        return;
      }

      // Security: Check rate limit
      if (!messageRateLimit.canSendMessage(user.uid)) {
        Alert.alert('Rate Limit', 'Please wait before sending another message.');
        return;
      }

      // Security: Check room access
      const hasAccess = await canUserAccessRoom(roomId, user.uid);
      if (!hasAccess) {
        Alert.alert('Access Denied', 'You do not have permission to send messages here.');
        return;
      }

      if (isSending) return;

      setIsSending(true);
      const messageText = sanitizeInput(newMessage);
      setNewMessage('');

      const senderName = user.displayName || 'Unknown User';
      const senderAvatarUrl = user.photoURL || null;

      const messageTimestamp = firestore.FieldValue.serverTimestamp();
      const messageData = {
        text: messageText,
        createdAt: messageTimestamp,
        userId: user.uid,
        senderName: senderName,
        senderAvatarUrl: senderAvatarUrl,
      };

      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const messagesRef = roomRef.collection('messages');

      const batch = firestore().batch();

      batch.set(messagesRef.doc(), messageData);
      batch.update(roomRef, {
        lastMessageTimestamp: messageTimestamp,
        lastMessageText: messageText,
      });

      await batch.commit();
      
      // Log security event
      await logSecurityEvent('message_sent', { roomId, messageLength: messageText.length });
      
    } catch (error) {
      console.error(`Error sending message to room ${roomId}: `, error);
      setNewMessage(newMessage); // Restore message on error
      
      if ((error as { code?: string }).code === 'permission-denied') {
        Alert.alert("Permission Error", "You don't have permission to send messages here.");
      } else {
        handleSecureError(error, "Could not send message.");
      }
    } finally {
      setIsSending(false);
    }
  }, [newMessage, roomId, isSending]);

 const handleSendPhoto = useCallback(
  async (uri: string) => {
    try {
      const user = getCurrentUser();
      
      // Security: Check rate limit
      if (!messageRateLimit.canSendMessage(user.uid)) {
        Alert.alert('Rate Limit', 'Please wait before sending another message.');
        return;
      }

      // Security: Check room access
      const hasAccess = await canUserAccessRoom(roomId, user.uid);
      if (!hasAccess) {
        Alert.alert('Access Denied', 'You do not have permission to send photos here.');
        return;
      }

      if (isSending) return;

      setIsSending(true);

      const fileName = `${user.uid}_${Date.now()}`;
      const ref = storage().ref(`chatRooms/${roomId}/${fileName}`);
      await ref.putFile(uri);
      const downloadURL = await ref.getDownloadURL();

      const senderName = user.displayName || 'Unknown User';
      const senderAvatarUrl = user.photoURL || null;
      const messageTimestamp = firestore.FieldValue.serverTimestamp();

      const messageData = {
        photoURL: downloadURL,
        createdAt: messageTimestamp,
        userId: user.uid,
        senderName: senderName,
        senderAvatarUrl: senderAvatarUrl,
      };

      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const messagesRef = roomRef.collection('messages');
      const batch = firestore().batch();

      batch.set(messagesRef.doc(), messageData);
      batch.update(roomRef, {
        lastMessageTimestamp: messageTimestamp,
        lastMessageText: '[Photo]',
      });

      await batch.commit();
      
      // Log security event
      await logSecurityEvent('photo_sent', { roomId });
      
    } catch (error) {
      handleSecureError(error, 'Failed to send photo.');
    } finally {
      setIsSending(false);
    }
  },
  [roomId, isSending]
);

  // --- Load More Messages Function ---
  const loadMoreMessages = async () => {
    if (!roomId || !lastVisible || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const snapshot = await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .startAfter(lastVisible)
        .limit(50)
        .get();

      const fetchedMessages: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data?.createdAt) {
          fetchedMessages.push({
            id: doc.id,
            ...data,
          } as Message);
        }
      });

      if (fetchedMessages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id));
          return [...uniqueNewMessages.reverse(), ...prev];
        });
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      setHasMore(snapshot.size === 50);
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // --- Render Function for Each Message Item ---
const renderMessageItem = useCallback(
  ({ item }: { item: Message }) => {
    const isMyMessage = item.userId === currentUser?.uid;

    // Format the timestamp
    let formattedTimestamp = '';
    if (item.createdAt && typeof item.createdAt.toDate === 'function') {
      try {
        const date = item.createdAt.toDate();
        formattedTimestamp = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      } catch (e) {
        console.error('Error formatting date:', e);
        formattedTimestamp = '...';
      }
    } else if (item.createdAt) {
      formattedTimestamp = 'Pending...';
    }

       return (
      <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
        {!isMyMessage && (
          <Image
            source={
              item.senderAvatarUrl && item.senderAvatarUrl.startsWith('http') 
                ? { uri: item.senderAvatarUrl } 
                : require('../images/default-avatar.png')
            }
            style={styles.avatar}
            onError={() => {
              console.log('Avatar failed to load, using default');
            }}
          />
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
          {!isMyMessage && <Text style={styles.senderName}>{item.senderName || 'User'}</Text>}
          {item.photoURL ? (
            <Image
              source={{ uri: item.photoURL }}
              style={{ width: 180, height: 180, borderRadius: 10, marginBottom: 5 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.messageText}>{item.text}</Text>
          )}
          <Text style={styles.messageTime}>{formattedTimestamp}</Text>
        </View>
        {isMyMessage && <View style={styles.myMessageSpacer} />}
      </View>
    );
  },
  [currentUser]
);

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // --- Main Return JSX ---
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={flatListRef} // Attach the ref to the FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id} 
        style={styles.messageList}
        ListEmptyComponent={
          !loading && messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          ) : null
        }
        ListHeaderComponent={loadingMore ? <ActivityIndicator style={{ margin: 10 }} /> : null}
        inverted={true} // Keep true for chat UIs
        onScroll={({ nativeEvent }) => {
          const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
          const isAtTop = contentOffset.y >= contentSize.height - layoutMeasurement.height - 100;
          
          if (isAtTop && hasMore && !loadingMore) {
            loadMoreMessages();
          }
        }}
        scrollEventThrottle={400}
      />
      <View style={styles.inputContainer}>
  <Button title="📷" onPress={pickAndSendPhoto} disabled={isSending} />
  <TextInput
    style={styles.input}
    placeholder="Type a message..."
    value={newMessage}
    onChangeText={handleTyping}
    multiline
  />
  <Button title={isSending ? '...' : 'Send'} onPress={handleSendMessage} disabled={!newMessage.trim() || isSending} />
</View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginVertical: 3,
  },
  myMessageBubble: {
    backgroundColor: '#e6e4d5',
    color: '#fff',
    alignSelf: 'flex-end',
  },
  theirMessageBubble: {
    backgroundColor: '#e0e0e0',
  },
  senderName: {
    fontWeight: 'bold',
    color: '#333',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  emptyText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
  },
  myMessageSpacer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginLeft: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;