# THQMe - Mobile Telemetry Monitoring App 📱

THQMe is the mobile companion app for [THQ (TrainLCD Telemetry Headquarters)](https://github.com/TrainLCD/THQ), providing real-time telemetry monitoring and visualization capabilities on mobile devices. Built with Expo and React Native, this app enables field monitoring of location data, speed metrics, and system logs through WebSocket connections.

**Note**: THQ and THQMe are specifically designed for TrainLCD developers and the TrainLCD ecosystem. While the source code is open for transparency and learning purposes, these tools are optimized for TrainLCD's specific telemetry requirements and may not be suitable for other projects without significant modifications.

## ✨ Features

- **Real-time Telemetry Monitoring**: Monitor location data and system logs from mobile devices
- **Cross-platform Support**: Runs on iOS, Android, and web platforms
- **WebSocket Integration**: Connects to THQ servers for real-time data streaming
- **Responsive Mobile UI**: Optimized interface for mobile and tablet devices
- **Offline Capability**: Local data caching for intermittent connectivity scenarios

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For iOS development: Xcode and iOS Simulator
- For Android development: Android Studio and Android Emulator

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/TrainLCD/THQMe.git
   cd THQMe
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

### Running the App

In the output, you'll find options to open the app in:

- **Development build**: For testing with native functionality
- **iOS Simulator**: For iOS development and testing
- **Android Emulator**: For Android development and testing
- **Expo Go**: For quick testing and development (limited native functionality)
- **Web Browser**: For web platform testing

## 🏗️ Architecture

THQMe is built using modern React Native and Expo technologies:

- **Frontend**: React Native with Expo
- **Routing**: Expo Router for file-based navigation
- **State Management**: React hooks and context
- **Networking**: WebSocket connections to THQ servers
- **UI Components**: Custom themed components with dark mode support

### Project Structure

```
app/
├── (tabs)/              # Tab-based navigation screens
│   ├── _layout.tsx      # Tab layout configuration
│   ├── index.tsx        # Main monitoring dashboard
│   └── explore.tsx      # Additional features
├── _layout.tsx          # Root layout
└── +not-found.tsx       # 404 error page

components/
├── ui/                  # Platform-specific UI components
├── ThemedText.tsx       # Themed text component
├── ThemedView.tsx       # Themed view component
└── ...                  # Other reusable components

constants/
└── Colors.ts           # Color scheme definitions

hooks/
├── useColorScheme.ts    # Color scheme management
└── useThemeColor.ts     # Theme color utilities
```

## 🛠️ Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start with Android emulator
- `npm run ios` - Start with iOS simulator
- `npm run web` - Start web version
- `npm run lint` - Run ESLint
- `npm run reset-project` - Reset to blank project template

### Configuration

The app can be configured to connect to different THQ server instances by modifying the WebSocket endpoint settings.

## 🔗 Related Projects

- [THQ](https://github.com/TrainLCD/THQ) - Main telemetry headquarters application
- [TrainLCD Mobile App](https://github.com/TrainLCD/MobileApp) - The new sense mobile navigation app
- [StationAPI](https://github.com/TrainLCD/StationAPI) - gRPC-Web API for nearby Japanese train stations

## 🤝 Contributing

We welcome contributions to THQMe from TrainLCD developers and contributors! Please note that this project is specifically designed for the TrainLCD ecosystem.

Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting (`npm run lint`)
5. Test on multiple platforms
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 License

This project is part of the TrainLCD ecosystem. Please refer to the license file for details.

## 📞 Support

For questions and support:

- Open an issue on [GitHub](https://github.com/TrainLCD/THQMe/issues)
- Contact the TrainLCD team
- Check the [THQ documentation](https://github.com/TrainLCD/THQ) for server setup

## 🌟 Learn More

To learn more about the technologies used in this project:

- [Expo Documentation](https://docs.expo.dev/): Learn about Expo development
- [React Native Documentation](https://reactnative.dev/): Learn React Native fundamentals
- [Expo Router](https://docs.expo.dev/router/introduction/): File-based navigation system
