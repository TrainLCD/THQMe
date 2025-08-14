import { useCallback, useEffect, useRef, useState } from 'react';
// 自動リトライ設定
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_INTERVAL = 3000; // ms

export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

interface UseWebSocketOptions {
	onOpen?: (event: Event) => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
	onMessage?: (event: MessageEvent) => void;
	protocols?: string | string[];
}

export function useWebSocket(
	url: string,
	options: UseWebSocketOptions = {}
): {
	send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
	status: WebSocketStatus;
	lastMessage: MessageEvent | null;
	close: () => void;
} {
	const wsRef = useRef<WebSocket | null>(null);
	const [status, setStatus] = useState<WebSocketStatus>('connecting');
	const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

	const retryCountRef = useRef(0);
	const retryTimeoutRef = useRef<number | null>(null);

	const connect = useCallback(() => {
		const ws = new WebSocket(url, options.protocols);
		wsRef.current = ws;
		setStatus('connecting');

		ws.onopen = (event) => {
			setStatus('open');
			retryCountRef.current = 0;
			options.onOpen?.(event);
		};
		ws.onclose = (event) => {
			setStatus('closed');
			options.onClose?.(event);
			// 自動リトライ
			if (retryCountRef.current < DEFAULT_MAX_RETRIES) {
				retryCountRef.current += 1;
				retryTimeoutRef.current = window.setTimeout(() => {
					connect();
				}, DEFAULT_RETRY_INTERVAL);
			}
		};
		ws.onerror = (event) => {
			setStatus('error');
			options.onError?.(event);
			// 自動リトライ
			if (retryCountRef.current < DEFAULT_MAX_RETRIES) {
				retryCountRef.current += 1;
				retryTimeoutRef.current = window.setTimeout(() => {
					connect();
				}, DEFAULT_RETRY_INTERVAL);
			}
		};
		ws.onmessage = (event) => {
			setLastMessage(event);
			options.onMessage?.(event);
		};
	}, [url, options]);

			useEffect(() => {
				connect();
				return () => {
					setStatus('closing');
					wsRef.current?.close();
					if (retryTimeoutRef.current) {
						clearTimeout(retryTimeoutRef.current);
					}
					retryCountRef.current = 0;
				};
			}, [connect]);

	const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(data);
		}
	}, []);

	const close = useCallback(() => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.close();
		}
	}, []);

	return { send, status, lastMessage, close };
}
