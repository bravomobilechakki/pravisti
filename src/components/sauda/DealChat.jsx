import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const DealChat = ({ onNavigate, routeData }) => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      sender: 'Party',
      text: 'What is the quality of the product?',
      time: '10:30 AM',
      type: 'other',
    },
    {
      id: '2',
      sender: 'You',
      text: 'It is premium quality from the latest harvest.',
      time: '10:31 AM',
      type: 'me',
    },
  ]);

  const flatListRef = useRef();

  const deal = routeData?.deal || {
    title: 'Deal Chat',
    party: 'Unknown Party',
    icon: '🤝',
  };

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'You',
      text: message,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: 'me',
    };

    setChatMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  const renderMessageItem = ({ item }) => (
    <View
      style={[
        styles.messageWrapper,
        item.type === 'me'
          ? styles.myMessageWrapper
          : styles.otherMessageWrapper,
      ]}
    >
      {item.type === 'other' && (
        <Text style={styles.senderName}>{item.sender}</Text>
      )}

      <View
        style={[
          styles.messageBubble,
          item.type === 'me'
            ? styles.myMessageBubble
            : styles.otherMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.type === 'me'
              ? styles.myMessageText
              : styles.otherMessageText,
          ]}
        >
          {item.text}
        </Text>
      </View>

      <Text style={styles.messageTime}>{item.time}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate('pop')}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {deal.icon} {deal.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              {deal.party} • Deal Chat
            </Text>
          </View>

          <TouchableOpacity style={styles.infoButton}>
            <Text style={styles.infoIcon}>ℹ️</Text>
          </TouchableOpacity>
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachButton}>
            <Text style={styles.attachIcon}>+</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type message..."
            placeholderTextColor="#94A3B8"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.8}
            onPress={handleSend}
          >
            <Text style={styles.sendIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#0F172A',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  infoButton: {
    padding: 8,
  },
  infoIcon: {
    fontSize: 20,
  },
  chatList: {
    padding: 20,
    paddingBottom: 10,
  },
  messageWrapper: {
    marginBottom: 20,
    maxWidth: '80%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1E293B',
  },
  messageTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    marginHorizontal: 8,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attachIcon: {
    fontSize: 24,
    color: '#64748B',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1E293B',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 3,
  },
  sendIcon: {
    fontSize: 20,
  },
});

export default DealChat;