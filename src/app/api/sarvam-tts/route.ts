import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, target_language_code = "hi-IN" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Sarvam API key not configured" },
        { status: 500 }
      );
    }

    console.log(
      `🎵 [SARVAM] Generating TTS for: "${text}" in ${target_language_code}`
    );

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        target_language_code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SARVAM] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Sarvam API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the JSON response from Sarvam API
    const responseData = await response.json();

    console.log(`✅ [SARVAM] TTS response received:`, responseData);

    if (!responseData.audios || !responseData.audios[0]) {
      throw new Error("No audio data in response");
    }

    // The audio is base64 encoded WAV
    const base64Audio = responseData.audios[0];
    console.log(
      `🎵 [SARVAM] Base64 audio length: ${base64Audio.length} characters`
    );

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Audio, "base64");

    console.log(
      `✅ [SARVAM] TTS generated successfully, audio size: ${audioBuffer.byteLength} bytes`
    );

    // Return the WAV audio data with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("❌ [SARVAM] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
