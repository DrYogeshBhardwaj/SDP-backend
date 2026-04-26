import asyncio
import edge_tts
import os

# Configuration
VOICE = "hi-IN-MadhurNeural"
RATE = "-10%"
OUTPUT_DIR = "public/assets/audio/instructions"

# Instruction lines as requested
SCRIPTS = {
    "screen_calibrated.mp3": "आपकी स्क्रीन आपके SINAANK के अनुसार समायोजित की गई है",
    "look_center.mp3": "स्क्रीन के केंद्र पर धीरे ध्यान रखें",
    "color_follow.mp3": "रंगों को बदलते हुए देखें",
    "stay_relaxed.mp3": "आराम बनाए रखें",
    "focus_breath.mp3": "साँस को सामान्य रखें",
    "therapy_begin.mp3": "थेरेपी अब शुरू हो रही है"
}

async def generate_instructions():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"--- Starting Instruction Audio Generation (Voice: {VOICE}, Rate: {RATE}) ---")
    
    for filename, text in SCRIPTS.items():
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        # Use simple text interface for instruction clips (fast, clean)
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(output_path)
        print(f"✅ Generated: {output_path}")

    print("--- Instruction Generation Finished ---")

if __name__ == "__main__":
    asyncio.run(generate_instructions())
