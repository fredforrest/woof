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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useHeaderHeight } from '@react-navigation/elements';

interface Message {
  id: string;
  text: string;
  createdAt: any; // Firestore Timestamp (or null if using serverTimestamp pending write)
  userId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
}

const ChatScreen = ({ route }: any) => {
  const { roomId } = route.params; // Get roomId from navigation parameters
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const currentUser = auth().currentUser;
  const headerHeight = useHeaderHeight(); // Get header height for KAV offset

  // Ref for the FlatList
  const flatListRef = useRef<FlatList>(null);

  // --- Effect Hook for Fetching Messages ---
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') {
      console.error('Invalid roomId provided:', roomId);
      Alert.alert('Error', 'Cannot load chat. Invalid room ID.');
      setLoading(false);
      return;
    }

    const messagesListener = firestore()
      .collection('chatRooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        querySnapshot => {
          const fetchedMessages: Message[] = [];
          querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data?.createdAt) {
              fetchedMessages.push({
                id: doc.id,
                ...data,
              } as Message);
            }
          });

          setMessages(fetchedMessages.reverse()); // Reverse for chronological order
          if (loading) setLoading(false);
        },
        error => {
          console.error(`Error fetching messages for room ${roomId}: `, error);
          if ((error as any).code === 'permission-denied') {
            Alert.alert("Permission Error", "You don't have permission to view these messages.");
          } else {
            Alert.alert("Error", "Could not load messages.");
          }
          setLoading(false);
        }
      );

    return () => messagesListener();
  }, [roomId, loading]);

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // --- Callback Hook for Sending Messages ---
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentUser || isSending || !roomId) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage('');

    const senderName = currentUser.displayName || 'Unknown User';
    const senderAvatarUrl = currentUser.photoURL || null;

    const messageTimestamp = firestore.FieldValue.serverTimestamp();
    const messageData = {
      text: messageText,
      createdAt: messageTimestamp,
      userId: currentUser.uid,
      senderName: senderName,
      senderAvatarUrl: senderAvatarUrl,
    };

    try {
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const messagesRef = roomRef.collection('messages');

      const batch = firestore().batch();

      batch.set(messagesRef.doc(), messageData);
      batch.update(roomRef, {
        lastMessageTimestamp: messageTimestamp,
        lastMessageText: messageText,
      });

      await batch.commit();
    } catch (error) {
      console.error(`Error sending message to room ${roomId}: `, error);
      setNewMessage(messageText);
      if ((error as { code?: string }).code === 'permission-denied') {
        Alert.alert("Permission Error", "You don't have permission to send messages here.");
      } else {
        Alert.alert("Error", "Could not send message.");
      }
    } finally {
      setIsSending(false);
    }
  }, [newMessage, currentUser, roomId, isSending]);

  // --- Render Function for Each Message Item ---
  const renderMessageItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMyMessage = item.userId === currentUser?.uid;

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
              source={item.senderAvatarUrl ? { uri: item.senderAvatarUrl } : require('../images/default-avatar.png')}
              style={styles.avatar}
            />
          )}
          <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
            {!isMyMessage && <Text style={styles.senderName}>{item.senderName || 'User'}</Text>}
            <Text style={styles.messageText}>{item.text}</Text>
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
        inverted={true} // Keep true for chat UIs
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
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