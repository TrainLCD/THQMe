import { useCallback, useEffect, useRef, useState } from "react";

export interface UseWebSocketOptions {
  url: string | undefined;
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onClose?: (ev?: CloseEvent) => void;
  onError?: (error: unknown) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: any) => void;
  disconnect: () => void;
  connect: () => void;
}

export const useWebSocket = (
  options: UseWebSocketOptions
): UseWebSocketReturn => {
  const {
    url,
    onOpen,
    onMessage,
    onClose,
    onError,
    autoReconnect = false,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const manuallyClosedRef = useRef<boolean>(false);
  // 最新のコールバックを保持
  const onOpenRef = useRef<typeof onOpen>(onOpen);
  const onMessageRef = useRef<typeof onMessage>(onMessage);
  const onCloseRef = useRef<typeof onClose>(onClose);
  const onErrorRef = useRef<typeof onError>(onError);
  useEffect(() => void (onOpenRef.current = onOpen), [onOpen]);
  useEffect(() => void (onMessageRef.current = onMessage), [onMessage]);
  useEffect(() => void (onCloseRef.current = onClose), [onClose]);
  useEffect(() => void (onErrorRef.current = onError), [onError]);

  const connect = useCallback(() => {
    if (!url) {
      return;
    }

    // 残存再接続タイマーを掃除
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 手動切断状態を解除
    manuallyClosedRef.current = false;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        const raw = event.data as unknown;

        if (typeof raw === "string") {
          try {
            onMessageRef.current?.(JSON.parse(raw));
            return;
          } catch (error) {
            console.error("WebSocket message parsing error:", error);
          }
        }
        onMessageRef.current?.(raw);
      };

      ws.onclose = (ev) => {
        // 旧インスタンス由来の close は無視し、幽霊再接続を防ぐ
        if (wsRef.current && wsRef.current !== ws) {
          return;
        }
        setIsConnected(false);
        wsRef.current = null;
        onCloseRef.current?.(ev as CloseEvent);

        if (autoReconnect && !manuallyClosedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            // 実行済みタイマーを解放
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        onErrorRef.current?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      onErrorRef.current?.(error as unknown as Event);
      if (autoReconnect && !manuallyClosedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, reconnectInterval);
      }
    }
  }, [url, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    // 以降の onclose による自動再接続を抑止
    manuallyClosedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        wsRef.current.send(message);
      } catch (e) {
        console.error("WebSocket send failed:", e);
        onErrorRef.current?.(e as unknown as Event);
      }
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    disconnect,
    connect,
  };
};
