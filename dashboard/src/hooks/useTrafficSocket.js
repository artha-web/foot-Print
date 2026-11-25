import { useEffect, useRef, useState } from 'react';

export function useTrafficSocket(wsUrl, { onVisitorActivity, onBotBlocked }) {
  const [status, setStatus] = useState('connecting');
  const callbacksRef = useRef({ onVisitorActivity, onBotBlocked });

  useEffect(() => {
    callbacksRef.current = { onVisitorActivity, onBotBlocked };
  }, [onVisitorActivity, onBotBlocked]);

  useEffect(() => {
    let socket = null;
    let reconnectTimer = null;
    let disposed = false;

    function connect() {
      if (disposed) return;
      setStatus('connecting');
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!disposed) setStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'visitor_activity' && callbacksRef.current.onVisitorActivity) {
            callbacksRef.current.onVisitorActivity(msg.payload);
          } else if (msg.type === 'bot_blocked' && callbacksRef.current.onBotBlocked) {
            callbacksRef.current.onBotBlocked(msg.payload);
          }
        } catch {
          // Ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setStatus('disconnected');
        reconnectTimer = setTimeout(connect, 2500);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [wsUrl]);

  return status;
}
