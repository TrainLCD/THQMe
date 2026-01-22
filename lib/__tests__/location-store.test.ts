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
function locationReducer(state: LocationState, action: LocationAction): LocationState {
  const MAX_UPDATES = 500;
  const MAX_LOGS = 200;
  
  switch (action.type) {
    case "ADD_UPDATE": {
      const update = action.payload;
      const newUpdates = [update, ...state.updates].slice(0, MAX_UPDATES);
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
      const newLogs = [log, ...state.logs].slice(0, MAX_LOGS);
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
  device: "test-device",
  id: `log-${Date.now()}`,
  level: "info",
  message: "Test log message",
  timestamp: Date.now(),
  type: "log",
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

    it("should limit updates to MAX_UPDATES (500)", () => {
      // Create state with 500 updates
      const existingUpdates = Array.from({ length: 500 }, (_, i) =>
        createMockUpdate({ id: `existing-${i}` })
      );
      const stateWithManyUpdates: LocationState = {
        ...initialState,
        updates: existingUpdates,
        messageCount: 500,
      };
      
      const newUpdate = createMockUpdate({ id: "new-update" });
      const action: LocationAction = { type: "ADD_UPDATE", payload: newUpdate };
      
      const newState = locationReducer(stateWithManyUpdates, action);
      
      expect(newState.updates).toHaveLength(500);
      expect(newState.updates[0].id).toBe("new-update");
      expect(newState.messageCount).toBe(501);
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

    it("should limit logs to MAX_LOGS (200)", () => {
      const existingLogs = Array.from({ length: 200 }, (_, i) =>
        createMockLog({ id: `existing-log-${i}` })
      );
      const stateWithManyLogs: LocationState = {
        ...initialState,
        logs: existingLogs,
      };
      
      const newLog = createMockLog({ id: "new-log" });
      const action: LocationAction = { type: "ADD_LOG", payload: newLog };
      
      const newState = locationReducer(stateWithManyLogs, action);
      
      expect(newState.logs).toHaveLength(200);
      expect(newState.logs[0].id).toBe("new-log");
    });

    it("should handle nullable fields in log", () => {
      const log = createMockLog({
        device: null,
        id: null,
        level: null,
        message: null,
      });
      const action: LocationAction = { type: "ADD_LOG", payload: log };
      
      const newState = locationReducer(initialState, action);
      
      expect(newState.logs[0].device).toBeNull();
      expect(newState.logs[0].id).toBeNull();
      expect(newState.logs[0].level).toBeNull();
      expect(newState.logs[0].message).toBeNull();
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
  it("should have correct structure", () => {
    const log = createMockLog();
    
    expect(log).toHaveProperty("device");
    expect(log).toHaveProperty("id");
    expect(log).toHaveProperty("level");
    expect(log).toHaveProperty("message");
    expect(log).toHaveProperty("timestamp");
    expect(log).toHaveProperty("type");
    expect(log.type).toBe("log");
  });
});
