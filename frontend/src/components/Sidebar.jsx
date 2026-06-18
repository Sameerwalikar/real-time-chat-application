import { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, MessageSquarePlus, Search, ArrowLeft, Users2, MessageSquareCode } from 'lucide-react';

export default function Sidebar({
  currentUser,
  rooms,
  activeRoom,
  onRoomSelect,
  onCreateGroupClick,
  onLogout,
  theme,
  setTheme,
  typingStates,
  onOpenJoinModal,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'groups', 'personal'
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  // Load all users when the user drawer is opened
  useEffect(() => {
    if (showUserDrawer) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await fetch(`${API_URL}/rooms/users`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (data.success) {
            setAllUsers(data.data);
          }
        } catch (err) {
          console.error('Failed to fetch users', err);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [showUserDrawer, API_URL, token]);

  const handleStartDM = async (recipientId) => {
    try {
      const response = await fetch(`${API_URL}/rooms/dm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId }),
      });
      const data = await response.json();
      if (data.success) {
        onRoomSelect(data.data);
        setShowUserDrawer(false);
        setDrawerSearch('');
      }
    } catch (err) {
      console.error('Failed to create/get DM room', err);
    }
  };

  // Helper to format room display attributes
  const getRoomMeta = (room) => {
    if (room.isGroup) {
      return {
        name: room.name,
        avatar: room.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(room.name)}`,
        isOnline: false,
      };
    }

    // Direct Message - Find recipient
    const recipient = room.participants.find((p) => p._id !== currentUser._id);
    if (!recipient) {
      return {
        name: 'Saved Messages (You)',
        avatar: currentUser.avatar,
        isOnline: true,
      };
    }

    return {
      name: recipient.username,
      avatar: recipient.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipient.username)}`,
      isOnline: recipient.status === 'online',
    };
  };

  // Filtering Rooms
  const filteredRooms = rooms.filter((room) => {
    const meta = getRoomMeta(room);
    const matchesSearch = meta.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'groups') return room.isGroup;
    if (activeTab === 'personal') return !room.isGroup;
    return true;
  });

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(drawerSearch.toLowerCase())
  );

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <header className="sidebar-header">
        <div className="sidebar-user">
          <div className="avatar-wrapper">
            <img className="avatar-img" src={currentUser.avatar} alt={currentUser.username} />
            <span className="status-dot"></span>
          </div>
          <span className="sidebar-username" title={currentUser.username}>
            {currentUser.username}
          </span>
        </div>

        <div className="sidebar-actions">
          {/* Join-by-code quick button (opens modal via prop) */}
          {typeof onOpenJoinModal === 'function' ? (
            <button className="icon-btn" title="Join Group by Code" onClick={onOpenJoinModal}>
              <MessageSquareCode size={18} />
            </button>
          ) : null}
          <button
            className="icon-btn"
            title="New Direct Chat"
            onClick={() => setShowUserDrawer(true)}
          >
            <MessageSquarePlus size={20} />
          </button>
          
          <button
            className="icon-btn"
            title="Create Group"
            onClick={onCreateGroupClick}
          >
            <Users2 size={20} />
          </button>

          <button
            className="icon-btn"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="icon-btn" title="Logout" onClick={onLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="sidebar-search-container">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="sidebar-tabs">
        <button
          className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`tab-pill ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
        <button
          className={`tab-pill ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Chats
        </button>
      </div>

      {/* Rooms List */}
      <div className="rooms-list">
        {filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            No chats found
          </div>
        ) : (
          filteredRooms.map((room) => {
            const meta = getRoomMeta(room);
            const isSelected = activeRoom && activeRoom._id === room._id;
            const typingInfo = typingStates[room._id];
            
            // Check if someone in the room is currently typing (exclude self)
            const typingUser = typingInfo ? Object.values(typingInfo).find(t => t.isTyping && t.userId !== currentUser._id) : null;

            return (
              <div
                key={room._id}
                className={`room-item ${isSelected ? 'active' : ''}`}
                onClick={() => onRoomSelect(room)}
              >
                <div className="avatar-wrapper">
                  <img className="avatar-img" src={meta.avatar} alt={meta.name} />
                  {!room.isGroup && (
                    <span className={`status-dot ${meta.isOnline ? '' : 'offline'}`}></span>
                  )}
                </div>

                <div className="room-details">
                  <div className="room-name-row">
                    <span className="room-name">{meta.name}</span>
                    <span className="room-time">
                      {formatTime(room.lastMessage ? room.lastMessage.createdAt : room.updatedAt)}
                    </span>
                  </div>

                  <div className="room-msg-row">
                    {typingUser ? (
                      <span className="room-last-msg typing">
                        {room.isGroup ? `${typingUser.username} is typing...` : 'typing...'}
                      </span>
                    ) : (
                      <span className="room-last-msg">
                        {room.lastMessage ? (
                          <>
                            {room.isGroup && (
                              <span style={{ fontWeight: 500 }}>
                                {room.lastMessage.sender.username === currentUser.username 
                                  ? 'You' 
                                  : room.lastMessage.sender.username}:{' '}
                              </span>
                            )}
                            {room.lastMessage.content}
                          </>
                        ) : (
                          'No messages yet'
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start DM Sliding Drawer */}
      <div className={`sidebar-drawer ${showUserDrawer ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-header-top">
            <button className="icon-btn" style={{ color: 'white' }} onClick={() => { setShowUserDrawer(false); setDrawerSearch(''); }}>
              <ArrowLeft size={24} />
            </button>
            <span>New Chat</span>
          </div>
        </div>

        <div className="sidebar-search-container">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Search users"
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="drawer-body">
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              No other users online/registered
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                className="drawer-item"
                onClick={() => handleStartDM(user._id)}
              >
                <div className="avatar-wrapper">
                  <img className="avatar-img" src={user.avatar} alt={user.username} />
                  <span className={`status-dot ${user.status === 'online' ? '' : 'offline'}`}></span>
                </div>
                <div className="drawer-item-info">
                  <span className="drawer-item-title">{user.username}</span>
                  <span className="drawer-item-sub">
                    {user.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
