/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useWebSocket } from "./useWebSocket";

// WebSocketのモック
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  sentData: any[] = [];
  closeCalled = false;
  url: string;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // 非同期で接続完了をシミュレート
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }, 10);
  }

  send(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      this.sentData.push(data);
    }
  }

  close() {
    this.closeCalled = true;
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => this.onclose?.(new CloseEvent("close")), 10);
  }

  // テスト用のヘルパーメソッド
  simulateMessage(data: any) {
    const messageEvent = new MessageEvent("message", { data });
    this.onmessage?.(messageEvent);
  }

  simulateError() {
    this.onerror?.(new Event("error"));
  }
}

// グローバルのWebSocketを置き換え
global.WebSocket = MockWebSocket as any;

describe("useWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should connect and update connection status", async () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://test",
        onOpen,
      })
    );

    // 初期状態では接続されていない
    expect(result.current.isConnected).toBe(false);

    // 接続完了を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(onOpen).toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("should send data when connected", async () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));

    // 接続完了を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // データ送信
    act(() => {
      result.current.send("hello");
    });

    expect(MockWebSocket.instances[0].sentData).toContain("hello");
  });

  it("should send JSON data", async () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testData = { type: "test", message: "hello" };

    act(() => {
      result.current.send(testData);
    });

    expect(MockWebSocket.instances[0].sentData).toContain(
      JSON.stringify(testData)
    );
  });

  it("should disconnect properly", async () => {
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://test",
        onClose,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    expect(MockWebSocket.instances[0].closeCalled).toBe(true);

    // onCloseコールバックの呼び出しを待つ
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it("should handle incoming messages", async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://test",
        onMessage,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testMessage = "test message";
    act(() => {
      MockWebSocket.instances[0].simulateMessage(testMessage);
    });

    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it("should parse JSON messages", async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://test",
        onMessage,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testData = { type: "response", data: "test" };
    act(() => {
      MockWebSocket.instances[0].simulateMessage(JSON.stringify(testData));
    });

    expect(onMessage).toHaveBeenCalledWith(testData);
  });

  it("should handle errors", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://test",
        onError,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      MockWebSocket.instances[0].simulateError();
    });

    expect(onError).toHaveBeenCalled();
  });

  it("should auto-reconnect when enabled", async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://test",
        autoReconnect: true,
        reconnectInterval: 1000,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // 接続を閉じる
    act(() => {
      MockWebSocket.instances[0].close();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    // 再接続タイマーを進める
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // 新しいWebSocketインスタンスが作成される
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });

  it("should not send data when disconnected", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));

    // 接続前にデータを送信しようとする
    act(() => {
      result.current.send("hello");
    });

    expect(consoleSpy).toHaveBeenCalledWith("WebSocket is not connected");

    consoleSpy.mockRestore();
  });

  it("should reconnect manually", async () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // 切断
    act(() => {
      result.current.disconnect();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    // 手動で再接続
    act(() => {
      result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });
});
