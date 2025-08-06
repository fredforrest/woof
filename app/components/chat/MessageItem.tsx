import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import { Message } from '../../hooks/useMessages';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const currentUser = auth().currentUser;
  const isMyMessage = message.userId === currentUser?.uid;

  // Format the timestamp
  let formattedTimestamp = '';
  if (message.createdAt && typeof message.createdAt.toDate === 'function') {
    try {
      const date = message.createdAt.toDate();
      formattedTimestamp = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting date:', e);
      formattedTimestamp = '...';
    }
  } else if (message.createdAt) {
    formattedTimestamp = 'Pending...';
  }

  return (
    <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
      {!isMyMessage && (
        <Image
          source={
            message.senderAvatarUrl && message.senderAvatarUrl.startsWith('http') 
              ? { uri: message.senderAvatarUrl } 
              : require('../../images/default-avatar.png')
          }
          style={styles.avatar}
          onError={() => {
            // Avatar failed to load, using default
          }}
        />
      )}
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
        {!isMyMessage && <Text style={styles.senderName}>{message.senderName || 'User'}</Text>}
        {message.photoURL ? (
          <Image
            source={{ uri: message.photoURL }}
            style={styles.photoMessage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.messageText}>{message.text}</Text>
        )}
        <Text style={styles.messageTime}>{formattedTimestamp}</Text>
      </View>
      {isMyMessage && <View style={styles.myMessageSpacer} />}
    </View>
  );
};

const styles = StyleSheet.create({
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
  photoMessage: {
    width: 180, 
    height: 180, 
    borderRadius: 10, 
    marginBottom: 5,
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

export default MessageItem;
