import asyncio
import edge_tts
import os

# Configuration
VOICE = "hi-IN-MadhurNeural"
RATE = "-10%"
OUTPUT_DIR = "public/assets/audio/intro"

# Common Body with SSML breaks for clinical pacing
COMMON_BODY = """
<break time="1000ms" />
स्वागत है SINAANK (सिनांक) थेरेपी में। 
<break time="1200ms" />
यह अनुभव SINAANK टीम की कई वर्षों की मेहनत और उन्नत AI तकनीक की सहायता से तैयार किया गया है। 
<break time="1200ms" />
इसका उद्देश्य आपको सरल, सुरक्षित और सहज तरीके से मानसिक और शारीरिक आराम प्रदान करना है। 
<break time="1500ms" />
आप सुरक्षित हैं। 
<break time="1200ms" />
यहाँ कोई भी चिंता आपके इस शांत स्थान में प्रवेश नहीं कर सकती। 
<break time="1200ms" />
कृपया आराम से बैठें या लेट जाएँ। 
<break time="1200ms" />
अपनी आँखों को धीरे से बंद करें और केवल मेरी आवाज़ पर ध्यान दें। 
<break time="1200ms" />
आपको कुछ भी करने की आवश्यकता नहीं है। 
<break time="1200ms" />
बस सुनते रहें और अनुभव को स्वाभाविक रूप से होने दें। 
<break time="1500ms" />
अब आप धीरे-धीरे बेहद आराम महसूस कर रहे हैं।
"""

# Therapy specific scripts
SCRIPTS = {
    "intro_sleep.mp3": f"""
    नमस्ते। स्लीप थेरेपी में आपका स्वागत है। 
    <break time="1200ms" />
    यह थेरेपी विशेष रूप से आपके मस्तिष्क को शांत करने और आपको एक गहरी, सुखद नींद के लिए तैयार करने के लिए डिज़ाइन की गई है। 
    <break time="1200ms" />
    आज दिन भर की भागदौड़, विचारों और ज़िम्मेदारियों को पीछे छोड़ दें। 
    <break time="1200ms" />
    यह समय केवल आपके गहरे विश्राम का है।
    {COMMON_BODY}
    <break time="2000ms" />
    जैसे-जैसे मेरी आवाज़ शांत होती जाएगी, आप शांति की एक सुखद गहराई में उतरते जाएंगे। 
    <break time="1200ms" />
    आपका मन शांत है, आपका शरीर हल्का है। 
    <break time="1200ms" />
    शुभ रात्रि।
    """,
    "intro_breathing.mp3": f"""
    नमस्ते। ब्रीदिंग थेरेपी में आपका स्वागत है। 
    <break time="1200ms" />
    साँस लेना जीवन का आधार है, लेकिन सचेत रूप से साँस लेना हमारे तंत्रिका तंत्र को संतुलित करने की सबसे शक्तिशाली तकनीक है। 
    <break time="1500ms" />
    इस थेरेपी के दौरान हम अपनी साँसों की स्वाभाविक गति को समझेंगे और आंतरिक शांति का अनुभव करेंगे।
    {COMMON_BODY}
    <break time="2000ms" />
    अब हम धीरे-धीरे साँसों के एक लयबद्ध चक्र में प्रवेश करेंगे। 
    <break time="1200ms" />
    केवल महसूस करें कि कैसे हर साँस आपके भीतर शांति और नई ऊर्जा भर रही है।
    """,
    "intro_eye.mp3": f"""
    नमस्ते। आई रिलैक्सेशन थेरेपी में आपका स्वागत है। 
    <break time="1200ms" />
    स्क्रीन और तेज़ रोशनी के इस आधुनिक युग में, हमारी आँखों को निरंतर काम करना पड़ता है। 
    <break time="1200ms" />
    यह थेरेपी आपकी आँखों की सूक्ष्म मांसपेशियों को गहरा विश्राम देने और मानसिक स्पष्टता बढ़ाने के लिए बनाई गई है।
    {COMMON_BODY}
    <break time="2000ms" />
    अपनी आँखों की मांसपेशियों को पूरी तरह ढीला छोड़ दें। 
    <break time="1200ms" />
    कल्पना करें कि जैसे ही बाहरी प्रकाश मंद होता है, आपके भीतर की शांति और सुकून बढ़ता जा रहा है।
    """,
    "intro_movement.mp3": f"""
    नमस्ते। बॉडी मूवमेंट थेरेपी में आपका स्वागत है। 
    <break time="1200ms" />
    यह थेरेपी आपको अपने शरीर की सूक्ष्म गतिविधियों, खिंचाव और संतुलन के प्रति जागरूक बनाने के लिए डिज़ाइन की गई है। 
    <break time="1200ms" />
    हम बहुत धीरे और सचेत होकर अपने अंगों की गति को महसूस करेंगे।
    {COMMON_BODY}
    <break time="2000ms" />
    अपने शरीर के हर हिस्से को ढीला छोड़ दें। 
    <break time="1200ms" />
    जब आप धीरे-धीरे हिलना शुरू करेंगे, तो हर कदम और हर खिंचाव में एक सुंदर लय ढूँढने का प्रयास करें।
    """,
    "intro_digestion.mp3": f"""
    नमस्ते। डाइजेशन थेरेपी में आपका स्वागत है। 
    <break time="1200ms" />
    भोजन के बाद का यह समय आपके शरीर के लिए पोषण को ऊर्जा में बदलने का महत्वपूर्ण क्षण है। 
    <break time="1200ms" />
    यह थेरेपी आपके पाचन तंत्र को सुचारू बनाने और पेट की मांसपेशियों को शांत करने में मदद करती है।
    {COMMON_BODY}
    <break time="2000ms" />
    अपने पेट के क्षेत्र को पूरी तरह ढीला और सहज कर दें। 
    <break time="1200ms" />
    पाचन की प्राकृतिक प्रक्रिया को बिना किसी दबाव के अपना काम करने दें। 
    <break time="1200ms" />
    आप भीतर से शांत और संतुष्ट महसूस कर रहे हैं।
    """,
    "intro_relax.mp3": f"""
    नमस्ते। रिलैक्सेशन थेरेपी में आपका स्वागत है। 
    <break time="1200ms" />
    यह समय केवल आपका अपना है, जहाँ दुनिया की कोई भी चिंता या शोर आपके इस सुरक्षित और शांत स्थान में प्रवेश नहीं कर सकता। 
    <break time="1200ms" />
    आज हम संचित तनाव को पूरी तरह विदा करेंगे।
    {COMMON_BODY}
    <break time="2000ms" />
    अपने पूरे शरीर को गुरुत्वाकर्षण के हवाले कर दें। 
    <break time="1200ms" />
    इस अद्भुत भारीपन और असीम शांति का आनंद लें। 
    <break time="1200ms" />
    आप सुरक्षित हैं, आप पूरी तरह शांत हैं।
    """
}

async def generate_intros():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"--- Starting Final Audio Generation (Voice: {VOICE}, Rate: {RATE}) ---")
    
    for filename, script in SCRIPTS.items():
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        # Wrap the script in SSML for precise pause control
        ssml_content = f"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="hi-IN">
            <voice name="{VOICE}">
                {script}
            </voice>
        </speak>
        """
        
        communicate = edge_tts.Communicate(ssml_content, VOICE, rate=RATE)
        await communicate.save(output_path)
        print(f"✅ Generated: {output_path}")

    print("--- 60-90s Intro Generation Finished ---")

if __name__ == "__main__":
    asyncio.run(generate_intros())
