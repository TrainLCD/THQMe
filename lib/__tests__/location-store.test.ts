import { describe, it, expect } from "vitest";
import type {
  LocationUpdate,
  LocationState,
  LocationAction,
  LogData,
  MovingState,
  ConnectionStatus,
} from "../types/location";

// Reducer logic extracted for testing
const MAX_UPDATES_PER_DEVICE = 500;
const MAX_LOGS_PER_DEVICE = 500;

function enforcePerDeviceLimit<T extends { device: string }>(
  items: T[],
  maxPerDevice: number
): T[] {
  const countByDevice = new Map<string, number>();
  return items.filter((item) => {
    const count = countByDevice.get(item.device) ?? 0;
    if (count >= maxPerDevice) return false;
    countByDevice.set(item.device, count + 1);
    return true;
  });
}

function locationReducer(state: LocationState, action: LocationAction): LocationState {
  switch (action.type) {
    case "ADD_UPDATE": {
      const update = action.payload;
      const newUpdates = enforcePerDeviceLimit(
        [update, ...state.updates],
        MAX_UPDATES_PER_DEVICE
      );
      const deviceIds = Array.from(
        new Set([update.device, ...state.deviceIds])
      );
      return {
        ...state,
        updates: newUpdates,
        messageCount: state.messageCount + 1,
        deviceIds,
      };
    }
    case "ADD_LOG": {
      const log = action.payload;
      const newLogs = enforcePerDeviceLimit(
        [log, ...state.logs],
        MAX_LOGS_PER_DEVICE
      );
      return {
        ...state,
        logs: newLogs,
      };
    }
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };
    case "SET_WS_URL":
      return { ...state, wsUrl: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_UPDATES":
      return { ...state, updates: [], logs: [], messageCount: 0, deviceIds: [] };
    case "LOAD_INITIAL_STATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const initialState: LocationState = {
  updates: [],
  logs: [],
  connectionStatus: "disconnected",
  wsUrl: "",
  error: null,
  messageCount: 0,
  deviceIds: [],
};

const createMockUpdate = (overrides: Partial<LocationUpdate> = {}): LocationUpdate => ({
  coords: {
    accuracy: 10,
    latitude: 35.6812,
    longitude: 139.7671,
    speed: 5.5,
  },
  device: "test-device",
  id: `update-${Date.now()}`,
  state: "moving" as MovingState,
  timestamp: Date.now(),
  type: "location_update",
  ...overrides,
});

const createMockLog = (overrides: Partial<LogData> = {}): LogData => ({
  type: "log",
  id: `log-${Date.now()}`,
  device: "test-device",
  timestamp: Date.now(),
  log: {
    type: "app",
    level: "info",
    message: "Test log message",
  },
  ...overrides,
});

describe("Location Store Reducer", () => {
  describe("ADD_UPDATE", () => {
    it("should add a new location update to the beginning of the list", () => {
      const update = createMockUpdate({ id: "update-1" });
      const action: LocationAction = { type: "ADD_UPDATE", payload: update };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.updates).toHaveLength(1);
      expect(newState.updates[0]).toEqual(update);
      expect(newState.messageCount).toBe(1);
    });

    it("should add device to deviceIds list", () => {
      const update = createMockUpdate({ device: "device-a" });
      const action: LocationAction = { type: "ADD_UPDATE", payload: update };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.deviceIds).toContain("device-a");
    });

    it("should not duplicate device in deviceIds", () => {
      const stateWithDevice: LocationState = {
        ...initialState,
        deviceIds: ["device-a"],
      };
      const update = createMockUpdate({ device: "device-a" });
      const action: LocationAction = { type: "ADD_UPDATE", payload: update };
      
      const newState = locationReducer(stateWithDevice, action);
      
      expect(newState.deviceIds.filter(d => d === "device-a")).toHaveLength(1);
    });

    it("should limit updates to 500 per device", () => {
      // Create state with 500 updates from one device
      const existingUpdates = Array.from({ length: 500 }, (_, i) =>
        createMockUpdate({ id: `existing-${i}`, device: "device-a" })
      );
      const stateWithManyUpdates: LocationState = {
        ...initialState,
        updates: existingUpdates,
        messageCount: 500,
      };

      const newUpdate = createMockUpdate({ id: "new-update", device: "device-a" });
      const action: LocationAction = { type: "ADD_UPDATE", payload: newUpdate };

      const newState = locationReducer(stateWithManyUpdates, action);

      expect(newState.updates).toHaveLength(500);
      expect(newState.updates[0].id).toBe("new-update");
      expect(newState.messageCount).toBe(501);
    });

    it("should allow 500 updates per device independently", () => {
      // Create state with 500 updates from device-a
      const deviceAUpdates = Array.from({ length: 500 }, (_, i) =>
        createMockUpdate({ id: `a-${i}`, device: "device-a" })
      );
      const stateWithDeviceA: LocationState = {
        ...initialState,
        updates: deviceAUpdates,
        messageCount: 500,
        deviceIds: ["device-a"],
      };

      // Adding an update from device-b should not evict device-a's entries
      const newUpdate = createMockUpdate({ id: "b-0", device: "device-b" });
      const action: LocationAction = { type: "ADD_UPDATE", payload: newUpdate };

      const newState = locationReducer(stateWithDeviceA, action);

      expect(newState.updates).toHaveLength(501);
      const deviceACounts = newState.updates.filter(u => u.device === "device-a").length;
      const deviceBCounts = newState.updates.filter(u => u.device === "device-b").length;
      expect(deviceACounts).toBe(500);
      expect(deviceBCounts).toBe(1);
    });
  });

  describe("ADD_LOG", () => {
    it("should add a new log to the beginning of the list", () => {
      const log = createMockLog({ id: "log-1" });
      const action: LocationAction = { type: "ADD_LOG", payload: log };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.logs).toHaveLength(1);
      expect(newState.logs[0]).toEqual(log);
    });

    it("should limit logs to 500 per device", () => {
      const existingLogs = Array.from({ length: 500 }, (_, i) =>
        createMockLog({ id: `existing-log-${i}`, device: "device-a" })
      );
      const stateWithManyLogs: LocationState = {
        ...initialState,
        logs: existingLogs,
      };

      const newLog = createMockLog({ id: "new-log", device: "device-a" });
      const action: LocationAction = { type: "ADD_LOG", payload: newLog };

      const newState = locationReducer(stateWithManyLogs, action);

      expect(newState.logs).toHaveLength(500);
      expect(newState.logs[0].id).toBe("new-log");
    });

    it("should allow 500 logs per device independently", () => {
      const deviceALogs = Array.from({ length: 500 }, (_, i) =>
        createMockLog({ id: `a-log-${i}`, device: "device-a" })
      );
      const stateWithDeviceA: LocationState = {
        ...initialState,
        logs: deviceALogs,
      };

      // Adding a log from device-b should not evict device-a's logs
      const newLog = createMockLog({ id: "b-log-0", device: "device-b" });
      const action: LocationAction = { type: "ADD_LOG", payload: newLog };

      const newState = locationReducer(stateWithDeviceA, action);

      expect(newState.logs).toHaveLength(501);
      const deviceACount = newState.logs.filter(l => l.device === "device-a").length;
      const deviceBCount = newState.logs.filter(l => l.device === "device-b").length;
      expect(deviceACount).toBe(500);
      expect(deviceBCount).toBe(1);
    });

    it("should handle nested log object with level and message", () => {
      const log = createMockLog({
        log: {
          type: "system",
          level: "error",
          message: "Connection failed",
        },
      });
      const action: LocationAction = { type: "ADD_LOG", payload: log };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.logs[0].log.level).toBe("error");
      expect(newState.logs[0].log.message).toBe("Connection failed");
      expect(newState.logs[0].log.type).toBe("system");
    });
  });

  describe("SET_CONNECTION_STATUS", () => {
    it("should update connection status", () => {
      const statuses: ConnectionStatus[] = ["connecting", "connected", "disconnected", "error"];
      
      statuses.forEach((status) => {
        const action: LocationAction = { type: "SET_CONNECTION_STATUS", payload: status };
        const newState = locationReducer(initialState, action);
        expect(newState.connectionStatus).toBe(status);
      });
    });
  });

  describe("SET_WS_URL", () => {
    it("should update WebSocket URL", () => {
      const url = "ws://example.com/location";
      const action: LocationAction = { type: "SET_WS_URL", payload: url };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.wsUrl).toBe(url);
    });
  });

  describe("SET_ERROR", () => {
    it("should set error message", () => {
      const error = "Connection failed";
      const action: LocationAction = { type: "SET_ERROR", payload: error };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.error).toBe(error);
    });

    it("should clear error when set to null", () => {
      const stateWithError: LocationState = {
        ...initialState,
        error: "Some error",
      };
      const action: LocationAction = { type: "SET_ERROR", payload: null };
      
      const newState = locationReducer(stateWithError, action);
      
      expect(newState.error).toBeNull();
    });
  });

  describe("CLEAR_UPDATES", () => {
    it("should clear all updates, logs and reset counters", () => {
      const stateWithData: LocationState = {
        ...initialState,
        updates: [createMockUpdate(), createMockUpdate()],
        logs: [createMockLog(), createMockLog()],
        messageCount: 100,
        deviceIds: ["device-a", "device-b"],
      };
      const action: LocationAction = { type: "CLEAR_UPDATES" };
      
      const newState = locationReducer(stateWithData, action);
      
      expect(newState.updates).toHaveLength(0);
      expect(newState.logs).toHaveLength(0);
      expect(newState.messageCount).toBe(0);
      expect(newState.deviceIds).toHaveLength(0);
    });
  });

  describe("LOAD_INITIAL_STATE", () => {
    it("should merge partial state", () => {
      const action: LocationAction = {
        type: "LOAD_INITIAL_STATE",
        payload: { wsUrl: "ws://saved-url.com" },
      };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.wsUrl).toBe("ws://saved-url.com");
      expect(newState.connectionStatus).toBe("disconnected");
    });
  });
});

