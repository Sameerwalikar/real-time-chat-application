import { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, Smile, Paperclip, MoreVertical, Menu } from 'lucide-react';
import { getSocket } from '../socket';

export default function ChatArea({
  currentUser,
  activeRoom,
  onBackClick, // for mobile views
  onRoomInfoClick, // to toggle online list drawer
  typingStates,
  onOpenJoinModal,
  onJoinByCode,
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');
  const socket = getSocket();

  // Load Message History
  useEffect(() => {
    if (!activeRoom) return;
    // If group and user is not a member, don't fetch messages
    if (activeRoom.isGroup && activeRoom.isMember === false) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/messages/${activeRoom._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setMessages(data.data);
        }
      } catch (err) {
        console.error('Failed to load message history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Reset typing states on input change
    setInputMessage('');
    setIsTyping(false);
    if (socket) {
      socket.emit('typing', { roomId: activeRoom._id, isTyping: false });
    }
  }, [activeRoom, API_URL, token]);

  // Subscribe to real-time message events for active room
  useEffect(() => {
    if (!socket || !activeRoom) return;

    const handleIncomingMessage = (message) => {
      if (message.room === activeRoom._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('message', handleIncomingMessage);

    return () => {
      socket.off('message', handleIncomingMessage);
    };
  }, [socket, activeRoom]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStates]);

  // Handle Input Changes and Typing Indicator
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    if (!socket || !activeRoom) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId: activeRoom._id, isTyping: true });
    }

    // Debounce typing indicator closure
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { roomId: activeRoom._id, isTyping: false });
    }, 2000);
  };

  // Submit Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!socket || !activeRoom) return;

    // Emit chatMessage socket event
    socket.emit('chatMessage', {
      roomId: activeRoom._id,
      content: inputMessage.trim(),
    });

    // Reset typing status immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    socket.emit('typing', { roomId: activeRoom._id, isTyping: false });

    setInputMessage('');
  };

  // Format message status/ticks
  const renderMessageTicks = (msg) => {
    if (msg.sender._id !== currentUser._id) return null;
    
    // We check if readBy array has any participants other than the sender
    const isRead = msg.readBy && msg.readBy.some(id => id !== currentUser._id);
    
    return (
      <span className={`message-ticks ${isRead ? 'read' : ''}`}>
        {isRead ? '✓✓' : '✓'}
      </span>
    );
  };

  if (!activeRoom) {
    return (
      <div className="chat-welcome">
        <div className="welcome-icon-circle">
          <Paperclip size={48} />
        </div>
        <h2 className="welcome-title">3w chat app</h2>
        <p className="welcome-desc">
          Send and receive messages instantly. Select any contact or room from the sidebar, or create a new room to begin.
        </p>
      </div>
    );
  }

  // If group and not a member, show join prompt instead of messages
  if (activeRoom.isGroup && activeRoom.isMember === false) {
    return (
      <div className="chat-area">
        <header className="chat-header">
          <div className="chat-header-info" onClick={onRoomInfoClick}>
            <button className="icon-btn" style={{ display: 'none' }} onClick={onBackClick}>
              <Menu size={20} />
            </button>
            <img className="avatar-img" src={activeRoom.avatar} alt={activeRoom.name} />
            <div className="chat-header-details">
              <h3 className="chat-header-name">{activeRoom.name}</h3>
              <span className="chat-header-sub">Private group — join with code</span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" title="Chat Info" onClick={onRoomInfoClick}>
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        <div className="messages-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 520, textAlign: 'center', padding: 24, background: 'var(--bg-panel)', borderRadius: 12 }}>
            <h3 style={{ marginBottom: 8 }}>{activeRoom.name}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>This is a private group. Enter the 6-digit code to join.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <input className="modal-input" placeholder="Enter 6-digit code" id="inline-join-code" />
              <button className="modal-btn confirm" onClick={() => {
                const code = document.getElementById('inline-join-code').value.trim();
                if (onJoinByCode) onJoinByCode(code);
              }}>Join</button>
              <button className="modal-btn" onClick={() => { if (onOpenJoinModal) onOpenJoinModal(); }}>Open Join Modal</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Resolve Header Metadata
  const isGroup = activeRoom.isGroup;
  let roomName = activeRoom.name;
  let roomAvatar = activeRoom.avatar;
  let roomSubtitle = '';

  if (!isGroup) {
    const recipient = activeRoom.participants.find((p) => p._id !== currentUser._id);
    if (recipient) {
      roomName = recipient.username;
      roomAvatar = recipient.avatar;
      roomSubtitle = recipient.status === 'online' ? 'online' : `last seen recently`;
    } else {
      roomName = 'Saved Messages';
      roomAvatar = currentUser.avatar;
      roomSubtitle = 'Store your personal notes';
    }
  } else {
    roomSubtitle = `${activeRoom.participants?.length || 1} members`;
  }

  // Typing state for this room (exclude current user)
  const roomTypingInfo = typingStates[activeRoom._id];
  const typingUser = roomTypingInfo
    ? Object.values(roomTypingInfo).find((t) => t.isTyping && t.userId !== currentUser._id)
    : null;

  // Group messages by Date headers
  const getGroupedMessages = () => {
    const groups = [];
    let lastDate = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ type: 'date', value: new Date(msg.createdAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) });
        lastDate = msgDate;
      }
      groups.push({ type: 'message', value: msg });
    });

    return groups;
  };

  const groupedMessages = getGroupedMessages();

  return (
    <div className="chat-area">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="chat-header-info" onClick={onRoomInfoClick}>
          {/* Back button on mobile */}
          <button className="icon-btn" style={{ display: 'none' }} onClick={onBackClick}>
            <Menu size={20} />
          </button>
          
          <img className="avatar-img" src={roomAvatar} alt={roomName} />
          
          <div className="chat-header-details">
            <h3 className="chat-header-name">{roomName}</h3>
            <span className="chat-header-sub">
              {typingUser ? 'typing...' : roomSubtitle}
            </span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="icon-btn" title="Start Call">
            <Phone size={18} />
          </button>
          <button className="icon-btn" title="Video Call">
            <Video size={18} />
          </button>
          <button className="icon-btn" title="Search Message">
            <Search size={18} />
          </button>
          <button className="icon-btn" title="Chat Info" onClick={onRoomInfoClick}>
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Messages Scroll Panel */}
      <div className="messages-container">
        {loading ? (
          <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>Loading history...</div>
        ) : groupedMessages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '300px' }}>
            <p style={{ fontWeight: 600, marginBottom: '8px' }}>No Messages Yet</p>
            <p style={{ fontSize: '0.85rem' }}>Send a message to start the conversation!</p>
          </div>
        ) : (
          groupedMessages.map((item, index) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${index}`} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                  <span style={{ backgroundColor: 'var(--bg-search)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {item.value}
                  </span>
                </div>
              );
            }

            const msg = item.value;
            const isSent = msg.sender._id === currentUser._id;
            const formatMsgTime = (isoString) => {
              return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            return (
              <div
                key={msg._id || index}
                className={`message-bubble-row ${isSent ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  {isGroup && !isSent && (
                    <span className="message-sender-name">{msg.sender.username}</span>
                  )}
                  <p className="message-content">{msg.content}</p>
                  <div className="message-info-footer">
                    <span className="message-time">{formatMsgTime(msg.createdAt)}</span>
                    {renderMessageTicks(msg)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Dynamic Typing Notification bubble */}
        {typingUser && (
          <div className="typing-indicator-chat">
            <span>{typingUser.username} is typing</span>
            <div className="dot-animation"></div>
            <div className="dot-animation"></div>
            <div className="dot-animation"></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <footer className="chat-footer">
        <button className="icon-btn" title="Emoji">
          <Smile size={22} />
        </button>
        <button className="icon-btn" title="Attach">
          <Paperclip size={22} />
        </button>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <div className="chat-input-wrapper">
            <textarea
              className="chat-textarea"
              placeholder="Type a message"
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>

          <button
            type="submit"
            className="icon-btn"
            style={{
              backgroundColor: inputMessage.trim() ? 'var(--accent-color)' : 'transparent',
              color: inputMessage.trim() ? 'white' : 'var(--text-secondary)',
            }}
            disabled={!inputMessage.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
