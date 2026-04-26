import asyncio
import edge_tts
import os

# Configuration
VOICE = "hi-IN-MadhurNeural"
RATE = "-10%" # Slightly slower for clinical feel
BASE_DIR = "public/assets/audio"

# Audio Manifest
MANIFEST = {
    "intros": {
        "intro_relax.mp3": "SINAANK डिजिटल पॉज में आपका स्वागत है। यह आपकी रिलैक्सेशन थेरेपी है। कृपया शांत बैठकर अपनी आंखों को धीरे से बंद कर लें।",
        "intro_breathing.mp3": "SINAANK डिजिटल पॉज में स्वागत है। यह ब्रीदिंग थेरेपी है। इसमें हम आपकी सांसों की गति को संतुलित करेंगे।",
        "intro_eye.mp3": "SINAANK डिजिटल पॉज में स्वागत है। यह आई रिलैक्सेशन थेरेपी है। यह आंखों की थकान दूर करने में मदद करेगी।",
        "intro_movement.mp3": "SINAANK डिजिटल पॉज में स्वागत है। यह बॉडी मूवमेंट थेरेपी है। हम आपके शरीर की गतिशीलता पर ध्यान देंगे।",
        "intro_digestion.mp3": "SINAANK डिजिटल पॉज में स्वागत है। यह डाइजेशन थेरेपी है। यह भोजन के बाद पाचन बेहतर बनाने में मदद करती है।",
        "intro_sleep.mp3": "SINAANK डिजिटल पॉज में स्वागत है। यह स्लीप थेरेपी है। यह आपको आरामदायक नींद के लिए तैयार करेगी।"
    },
    "common": {
        "welcome.mp3": "स्वागत है",
        "relax.mp3": "आराम से बैठ जाएँ",
        "close_eyes.mp3": "आंखें धीरे बंद करें",
        "focus_sound.mp3": "ध्वनि पर ध्यान दें",
        "breathe.mp3": "धीरे सांस लें",
        "release.mp3": "धीरे सांस छोड़ें",
        "stay_relaxed.mp3": "आराम बनाए रखें",
        "continue.mp3": "जारी रखें",
        "therapy_start.mp3": "थेरेपी शुरू हो रही है",
        "therapy_end.mp3": "थेरेपी समाप्त हो रही है"
    },
    "breathing": {
        "inhale.mp3": "धीरे सांस अंदर लें",
        "hold.mp3": "सांस रोकें",
        "exhale.mp3": "धीरे सांस बाहर छोड़ें",
        "natural_breath.mp3": "सांस को सहज रखें"
    },
    "eye": {
        "blink.mp3": "धीरे झपकें",
        "soft_eyes.mp3": "आंखों को ढीला छोड़ें",
        "focus_center.mp3": "ध्यान केंद्र में रखें"
    },
    "movement": {
        "start_walk.mp3": "धीरे चलना शुरू करें",
        "left_step.mp3": "बायां कदम बढ़ाएं",
        "right_step.mp3": "दायां कदम बढ़ाएं",
        "keep_walking.mp3": "चलते रहें"
    },
    "digestion": {
        "after_meal.mp3": "भोजन के बाद आराम करें",
        "relax_stomach.mp3": "पेट को ढीला छोड़ दें",
        "gentle_breath.mp3": "धीरे सांस लें"
    }
}

async def generate_audio(text, output_path):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(output_path)
    print(f"Generated: {output_path}")

async def main():
    print(f"--- Starting Audio Generation (Voice: {VOICE}, Rate: {RATE}) ---")
    
    for folder, files in MANIFEST.items():
        # Create folder path
        # Note: intros go directly into assets/audio, others in subfolders
        folder_path = BASE_DIR if folder == "intros" else os.path.join(BASE_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        for filename, text in files.items():
            output_path = os.path.join(folder_path, filename)
            await generate_audio(text, output_path)

    print("--- Audio Generation Finished ---")

if __name__ == "__main__":
    asyncio.run(main())
