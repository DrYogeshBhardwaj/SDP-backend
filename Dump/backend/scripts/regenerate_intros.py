import asyncio
import edge_tts
import os

# Clean Hindi script for clinical clinical intro (no SSML/XML)
TEXT_TEMPLATE = """
नमस्ते। {THERAPY_NAME} में आपका स्वागत है।

यह समय केवल आपका अपना है।
आप सुरक्षित हैं।

कृपया आराम से बैठें या लेट जाएँ।
अपनी आँखें धीरे से बंद करें।

बस सुनते रहें।
अब आप धीरे-धीरे आराम महसूस कर रहे हैं।

अब थेरेपी शुरू करने के लिए क्लिक करें।
"""

MODULES = {
    "sdp": "सिनांक डिजिटल विराम (SDP)",
    "sdb": "सिनांक श्वसन थेरेपी (SDB)",
    "sde": "सिनांक दृष्टि थेरेपी (SDE)",
    "sds": "सिनांक नींद थेरेपी (SDS)",
    "sdm": "सिनांक गतिज थेरेपी (SDM)",
    "sdd": "सिनांक पाचन थेरेपी (SDD)"
}

VOICE = "hi-IN-MadhurNeural"
# -10% for a calm, professional clinical tone
RATE = "-10%"

async def generate_intros():
    # Target directory for public assets
    output_dir = "public/assets/audio/intro"
    
    # Ensure directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"[AudioGen] Created directory: {output_dir}")
    
    for mod, name in MODULES.items():
        text = TEXT_TEMPLATE.format(THERAPY_NAME=name).strip()
        output_file = os.path.join(output_dir, f"intro_{mod}.mp3")
        
        print(f"[AudioGen] Generating: {output_file}...")
        try:
            communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
            await communicate.save(output_file)
            
            size = os.path.getsize(output_file)
            print(f"[AudioGen] SUCCESS: {output_file} ({size} bytes)")
        except Exception as e:
            print(f"[AudioGen] ERROR generating {mod}: {e}")

if __name__ == "__main__":
    asyncio.run(generate_intros())
