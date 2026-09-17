import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { ref as dbRef, onChildAdded, limitToLast, query, push } from 'firebase/database';

const clamp = (val, min, max) => {
  if (min > max) return (min + max) / 2;
  return Math.max(min, Math.min(max, val));
};

export default function ChatBox({ roomId, isMinimized = false }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(!isMinimized);
  const [previewMessage, setPreviewMessage] = useState(null);
  const endRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const sessionStartTimeRef = useRef(Date.now());
  
  // Use a ref for open state to avoid resetting database listener subscription
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Dragging states (stores the top-left coordinate of the widget)
  const [position, setPosition] = useState(() => {
    const stored = localStorage.getItem('aa_chat_position_v2');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      } catch {}
    }
    // Default initial top-left of the button: bottom-right
    return {
      x: window.innerWidth - 72,
      y: window.innerHeight - 150
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      const limitX = open ? window.innerWidth - 330 : window.innerWidth - 66;
      const limitY = open ? window.innerHeight - 430 : window.innerHeight - 66;
      setPosition(prev => ({
        x: clamp(prev.x, 10, limitX),
        y: clamp(prev.y, 10, limitY)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  // Persist position coordinates
  useEffect(() => {
    localStorage.setItem('aa_chat_position_v2', JSON.stringify(position));
  }, [position]);

  // Scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  // Real-time chat messages listener
  useEffect(() => {
    if (!roomId) return;
    let unsub = () => {};
    try {
      if (db) {
        const chatRef = query(dbRef(db, `rooms/${roomId}/chat`), limitToLast(100));
        unsub = onChildAdded(chatRef, snap => {
          const msg = snap.val();
          if (msg) {
            setMessages(prev => [...prev.slice(-99), { ...msg, id: snap.key }]);
            
            // Only show preview bubble if:
            // 1. Chat window is minimized
            // 2. Message is not from the current user (typer)
            // 3. Message was sent after the session started (not historical)
            const isHistorical = msg.timestamp && msg.timestamp < sessionStartTimeRef.current - 2000;
            const isMe = msg.uid === user?.uid;
            
            if (!openRef.current && !isMe && !isHistorical) {
              setPreviewMessage(msg);
              if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
              previewTimeoutRef.current = setTimeout(() => {
                setPreviewMessage(null);
              }, 4000);
            }
          }
        });
      }
    } catch (err) {
      console.error('Error setting up chat database listener:', err);
    }
    return () => unsub();
  }, [roomId, user?.uid]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const msg = { uid: user.uid, name: user.displayName || 'Guest', text: input.trim(), timestamp: Date.now() };
    setInput('');
    try {
      if (db) {
        await push(dbRef(db, `rooms/${roomId}/chat`), msg);
      } else {
        setMessages(prev => [...prev, { ...msg, id: Date.now() }]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { ...msg, id: Date.now() }]);
    }
  };

  const onPointerDown = (e) => {
    if (open && e.target.closest('button')) {
      return;
    }
    e.target.setPointerCapture(e.pointerId);
    
    // Get current actual rendered position to prevent jumping on drag start
    const renderedX = open 
      ? clamp(position.x, 10, window.innerWidth - 330)
      : clamp(position.x, 10, window.innerWidth - 66);
    const renderedY = open
      ? clamp(position.y, 10, window.innerHeight - 430)
      : clamp(position.y, 10, window.innerHeight - 66);

    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: renderedX, y: renderedY };
    setIsDragging(true);
    hasMoved.current = false;
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved.current = true;
    }

    const nextX = startPos.current.x + dx;
    const nextY = startPos.current.y + dy;

    const limitX = open ? window.innerWidth - 330 : window.innerWidth - 66;
    const limitY = open ? window.innerHeight - 430 : window.innerHeight - 66;

    setPosition({
      x: clamp(nextX, 10, limitX),
      y: clamp(nextY, 10, limitY)
    });
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  if (!open) {
    const btnLeft = clamp(position.x, 10, window.innerWidth - 66);
    const btnTop = clamp(position.y, 10, window.innerHeight - 66);

    return (
      <>
        {/* Message preview popup for other users */}
        {previewMessage && (
          <div
            onClick={() => {
              setOpen(true);
              setPreviewMessage(null);
            }}
            style={{
              position: 'fixed',
              left: btnLeft > window.innerWidth / 2 ? btnLeft - 210 : btnLeft + 66,
              top: btnTop + 10,
              width: 200,
              background: 'rgba(10,10,15,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(20,209,255,0.4)',
              borderRadius: 12,
              padding: '8px 12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 15px rgba(20,209,255,0.15)',
              zIndex: 9998,
              cursor: 'pointer',
              animation: 'bubbleFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7b61ff', marginBottom: 2, textTransform: 'none' }}>
              {previewMessage.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#e0e8ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'none' }}>
              {previewMessage.text}
            </div>
            <style>{`
              @keyframes bubbleFadeIn {
                from { opacity: 0; transform: scale(0.9) translateX(${btnLeft > window.innerWidth / 2 ? '15px' : '-15px'}); }
                to { opacity: 1; transform: scale(1) translateX(0); }
              }
            `}</style>
          </div>
        )}

        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => {
            onPointerUp(e);
            if (!hasMoved.current) {
              setOpen(true);
              setPreviewMessage(null);
            }
          }}
          style={{
            position: 'fixed',
            left: btnLeft,
            top: btnTop,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7b61ff 0%, #14d1ff 100%)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(123,97,255,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            touchAction: 'none',
          }}
          title="Open Live Chat"
        >
          💬
        </button>
      </>
    );
  }

  const chatLeft = clamp(position.x, 10, window.innerWidth - 330);
  const chatTop = clamp(position.y, 10, window.innerHeight - 430);

  return (
    <div
      style={{
        position: 'fixed',
        left: chatLeft,
        top: chatTop,
        width: 320,
        maxWidth: 'calc(100vw - 20px)',
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(123,97,255,0.25)',
        borderRadius: 20,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 25px rgba(123,97,255,0.15)',
        display: 'flex',
        flexDirection: 'column',
        height: 420,
        maxHeight: 'calc(100vh - 20px)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'chatSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes chatSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      
      {/* Header (acts as drag handle) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: 'rgba(255,255,255,0.02)',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#14d1ff', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1rem' }}>💬</span> Live Chat
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.target.style.background = 'rgba(255,23,68,0.2)'; e.target.style.color = '#ff1744'; }}
            onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#aaa'; }}
            title="Minimize Chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          scrollbarWidth: 'none',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#666', fontSize: '0.78rem' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>💬</div>
            No messages yet. Send a message to start!
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.uid === user?.uid;
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: 6,
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  background: isMe ? 'rgba(20,209,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isMe ? 'rgba(20,209,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12,
                  padding: '8px 12px',
                  maxWidth: '80%',
                }}
              >
                {!isMe && <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#7b61ff', marginBottom: 2 }}>{m.name}</div>}
                <div
                  style={{
                    fontSize: '0.82rem',
                    wordBreak: 'break-word',
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontWeight: 400,
                    color: '#e0e8ff',
                  }}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          style={{
            padding: '8px 12px',
            fontSize: '0.82rem',
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            color: '#fff',
            outline: 'none',
            transition: 'border-color 0.25s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(20,209,255,0.4)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />
        <button
          onClick={send}
          style={{
            background: 'linear-gradient(135deg, #14d1ff 0%, #00e676 100%)',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#001c26',
            boxShadow: '0 4px 12px rgba(20,209,255,0.2)',
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => { e.target.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.target.style.transform = 'none'; }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
