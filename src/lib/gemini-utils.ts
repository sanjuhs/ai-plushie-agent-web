// Audio utility functions for Gemini Live Kit

export function createBlob(pcmData: Float32Array): Blob {
  // Convert Float32Array to Int16Array for 16-bit PCM (Gemini requirement)
  const int16Array = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    // Clamp and convert from float (-1 to 1) to int16 (-32768 to 32767)
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Gemini requires exact MIME type: audio/pcm;rate=16000
  return new Blob([int16Array.buffer], { type: "audio/pcm;rate=16000" });
}

export function decode(base64String: string): ArrayBuffer {
  // Decode base64 string to ArrayBuffer
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function decodeAudioData(
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext,
  sampleRate: number,
  numberOfChannels: number
): Promise<AudioBuffer> {
  try {
    // Try to decode using Web Audio API first
    return await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch (error) {
    // Fallback: create AudioBuffer manually for raw PCM data from Gemini
    console.warn(
      "🎵 [GEMINI] Direct decode failed, creating manual AudioBuffer for raw PCM:",
      error
    );

    try {
      // Create a copy of the ArrayBuffer to avoid detached buffer issues
      const bufferCopy = arrayBuffer.slice(0);

      // Gemini sends 16-bit PCM data
      const int16Array = new Int16Array(bufferCopy);
      console.log(
        "🎵 [GEMINI] Processing",
        int16Array.length,
        "16-bit samples at",
        sampleRate,
        "Hz"
      );

      const float32Array = new Float32Array(int16Array.length);

      // Convert Int16 to Float32 (-1.0 to 1.0 range)
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
      }

      // Create AudioBuffer for playback
      const frameCount = Math.floor(float32Array.length / numberOfChannels);
      const audioBuffer = audioContext.createBuffer(
        numberOfChannels,
        frameCount,
        sampleRate
      );

      console.log(
        "🎵 [GEMINI] Created AudioBuffer:",
        frameCount,
        "frames,",
        numberOfChannels,
        "channels"
      );

      // Copy data to the buffer channels
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = float32Array[i * numberOfChannels + channel];
        }
      }

      return audioBuffer;
    } catch (fallbackError) {
      console.error("❌ [GEMINI] Fallback audio decode failed:", fallbackError);
      throw fallbackError;
    }
  }
}
