import React from 'react';
import { FlatList, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Message } from '../../hooks/useMessages';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  flatListRef: React.RefObject<FlatList>;
  onLoadMore: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  loadingMore,
  hasMore,
  flatListRef,
  onLoadMore,
}) => {
  const renderMessageItem = ({ item }: { item: Message }) => (
    <MessageItem message={item} />
  );

  const handleScroll = ({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const isAtTop = contentOffset.y >= contentSize.height - layoutMeasurement.height - 100;
    
    if (isAtTop && hasMore && !loadingMore) {
      onLoadMore();
    }
  };

  const ListEmptyComponent = !loading && messages.length === 0 ? (
    <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
  ) : null;

  const ListHeaderComponent = loadingMore ? (
    <ActivityIndicator style={{ margin: 10 }} />
  ) : null;

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessageItem}
      keyExtractor={item => item.id}
      style={styles.messageList}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      inverted={true}
      onScroll={handleScroll}
      scrollEventThrottle={400}
    />
  );
};

const styles = StyleSheet.create({
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MessageList;
