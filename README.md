# 🐘 AI Companion Plushie

A magical realtime AI companion built with Next.js, shadcn/ui, and OpenAI's Realtime API. Meet Squeaky, the delightfully confused elephant plushie who thinks they're a mouse!

## ✨ Features

- 🎤 **Real-time Voice Chat**: Talk naturally with Squeaky using OpenAI's Realtime API
- 🐘 **Squeaky the Elephant-Mouse**: A charming plushie who thinks they're a mouse!
- 🧠 **Perfect Memory**: Squeaky remembers personal details about you across conversations
- 🎵 **Indian Language Pronunciation**: Authentic pronunciation of Hindi, Kannada, Bengali, Tamil, Telugu, Malayalam, Gujarati, Punjabi, Odia, and Assamese words using Sarvam AI
- 🔴 **IoT LED Control**: Control real LEDs connected to a Raspberry Pi
- 🌤️ **Weather Powers**: Get current weather information
- 💰 **Crypto Knowledge**: Token prices and swap quotes on Base network
- 🎲 **Shake Detection**: Responds when you shake your device
- 🔒 **Secure**: API keys are fetched from server-side endpoints for security
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- 📱 **Responsive Design**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- An OpenAI API key (get one from [OpenAI Platform](https://platform.openai.com))
- A Sarvam AI API key (get one from [Sarvam AI](https://sarvam.ai)) for Indian language pronunciation

### Installation

1. Clone this repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SARVAM_API_KEY=your_sarvam_api_key_here
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 How to Use

1. **Grant Microphone Permission**: When prompted, allow the app to access your microphone
2. **Start Talking**: Click the large microphone button to start recording
3. **Listen to Response**: Your unicorn companion will respond with voice
4. **Reset Session**: Use the reset button to start a new conversation
5. **Show Love**: Click the heart button to show appreciation! 💖

## 🛠️ Built With

- [Next.js 15](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google Gemini Live API](https://ai.google.dev/) - Realtime AI conversation
- [Lucide React](https://lucide.dev/) - Beautiful icons

## 🎨 Components

- `UnicornAICompanionLive`: Main component handling real-time voice chat with Gemini Live
- `/api/gemini-key`: Server-side API endpoint for secure API key distribution
- `/api/chat`: Alternative text-based chat endpoint
- `Card`: shadcn/ui card components for the interface
- `Button`: Custom styled buttons with unicorn theme

## 🔒 Security

The application keeps API keys secure on the server-side:

- API keys are stored as server environment variables (not client-side)
- API keys are distributed through secure server endpoints
- Gemini Live connections are initialized with server-provided keys
- No hardcoded API keys in client-side code

## 🔧 Configuration

The app uses Gemini Live (gemini-2.0-flash-exp) with real-time audio capabilities. You can customize:

- Voice settings in the `speechConfig`
- Audio sample rates (currently 16kHz input, 24kHz output)
- UI theme colors in the Tailwind classes

## 📱 Browser Compatibility

- Chrome/Chromium browsers (recommended)
- Firefox
- Safari (with potential audio limitations)
- Edge

_Note: Requires HTTPS in production for microphone access_

## 🌟 Features to Add

- [ ] Voice customization options
- [ ] Chat history
- [ ] Multiple unicorn personalities
- [ ] Text chat fallback
- [ ] Animated unicorn avatar
- [ ] Sound effects and music

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with 💖 and 🦄 magic!
