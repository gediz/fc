import { writable, derived } from 'svelte/store';

// ─── Connection state ────────────────────────────────────────

export const connected = writable(false);
export const ws = writable(null);

const WS_URL = location.protocol === 'https:'
  ? `wss://${location.host}/ws`
  : `ws://${location.host}/ws`;

let _ws = null;
let _reconnectTimer = null;

export function connect() {
  if (_ws && _ws.readyState <= 1) return;
  _ws = new WebSocket(WS_URL);

  _ws.onopen = () => {
    connected.set(true);
    ws.set(_ws);
  };

  _ws.onclose = () => {
    connected.set(false);
    ws.set(null);
    _ws = null;
    _reconnectTimer = setTimeout(connect, 3000);
  };

  _ws.onerror = () => {};

  _ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleMessage(msg);
    } catch {}
  };
}

export function send(msg) {
  if (_ws?.readyState === 1) {
    _ws.send(JSON.stringify(msg));
  }
}

// ─── Message handler (imported by game store) ────────────────

let _messageHandler = null;
export function setMessageHandler(fn) { _messageHandler = fn; }

function handleMessage(msg) {
  if (_messageHandler) _messageHandler(msg);
}
