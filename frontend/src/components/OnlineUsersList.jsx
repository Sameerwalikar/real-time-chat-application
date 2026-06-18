import { X, MessageSquare, ShieldAlert } from 'lucide-react';

export default function OnlineUsersList({
  currentUser,
  activeRoom,
  onClose,
  onStartDM, // callback to start direct message with selected participant
  isOpen,
}) {
  if (!activeRoom || !isOpen) return null;

  const isGroup = activeRoom.isGroup;

  const handleCopyCode = async () => {
    const code = activeRoom.joinCode || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      // small feedback could be added
    } catch (err) {
      console.error('Copy failed', err);
    }
  };
  
  // Resolve meta data
  let title = 'Chat Info';
  let avatar = activeRoom.avatar;
  let name = activeRoom.name;

  if (!isGroup) {
    const recipient = activeRoom.participants.find((p) => p._id !== currentUser._id);
    if (recipient) {
      name = recipient.username;
      avatar = recipient.avatar;
      title = 'Contact Info';
    } else {
      name = 'Saved Messages';
      avatar = currentUser.avatar;
      title = 'Personal Space';
    }
  } else {
    title = 'Group Info';
  }

  const handleParticipantClick = (user) => {
    if (user._id === currentUser._id) return;
    if (onStartDM) {
      onStartDM(user._id);
    }
  };

  const formatLastSeen = (isoString) => {
    if (!isoString) return 'Offline';
    const date = new Date(isoString);
    return `Last seen ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className={`room-info-drawer ${isOpen ? 'open' : ''}`}>
      {/* Drawer Header */}
      <header className="info-drawer-header">
        <button className="icon-btn" onClick={onClose}>
          <X size={20} />
        </button>
        <span className="info-drawer-title">{title}</span>
      </header>

      {/* Drawer Content */}
      <div className="info-drawer-body">
        {/* Large Profile Visual */}
        <div className="info-profile-section">
          <img className="info-avatar-large" src={avatar} alt={name} />
          <h2 className="info-name-large">{name}</h2>
          {!isGroup && activeRoom.participants.find((p) => p._id !== currentUser._id) && (
            <p className="info-status-text">
              {activeRoom.participants.find((p) => p._id !== currentUser._id).status === 'online'
                ? 'Online'
                : 'Offline'}
            </p>
          )}

          {/* Show join code only to the group creator */}
          {isGroup && activeRoom.isCreator && activeRoom.joinCode && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'rgba(0,0,0,0.06)', padding: '6px 10px', borderRadius: 8, fontWeight: 700 }}>
                Code: {activeRoom.joinCode}
              </div>
              <button className="icon-btn" title="Copy Code" onClick={handleCopyCode}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 21H8a2 2 0 0 1-2-2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Group Participants Section */}
        {isGroup && (
          <div className="info-participants-section">
            <h4 className="info-section-title">
              {activeRoom.participants?.length || 0} Participants
            </h4>
            
            <div className="info-participants-list">
              {activeRoom.participants?.map((user) => {
                const isSelf = user._id === currentUser._id;
                const isOnline = user.status === 'online';

                return (
                  <div key={user._id} className="info-participant-item">
                    <div className="avatar-wrapper">
                      <img className="avatar-img" src={user.avatar} alt={user.username} />
                      <span className={`status-dot ${isOnline ? '' : 'offline'}`}></span>
                    </div>

                    <div className="participant-item-details">
                      <span className="participant-item-name">
                        {user.username} {isSelf && '(You)'}
                      </span>
                      <span className="participant-item-sub">
                        {isOnline ? 'online' : 'offline'}
                      </span>
                    </div>

                    {!isSelf && (
                      <button
                        className="icon-btn participant-msg-btn"
                        title="Direct Message"
                        onClick={() => handleParticipantClick(user)}
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Details / About */}
        {!isGroup && (
          <div className="info-about-section">
            <h4 className="info-section-title">About and Status</h4>
            <div className="info-about-box">
              {activeRoom.participants.find((p) => p._id !== currentUser._id) ? (
                <>
                  <p className="about-text">Hey there! I am using WhatsApp.</p>
                  <p className="about-date">
                    {formatLastSeen(activeRoom.participants.find((p) => p._id !== currentUser._id).lastSeen)}
                  </p>
                </>
              ) : (
                <p className="about-text">This is your personal folder for storing notes, ideas, or links.</p>
              )}
            </div>
          </div>
        )}

        {/* Encryption alert like real WhatsApp */}
        <div className="info-security-card">
          <ShieldAlert size={20} className="security-icon" />
          <div className="security-details">
            <h5>Encryption</h5>
            <p>Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
