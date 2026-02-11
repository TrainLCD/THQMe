# THQMe

A real-time location tracking and monitoring mobile app built with Expo and React Native. It connects to a WebSocket server to receive and display live location updates and logs from multiple devices.

## Features

- **Real-time WebSocket Connection** - Auto-connects with exponential backoff reconnection
- **Home Dashboard** - Connection status, device count, message stats, and last update time
- **Timeline View** - Chronological list of location updates with device and route filtering
- **Map View** - Interactive map with device trajectories, markers, and auto-follow mode (native only)
- **Log Viewer** - Real-time log display filterable by type, level, and device with text search
- **Dark Mode** - Full light/dark theme support

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React Native, Expo (~54), React 19, TypeScript |
| Styling | NativeWind (Tailwind CSS), React Native Reanimated |
| Navigation | Expo Router (file-based routing) |
| Server State | TanStack React Query, tRPC |
| Backend | Express, tRPC, Drizzle ORM, MySQL |
| Auth | OAuth, JWT (jose), expo-secure-store |

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 10.28.1
- Xcode (for iOS) or Android Studio (for Android)
- MySQL database server

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
pnpm db:push

# Start development (server + metro bundler)
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start server and Metro bundler concurrently |
| `pnpm dev:server` | Start the backend server with hot reload |
| `pnpm dev:metro` | Start the Expo Metro bundler |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android` | Run on Android emulator |
| `pnpm build` | Bundle server for production (esbuild) |
| `pnpm start` | Run production server |
| `pnpm check` | TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run tests (Vitest) |
| `pnpm db:push` | Generate and apply database migrations |

## Project Structure

```text
├── app/                  # Screens (Expo Router file-based routing)
│   ├── (tabs)/           # Tab navigation (Home, Timeline, Map, Logs)
│   ├── dev/              # Development routes
│   └── oauth/            # OAuth callback handling
├── components/           # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries and state management
│   ├── location-store.tsx  # Location state (Context + useReducer)
│   ├── trpc.ts           # tRPC client configuration
│   └── types/            # TypeScript type definitions
├── server/               # Backend (Express + tRPC)
│   ├── routers.ts        # API route definitions
│   ├── db.ts             # Database query helpers
│   └── _core/            # Framework internals
├── shared/               # Code shared between client and server
├── drizzle/              # Database schema and migrations
├── constants/            # App-wide constants
└── tests/                # Test files
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `THQ_WS_AUTH_TOKEN` | WebSocket authentication token |
| `TRAINLCD_GQL_URL` | TrainLCD GraphQL API endpoint |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base URL (client-side) |
| `EXPO_PUBLIC_OAUTH_*` | OAuth configuration (client-side) |

> Variables prefixed with `EXPO_PUBLIC_` are exposed in the client bundle. Never put secrets there.

## License

[MIT](./LICENSE)
