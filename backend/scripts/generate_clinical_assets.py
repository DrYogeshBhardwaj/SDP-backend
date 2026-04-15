import asyncio
import os
from edge_tts import Communicate

# SINAANK Clinical Audio Generation Script (Phase 2 - Cues & Pings)
# Voice: hi-IN-MadhurNeural (Neutral Calm)
# Speed: -10% (Slow/Reassuring)

VOICE = "hi-IN-MadhurNeural"
RATE = "-10%"
VOLUME = "+0%"

ASSETS = {
    "public/assets/audio/cues/shoulder_relax.mp3": "अपने कंधों को बिल्कुल ढीला छोड़ दें। रिलैक्स योर शोल्डर्स।",
    "public/assets/audio/cues/arm_swing.mp3": "साथ में हाथों को नेचुरल स्विंग होने दें। लेट योर आर्म्स स्विंग नैचुरली।",
    "public/assets/audio/cues/look_left.mp3": "धीरे से बाएं देखें, फिर बिल्कुल सामने। लुक लेफ्ट, देन स्ट्रेट।",
    "public/assets/audio/cues/look_right.mp3": "धीरे से दाएं देखें, फिर बिल्कुल सामने। लुक राइट, देन स्ट्रेट।",
    "public/assets/audio/cues/look_up.mp3": "हल्की से ऊपर देखें, फिर सामने। लुक अप, देन स्ट्रेट।",
    "public/assets/audio/cues/look_down.mp3": "हल्की से नीचे देखें, फिर सामने। लुक डाउन, देन स्ट्रेट।",
    "public/assets/audio/cues/hands_loose.mp3": "हाथों को बिल्कुल ढीला छोड़ दें। हैंड्स लूज़।",
    "public/assets/audio/cues/pace_normal.mp3": "सामान्य गति से चलें। वॉक नैचुरली।",
    "public/assets/audio/cues/pace_slow.mp3": "गति को बिल्कुल धीमा और आरामदायक रखें। कीप अ स्लो एंड कम्फर्टेबल पेस।",
    "public/assets/audio/sdd/zen_ping.mp3": "..." # This should be a tone, but I'll generate a soft 'Sinaank' whisper or just skip for TTS
}

async def generate():
    for path, text in ASSETS.items():
        if text == "...": continue # Skip non-speech
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print(f"Generating: {path}")
        communicate = Communicate(text, VOICE, rate=RATE, volume=VOLUME)
        await communicate.save(path)

if __name__ == "__main__":
    asyncio.run(generate())