describe("LocationUpdate type validation", () => {
  it("should have correct structure", () => {
    const update = createMockUpdate();
    
    expect(update).toHaveProperty("coords");
    expect(update).toHaveProperty("device");
    expect(update).toHaveProperty("id");
    expect(update).toHaveProperty("state");
    expect(update).toHaveProperty("timestamp");
    expect(update).toHaveProperty("type");
    expect(update.type).toBe("location_update");
  });

  it("should handle nullable coords fields", () => {
    const update = createMockUpdate({
      coords: {
        accuracy: null,
        latitude: 35.6812,
        longitude: 139.7671,
        speed: undefined,
      },
    });
    
    expect(update.coords.accuracy).toBeNull();
    expect(update.coords.speed).toBeUndefined();
  });

  it("should handle speed value of -1", () => {
    const update = createMockUpdate({
      coords: {
        accuracy: 10,
        latitude: 35.6812,
        longitude: 139.7671,
        speed: -1,
      },
    });
    
    expect(update.coords.speed).toBe(-1);
  });
});

describe("LogData type validation", () => {
  it("should have correct structure with nested log object", () => {
    const log = createMockLog();
    
    expect(log).toHaveProperty("type");
    expect(log).toHaveProperty("id");
    expect(log).toHaveProperty("device");
    expect(log).toHaveProperty("timestamp");
    expect(log).toHaveProperty("log");
    expect(log.type).toBe("log");
    expect(log.log).toHaveProperty("type");
    expect(log.log).toHaveProperty("level");
    expect(log.log).toHaveProperty("message");
  });
});
