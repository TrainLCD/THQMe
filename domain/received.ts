import { MovingState } from "./state";

export type ReceivedData = {
  id: string;
  lat: number;
  lon: number;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
  state: MovingState;
  device: string;
};
