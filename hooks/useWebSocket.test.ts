/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useWebSocket } from "./useWebSocket";

// WebSocketのモック
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  sentData: any[] = [];
  closeCalled = false;

  constructor(url: string, protocols?: string | string[]) {
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(new Event("open")));
  }
  send(data: any) {
    this.sentData.push(data);
  }
  close() {
    this.closeCalled = true;
    setTimeout(() => this.onclose?.({} as CloseEvent));
  }
}

global.WebSocket = MockWebSocket as any;

describe("useWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  it("should connect and update status", async () => {
    const { result } = renderHook(() => useWebSocket("ws://test"));
    await waitFor(() => {
      expect(result.current.status).toBe("connecting");
    });
    await waitFor(() => {
      expect(result.current.status).toBe("open");
    });
  });

  it("should send data", async () => {
    const { result } = renderHook(() => useWebSocket("ws://test"));
    act(() => {
      result.current.send("hello");
    });
    expect(MockWebSocket.instances[0].sentData).toContain("hello");
  });

  it("should close connection", async () => {
    const { result } = renderHook(() => useWebSocket("ws://test"));
    act(() => {
      result.current.close();
    });
    expect(MockWebSocket.instances[0].closeCalled).toBe(true);
  });

  it("should handle onMessage", async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket("ws://test", { onMessage })
    );
    act(() => {
      MockWebSocket.instances[0].onmessage?.({ data: "msg" } as MessageEvent);
    });
    expect(result.current.lastMessage?.data).toBe("msg");
    expect(onMessage).toHaveBeenCalled();
  });

  it("should retry on error/close", async () => {
    jest.useFakeTimers();
    renderHook(() => useWebSocket("ws://test"));
    act(() => {
      MockWebSocket.instances[0].onclose?.({} as CloseEvent);
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    jest.useRealTimers();
  });
});
