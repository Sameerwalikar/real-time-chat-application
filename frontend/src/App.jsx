import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import OnlineUsersList from './components/OnlineUsersList';
import LandingPage from './components/LandingPage';
import { initSocket, disconnectSocket, getSocket } from './socket';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [loading, setLoading] = useState(true);

  // Modals & Panels State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [groupError, setGroupError] = useState('');

  // Socket-related real-time state
  // typingStates structure: { [roomId]: { [userId]: { isTyping: boolean, username: string, userId: string } } }
  const [typingStates, setTypingStates] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Apply Theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Restore User Auth Session on Mount
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          setCurrentUser(data.user);
          // Initialize Socket
          initSocket(token);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Session restore failed', err);
        // Keep offline token for convenience but set loading false
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
    return () => {
      disconnectSocket();
    };
  }, [token]);

  // Fetch Rooms List once authenticated
  useEffect(() => {
    if (!currentUser || !token) return;

    const fetchRooms = async () => {
      try {
        const response = await fetch(`${API_URL}/rooms`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setRooms(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch rooms list', err);
      }
    };

    fetchRooms();
  }, [currentUser, token, API_URL]);

  // Real-Time Socket Event Subscriptions
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentUser) return;

    // Listen to user status changes (online/offline)
    socket.on('userStatusChange', ({ userId, status, lastSeen }) => {
      // Update participant statuses inside all relevant rooms
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const updatedParticipants = room.participants.map((p) =>
            p._id === userId ? { ...p, status, lastSeen } : p
          );
          
          let updatedActiveRoom = activeRoom;
          if (activeRoom && activeRoom._id === room._id) {
            updatedActiveRoom = { ...activeRoom, participants: updatedParticipants };
          }
          
          return { ...room, participants: updatedParticipants };
        })
      );
      
      // Sync active room status
      setActiveRoom((prevActive) => {
        if (!prevActive) return null;
        const updatedParticipants = prevActive.participants.map((p) =>
          p._id === userId ? { ...p, status, lastSeen } : p
        );
        return { ...prevActive, participants: updatedParticipants };
      });
    });

    // Listen to room updates (triggers when a message is sent in any chat)
    socket.on('roomUpdate', (updatedRoom) => {
      setRooms((prevRooms) => {
        const index = prevRooms.findIndex((r) => r._id === updatedRoom._id);
        let newList = [...prevRooms];
        if (index !== -1) {
          newList[index] = updatedRoom;
        } else {
          newList.unshift(updatedRoom);
        }
        // Sort rooms by updated activity timestamp
        return newList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });

      // Update active room details if it's the current active room
      setActiveRoom((prevActive) => {
        if (prevActive && prevActive._id === updatedRoom._id) {
          return updatedRoom;
        }
        return prevActive;
      });
    });

    // Listen to active users in room (updates online counter & avatars)
    socket.on('onlineUsers', ({ roomId, users }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room._id === roomId) {
            // Update statuses of room participants based on active user list
            const updatedParticipants = room.participants.map((p) => {
              const activeMatch = users.find((u) => u._id === p._id);
              if (activeMatch) {
                return { ...p, status: 'online' };
              }
              return p;
            });
            return { ...room, participants: updatedParticipants };
          }
          return room;
        })
      );

      // Keep active room in sync
      setActiveRoom((prevActive) => {
        if (prevActive && prevActive._id === roomId) {
          const updatedParticipants = prevActive.participants.map((p) => {
            const activeMatch = users.find((u) => u._id === p._id);
            if (activeMatch) {
              return { ...p, status: 'online' };
            }
            return p;
          });
          return { ...prevActive, participants: updatedParticipants };
        }
        return prevActive;
      });
    });

    // Listen to typing status broadcasts
    socket.on('typing', ({ roomId, userId, username, isTyping }) => {
      setTypingStates((prev) => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] || {}),
          [userId]: { isTyping, username, userId },
        },
      }));
    });

    return () => {
      socket.off('userStatusChange');
      socket.off('roomUpdate');
      socket.off('onlineUsers');
      socket.off('typing');
    };
  }, [currentUser, activeRoom]);

  const handleAuthSuccess = (user, token) => {
    localStorage.setItem('token', token);
    setToken(token);
    setCurrentUser(user);
    initSocket(token);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      disconnectSocket();
      localStorage.removeItem('token');
      setToken(null);
      setCurrentUser(null);
      setRooms([]);
      setActiveRoom(null);
      setShowRightDrawer(false);
    }
  };

  // Create a Group Room Handler
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setGroupError('');

    if (!newGroupName.trim()) {
      setGroupError('Group name is required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/rooms/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        // Prepend and select the new room
        setRooms((prev) => [data.data, ...prev]);
        handleRoomSelect(data.data);
        setShowCreateGroup(false);
        setNewGroupName('');
      } else {
        setGroupError(data.message || 'Failed to create group');
      }
    } catch (err) {
      setGroupError('Network error creating group');
      console.error(err);
    }
  };

  // Join-By-Code Modal State & Handler
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleOpenJoinModal = () => {
    setJoinError('');
    setJoinCodeInput('');
    setShowJoinModal(true);
  };

  const handleJoinByCode = async (code) => {
    setJoinError('');
    const joinCode = (code || joinCodeInput || '').toString().trim();
    if (!/^[0-9]{6}$/.test(joinCode)) {
      setJoinError('Please enter a valid 6-digit code');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: joinCode }),
      });

      const data = await response.json();
      if (data.success) {
        const room = data.data;
        // Add or update rooms list and select
        setRooms((prev) => {
          const exists = prev.find((r) => r._id === room._id);
          if (exists) {
            return prev.map((r) => (r._id === room._id ? room : r));
          }
          return [room, ...prev];
        });

        setActiveRoom(room);
        setShowJoinModal(false);
        setJoinCodeInput('');

        // join socket room
        const socket = getSocket();
        if (socket) socket.emit('joinRoom', { roomId: room._id });
      } else {
        setJoinError(data.message || 'Failed to join group');
      }
    } catch (err) {
      console.error('Join by code failed', err);
      setJoinError('Network error while joining');
    }
  };

  // Join Room via Sockets on Switch
  const handleRoomSelect = (room) => {
    setActiveRoom(room);
    setShowRightDrawer(false); // Close panel on change

    const socket = getSocket();
    if (socket) {
      socket.emit('joinRoom', { roomId: room._id });
    }
  };

  // Start direct messages inside drawers
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
        // Select direct chat and join room
        const room = data.data;
        
        // Add to rooms list state if not already there
        setRooms((prev) => {
          if (prev.some((r) => r._id === room._id)) return prev;
          return [room, ...prev];
        });

        handleRoomSelect(room);
      }
    } catch (err) {
      console.error('Failed to get/create direct message', err);
    }
  };

  const chatShell = (
    <div className="app-container">
      <div className="app-wrapper">
        {/* Left Side: Navigation Sidebar */}
        <Sidebar
          currentUser={currentUser}
          rooms={rooms}
          activeRoom={activeRoom}
          onRoomSelect={handleRoomSelect}
          onCreateGroupClick={() => setShowCreateGroup(true)}
          onLogout={handleLogout}
          onOpenJoinModal={handleOpenJoinModal}
          theme={theme}
          setTheme={setTheme}
          typingStates={typingStates}
        />

        {/* Right Side: Chat Container */}
        <ChatArea
          currentUser={currentUser}
          activeRoom={activeRoom}
          typingStates={typingStates}
          onRoomInfoClick={() => setShowRightDrawer(!showRightDrawer)}
          onBackClick={() => setActiveRoom(null)}
          onOpenJoinModal={handleOpenJoinModal}
          onJoinByCode={handleJoinByCode}
        />

        {/* Dynamic sliding drawer for Chat Info & Participants */}
        <OnlineUsersList
          currentUser={currentUser}
          activeRoom={activeRoom}
          isOpen={showRightDrawer}
          onClose={() => setShowRightDrawer(false)}
          onOpenJoinModal={handleOpenJoinModal}
          onJoinByCode={handleJoinByCode}
          onStartDM={handleStartDM}
        />

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Create Group Chat</h3>
              
              {groupError && (
                <div className="auth-error" style={{ marginBottom: '15px' }}>
                  {groupError}
                </div>
              )}

              <form onSubmit={handleCreateGroup}>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  required
                />
                
                <div className="modal-buttons">
                  <button
                    type="button"
                    className="modal-btn cancel"
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName('');
                      setGroupError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-btn confirm">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join Group Modal */}
        {showJoinModal && (
          <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Join Group by Code</h3>

              {joinError && (
                <div className="auth-error" style={{ marginBottom: '12px' }}>
                  {joinError}
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Enter 6-digit group code"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                />
              </div>

              <div className="modal-buttons">
                <button className="modal-btn cancel" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button className="modal-btn confirm" onClick={() => handleJoinByCode()}>
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Connecting to Session...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={currentUser ? <Navigate to="/app" replace /> : <Login onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/app" element={currentUser ? chatShell : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
