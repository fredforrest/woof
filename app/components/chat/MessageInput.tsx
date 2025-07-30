import React from 'react';
import { View, TextInput, Button, StyleSheet, Platform } from 'react-native';

interface MessageInputProps {
  newMessage: string;
  isSending: boolean;
  onTextChange: (text: string) => void;
  onSendMessage: () => void;
  onPickPhoto: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  isSending,
  onTextChange,
  onSendMessage,
  onPickPhoto,
}) => {
  return (
    <View style={styles.inputContainer}>
      <Button title="📷" onPress={onPickPhoto} disabled={isSending} />
      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        value={newMessage}
        onChangeText={onTextChange}
        multiline
      />
      <Button 
        title={isSending ? '...' : 'Send'} 
        onPress={onSendMessage} 
        disabled={!newMessage.trim() || isSending} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default MessageInput;
