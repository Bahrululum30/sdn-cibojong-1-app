import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign development WebSocket and Vite HMR connection errors in the sandbox environment
if (typeof window !== 'undefined') {
  // Gracefully shadow the native WebSocket constructor to prevent unhandled connection/close error alerts or promise rejections
  const NativeWebSocket = window.WebSocket;
  if (NativeWebSocket) {
    try {
      const SafeWebSocket = function (this: any, url: string | URL, protocols?: string | string[]) {
        let ws: WebSocket;
        if (protocols) {
          ws = new NativeWebSocket(url, protocols);
        } else {
          ws = new NativeWebSocket(url);
        }
        
        // Register a passive listener to safely intercept connect/close exceptions
        ws.addEventListener('error', () => {
          // Swallow silently to prevent uncaught runtime overlay screens
        });
        return ws;
      };
      
      SafeWebSocket.prototype = NativeWebSocket.prototype;
      
      // Inherit all static variables and states from standard WebSocket class
      const keys = Object.getOwnPropertyNames(NativeWebSocket);
      keys.forEach(key => {
        if (!(key in SafeWebSocket)) {
          Object.defineProperty(SafeWebSocket, key, {
            get: () => (NativeWebSocket as any)[key],
            configurable: true
          });
        }
      });
      
      window.WebSocket = SafeWebSocket as any;
    } catch (e) {
      // Passive fallback
    }
  }

  const handleBenignError = (msg: string) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes('websocket') || 
           lower.includes('vite') || 
           lower.includes('hmr') || 
           lower.includes('closed without opened') || 
           lower.includes('connection');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let msg = '';
    let stack = '';
    
    if (reason) {
      if (typeof reason === 'string') {
        msg = reason;
      } else {
        msg = reason.message || '';
        stack = reason.stack || '';
        try {
          if (!msg && typeof reason.toString === 'function') {
            msg = reason.toString();
          }
        } catch (e) {}
      }
    }
    
    if (handleBenignError(msg) || handleBenignError(stack) || handleBenignError(JSON.stringify(reason))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (handleBenignError(msg)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
