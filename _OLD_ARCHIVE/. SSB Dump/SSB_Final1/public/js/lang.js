const TRANSLATIONS = {
    'en': {
        'title': 'SCREEN vs SSB',
        'subtitle': 'A short digital break',
        'war_stmt': 'We are not against screens, we are against the fatigue caused by continuous screen usage.',
        'hero_desc': 'When screens run non-stop, eyes feel tired and the mind feels crowded. A short digital break can help you reset.',
        'what_is': '✅ What is SSB?',
        'point_1': 'A short break from screens',
        'point_2': '1–2 minute digital reset',
        'point_3': 'Relief for eyes & mind',
        'btn_start': 'Get Digital Break from Sinaank',
        'cta_micro': 'Use anytime • No daily limit',
        'wallet_info': 'Total 1,780 Mins | ₹178',
        'session_1': '1 Min Break',
        'session_2': '2 Min Break',
        'insufficient': 'Insufficient Balance.',
        'device_lock_err': 'Account active on another device. One mobile = One device allowed.',
        'smp_ph_tmob': 'Target Mobile',
        'smp_ph_oname': 'Old Name (Current)',
        'smp_ph_nname': 'New Name',
        'btn_update': 'Update Number',
        'lbl_name': 'Name',
        'ph_name': 'John Doe',
        'lbl_phone': 'Mobile Number',
        'ph_mobile': '98XXXXXXXX',
        'btn_gen': 'Proceed',
        'cal_title': 'Start Calibration',
        'lbl_pin': 'Security PIN',
        'ph_pin': 'Set 4-digit PIN',
        'cal_note_10d': '*Calculation uses the 10-digit number.',
        'btn_gen_plan': 'Start Calibration',
        'btn_back_home': '← Back to Home',
        'footer_dev': 'Developed by SINAANK Team',
        'disclaimer': 'This is a non-medical digital wellness experience.',
        'how_works': 'How It Works',
        'step_1': '1️⃣ <strong>Mobile Calibration</strong>: Your number generates a unique frequency.',
        'step_2': '2️⃣ <strong>Micro Session</strong>: Listen to your unique sound (1-2 mins).',
        'step_3': '3️⃣ <strong>Repeat</strong>: Use whenever you feel screen fatigue.',
        'trust_title': '🔒 Privacy & Access',
        'trust_desc': 'No personal data shared. We use your number only to generate your unique sound/color.',
        'device_note': '⚠️ <strong>Note:</strong> One Mobile Number = One Device access only.',

        // Session Ready
        'ready_title': 'Your Digital Break is Ready',
        'ready_sub': 'Your personal sound and color balance has been calibrated for this device.',
        'info_device': 'Device: This Phone Only',
        'choose_break': 'Choose Your Break',
        'opt_1min': '1 Minute',
        'opt_1min_desc': 'Quick reset for eyes & mind',
        'opt_2min': '2 Minutes',
        'opt_2min_desc': 'Deep digital silence',
        'opt_5min': '5 Minutes',
        'opt_5min_desc': 'Full system reboot',
        'opt_10min': '10 Minutes',
        'opt_10min_desc': 'Deep Rest',
        'rule_note': 'Minutes are deducted as soon as the session starts.',
        'bal_total': 'Total Minutes:',
        'bal_remain': 'Remaining:',
        'icon_sound': 'Sound Based',
        'icon_color': 'Color Waves',
        'icon_device': 'One Device',

        // Payment Screen
        'bio_title': 'Your Bio-Rhythm',
        'bio_sub': 'Personalized Digital Experience',
        'res_color': 'Color Key',
        'res_sound': 'Sound Key',
        'res_req': 'Required Session:',
        'btn_unlock': 'Unlock Full Access @ ₹178',
        'pay_note': 'One-time payment • No expiry • Use anytime',
        'btn_recalc': '← Recalculate / Changes',

        // Reminder Feature
        'rem_title': 'Daily Gentle Reminder (Optional)',
        'rem_desc': 'Choose your preferred times for digital breaks. SSB will gently remind you every day for 7 days.',
        'rem_5x': '5 times a day',
        'rem_10x': '10 times a day',
        'rem_off': 'Off',
        'rem_select_label': 'Select reminder times:',
        'rem_help': 'You are setting reminder times for each day. These times will repeat daily for 7 days.',
        'rem_note': '• Gentle notification • No alarm • Runs for 7 days • Turn off anytime',
        'rem_msg': 'It’s time for your digital break. Take 1–2 minutes to relax your eyes & mind.',
        'rem_disclaimer': 'This is a wellness reminder, not a medical alert.',

        // Session Flow
        'sess_prog': 'Session in progress…<br>Relax your eyes and mind.',
        'comp_title': 'Break Complete',
        'comp_sub': 'Your digital break is complete. Hope you feel lighter and calmer.',
        'comp_dur': 'Session Duration:',
        'comp_used': 'Minutes Used:',
        'comp_bal': 'Remaining Minutes:',
        'comp_msg': 'Small breaks, taken regularly, can help you stay balanced on screens.',
        'comp_thank': 'Thank you for taking a mindful digital break.',
        'play_stay_msg': 'Please stay on this screen until the session completes.',
        'btn_again': 'TAKE ANOTHER BREAK',
        'btn_home': 'BACK TO HOME',
        'btn_recharge': 'RECHARGE SSB – ₹178',

        // Warnings
        'low_bal_title': 'Low Balance',
        'low_bal_msg': 'You’re running low on SSB minutes. Consider using your breaks mindfully.',
        'no_bal_title': 'No Minutes Left',
        'no_bal_msg': 'Your SSB minutes are currently over. Recharge to continue taking digital breaks.',

        // Seller Dashboard
        'seller_prog': 'Seller Program',
        'auth_access': 'Authorized Distribution Access',
        'your_mobile': 'Your Mobile Number',
        'btn_verify': 'Verify & Proceed',
        'back_home': '← Back to Home',
        'join_net': 'Seller Registration',
        'join_desc': 'Hum pehle product khud use karwate hain, uske baad hi kisi ko bechne ka adhikar dete hain.',
        'lbl_fullname': 'Full Name',
        'ph_yourname': 'Poonam Sharma',
        'i_satisfy': 'I have personally used Sinaank Screen Break (SSB) and am satisfied.',
        'btn_activate': 'Activate Seller Panel',
        'term_title': 'Authorized Seller Agreement',
        'term_1': '1. Independent Status: You are an independent authorized seller, not an employee or agent of SINAANK.',
        'term_2': '2. Direct Sales Only: You earn commission only on direct personal sales. This is NOT a multi-level marketing (MLM) or pyramid scheme.',
        'term_3': '3. Commission: You receive "Seller Credits" for each verified sale. Credits are subject to tax deduction (TDS) as per government rules.',
        'term_4': '4. No Misrepresentation: You agree NOT to claim this product cures medical diseases. It is a "Wellness & Relaxation" tool only.',
        'term_5': '5. Anti-Spam: You agree not to send unsolicited spam. You may only share with contacts who have consented.',
        'term_6': '6. Termination: SINAANK reserves the right to revoke seller status for violation of these terms.',
        'btn_close': 'Close',
        'err_access': 'Access Denied. You must purchase SSB first to become a seller.',

        // Partner Dashboard (Internal)
        'dash_title': 'SELLER DASHBOARD',
        'dash_sub': 'AUTHORIZED PARTNER PANEL',
        'btn_logout': 'LOGOUT',
        'sec_summary': 'Partner Summary',
        'lbl_seller_name': 'Seller Name',
        'lbl_seller_id': 'Seller ID',
        'lbl_earn': 'Total Earnings',
        'lbl_sales': 'Kits Sold',
        'lbl_active': 'Active Users',
        'lbl_pending': 'Pending Users',
        'sensitive_info': 'Sensitive Info (PIN/Payments) Hidden',
        'sec_buyers': 'Buyer List',
        'no_sales': 'No sales yet. Share your link!',
        'sec_support': 'Support / Help Desk',
        'lbl_issue': 'Issue Type',
        'opt_gen': 'General Help',
        'opt_pin': 'PIN Change Request',
        'opt_slot': 'Mobile Slot Issue',
        'opt_pay': 'Payment Confusion',
        'opt_other': 'Other',
        'lbl_msg': 'Message (visible to Admin)',
        'ph_msg': 'Describe the issue...',
        'btn_send': 'SEND TO SUPPORT',
        'msg_sent': '✓ Message sent to FCC Panel',
        'flow_seller': 'Seller<br>Message',
        'flow_admin': 'FCC / ADMIN<br>PANEL',
        'flow_reply': 'Reply<br>Received',
        'sec_security': '🔒 SECURITY & COMPLIANCE',
        'sec_security_msg': 'For security reasons, user PINs & Payment Data are handled ONLY by the FCC / Admin team. Sellers are authorized for distribution & guidance only.',
        'btn_open_support': 'OPEN SUPPORT',

        // Dynamic Data (Added for partner.html JS)
        'kit_1': 'SMT Base',
        'kit_2': 'SMT Mix',
        'kit_3': 'SMT Family',
        'alert_logout': 'Logout from Seller Panel?',
        'alert_msg_empty': 'Please type a message.',
        'alert_msg_sent': 'Message Sent to Admin Panel. You will receive a reply shortly.',

        // Login / Validation errors
        'err_mobile': 'Invalid Mobile',
        'err_pin_len': 'Enter 4-digit PIN',
        'err_pin_match': 'Incorrect PIN for this number',

        // SMP & Dashboard (New)
        'smp_title': 'Sinaank Money Plant',
        'smp_sales': 'Total Sales',
        'smp_earn': 'Est. Earnings',
        'smp_up_title': '🌟 Upgrade to SMP',
        'smp_up_desc': 'Qualified (5+ Sales). Apply for Sinaank Money Plant status.',

        'smp_elite_title': 'Elite Status Unlocked',
        'smp_elite_desc': 'You have completed <span style="color:#ffd700; font-weight:bold;">5+ Sales</span>.<br>Apply now effectively to become a <span style="color:#ffd700;">Zero Investment Business Partner</span>.',
        'smp_elite_btn': 'Apply for SMP',

        'smp_form_title': 'SMP Application',
        'smp_lbl_applicant': 'Applicant Identity',
        'smp_lbl_address': 'Shipping Address',
        'smp_lbl_pincode': 'Pincode',
        'smp_lbl_aadhar': 'Aadhar Last 4',
        'smp_lbl_photo': 'Partner Photo (Selfie)',
        'smp_lbl_photo_desc': 'Upload a clear, professional photo for your ID Card.',
        'smp_lbl_use_def': 'Use System Avatar (For Testing Only)',
        'smp_btn_cancel': 'Cancel',
        'smp_btn_submit': 'Submit Application',

        'smp_apply': 'Apply Now',
        'smp_ctrl_title': '🌿 SMP Controls',
        'smp_btn_manual': '+ Paid Entry',
        'smp_btn_edit': '✎ Edit Name',
        'smp_gold_copy': 'COPY<br>LINK',
        'smp_gold_paid': 'PAID<br>ENTRY',
        'smp_gold_edit': 'EDIT<br>NAME',
        'smp_net_title': 'Your Network',
        'smp_support': 'Contact Support',
        'smp_demo': 'Start SMP Demo',

        // Alerts & Validation (Audit)
        'err_name_len': 'Invalid Name: Please enter at least 3 letters.',
        'err_name_char': 'Invalid Name: Only letters allowed.',
        'err_mobile_start': 'Invalid Indian Mobile Number. It usually starts with 6, 7, 8 or 9.',
        'err_mobile_zero': 'Invalid Mobile: Cannot start with 0.',
        'err_access_denied': 'Access Denied: Incorrect PIN for this Mobile Number.',
        'err_demo_mode': 'Demo Mode Active',

        // Play Screen
        'play_left_ear': 'Left Ear',
        'play_right_ear': 'Right Ear',
        'play_initiate': 'Initiate Session',

        // Pricing Cards
        'kit_1_badge': 'Personal Break',
        'kit_1_desc': 'For Single User',
        'kit_2_badge': 'Shared Balance',
        'kit_2_desc': 'Best for Couples',
        'kit_3_badge': 'Family Wellness Pack',
        'kit_3_desc': 'Complete Family Protection',

        // Smart Slots
        'lbl_add_member': 'Add New Member',
        'ph_member_name': 'Name (e.g. Wife)',
        'ph_member_mobile': 'Mobile Number',
        'btn_add_now': 'Add Now',

        // Dashboard Accordion
        'acc_balance': 'Check Balance',
        'acc_slots': 'Mobile Slots (Family)',
        'acc_break': 'Start Digital Break',
        'acc_reminder': 'Daily Reminder'
    },
    'hi': {
        'title': 'स्क्रीन बनाम SSB',
        'subtitle': 'एक छोटा डिजिटल विराम',
        'war_stmt': 'हम स्क्रीन के खिलाफ नहीं हैं, हम लगातार चलती स्क्रीन से पैदा होने वाली थकावट के खिलाफ हैं।',
        'hero_desc': 'लगातार स्क्रीन देखने से आँखों और मन पर भारीपन लगता है। एक छोटा सा डिजिटल ब्रेक आपको रिलैक्स और रीसेट करने में मदद करता है।',
        'what_is': '✅ SSB क्या है',
        'point_1': 'Screen के बीच एक छोटा विराम',
        'point_2': '1–2 मिनट का Digital Balance Reset',
        'point_3': 'आँख + मन के लिए हल्की राहत',
        'btn_start': 'SSB से Digital Break लें',
        'wallet_info': 'कुल 1,780 मिनट | ₹178',
        'session_1': '1 मिनट ब्रेक',
        'session_2': '2 मिनट ब्रेक',
        'insufficient': 'Balance कम है।',
        'device_lock_err': 'यह खाता दूसरे डिवाइस पर सक्रिय है। सुरक्षा कारणों से एक मोबाइल नंबर केवल एक डिवाइस पर ही चल सकता है।',
        'lbl_name': 'नाम',
        'ph_name': 'Amit Kumar',
        'lbl_phone': 'मोबाइल नंबर',
        'ph_mobile': '98XXXXXXXX',
        'btn_gen': 'आगे बढ़ें',
        'cal_title': 'कैलिब्रेशन शुरू करें',
        'lbl_pin': 'सुरक्षा पिन',
        'ph_pin': '4-अंकीय पिन सेट करें',
        'cal_note_10d': '*गणना 10-अंकीय मोबाइल नंबर का उपयोग करती है।',
        'btn_gen_plan': 'कैलिब्रेशन शुरू करें',
        'btn_back_home': '← होम पर वापस जाएं',
        'cta_micro': 'कभी भी उपयोग करें • कोई प्रति-दिन सीमा नहीं',
        'footer_dev': 'Developed by SINAANK Team',
        'disclaimer': 'This is a non-medical digital wellness experience.',
        'how_works': 'यह कैसे काम करता है',
        'step_1': '1️⃣ <strong>मोबाइल कैलिब्रेशन</strong>: आपका नंबर एक यूनिक फ्रीक्वेंसी जेनरेट करता है।',
        'step_2': '2️⃣ <strong>माइक्रो सेशन</strong>: अपनी यूनिक ध्वनि सुनें (1-2 मिनट)।',
        'step_3': '3️⃣ <strong>दोहराएं</strong>: जब भी स्क्रीन से थकान महसूस हो, इसका उपयोग करें।',
        'trust_title': '🔒 गोपनीयता और एक्सेस',
        'trust_desc': 'कोई व्यक्तिगत डेटा साझा नहीं। हम आपके नंबर का उपयोग केवल आपकी यूनिक ध्वनि/रंग बनाने के लिए करते हैं।',
        'device_note': '⚠️ <strong>नोट:</strong> एक मोबाइल नंबर = केवल एक डिवाइस पर एक्सेस।',

        // Session Ready
        'ready_title': 'आपका डिजिटल ब्रेक तैयार है',
        'ready_sub': 'आपके व्यक्तिगत ध्वनि और रंग संतुलन को इस डिवाइस के लिए तैयार किया गया है।',
        'info_device': 'डिवाइस: केवल यह मोबाइल',
        'choose_break': 'अपना ब्रेक चुनें',
        'opt_1min': '1 मिनट',
        'opt_1min_desc': 'आंखों और मन के लिए त्वरित रीसेट',
        'opt_2min': '2 मिनट',
        'opt_2min_desc': 'गहरी डिजिटल शांति',
        'opt_5min': '5 मिनट',
        'opt_5min_desc': 'पूर्ण विश्राम (Full Reboot)',
        'opt_10min': '10 मिनट',
        'opt_10min_desc': 'गहरा विश्राम',
        'rule_note': 'सत्र शुरू होते ही चुना गया समय काट लिया जाएगा।',
        'bal_total': 'कुल मिनट:',
        'bal_remain': 'शेष मिनट:',
        'icon_sound': 'ध्वनि आधारित अनुभव',
        'icon_color': 'रंग तरंग संतुलन',
        'icon_device': 'केवल एक डिवाइस',

        // Reminder Feature
        'rem_title': 'प्रतिदिन हल्का रिमाइंडर (वैकल्पिक)',
        'rem_desc': 'डिजिटल ब्रेक के लिए अपना पसंदीदा समय चुनें। SSB आपको 7 दिनों तक हर दिन याद दिलाएगा।',
        'rem_5x': 'दिन में 5 बार',
        'rem_10x': 'दिन में 10 बार',
        'rem_off': 'बंद',
        'rem_select_label': 'रिमाइंडर का समय चुनें:',
        'rem_help': 'आप प्रत्येक दिन के लिए रिमाइंडर समय निर्धारित कर रहे हैं। ये समय 7 दिनों तक प्रतिदिन दोहराए जाएंगे।',
        'rem_note': '• हल्की सूचना • कोई अलार्म नहीं • 7 दिनों तक चलता है • कभी भी बंद करें',
        'rem_msg': 'आपके 1-2 मिनट के डिजिटल ब्रेक का समय हो गया है। अपनी आँखों और मन को आराम दें।',
        'rem_disclaimer': 'यह एक वेलनेस रिमाइंडर है, चिकित्सा चेतावनी नहीं।',

        // Payment Screen
        'bio_title': 'आपका बायो-रिदम',
        'bio_sub': 'व्यक्तिगत डिजिटल अनुभव',
        'res_color': 'रंग कुंजी',
        'res_sound': 'ध्वनि कुंजी',
        'res_req': 'आवश्यक सत्र:',
        'btn_unlock': 'पूरी एक्सेस अनलॉक करें @ ₹178',
        'pay_note': 'एकमुश्त भुगतान • कोई समय-सीमा नहीं • कभी भी उपयोग करें',
        'btn_recalc': '← पुनर्गणना / परिवर्तन',

        // Session Flow
        'sess_prog': 'सत्र चल रहा है…<br>अपनी आँखों और मन को आराम दें।',
        'comp_title': 'ब्रेक पूरा हुआ',
        'comp_sub': 'आपका डिजिटल ब्रेक पूरा हो गया है। आशा है आप हल्का और शांत महसूस कर रहे होंगे।',
        'comp_dur': 'सत्र अवधि:',
        'comp_used': 'उपयोग किए गए मिनट:',
        'comp_bal': 'शेष मिनट:',
        'comp_msg': 'नियमित रूप से छोटे ब्रेक लेने से आप स्क्रीन पर संतुलित रह सकते हैं।',
        'comp_thank': 'सिनांक डिजिटल ब्रेक लेने के लिए धन्यवाद।',
        'play_stay_msg': 'कृपया सत्र पूरा होने तक इस स्क्रीन पर बने रहें।',
        'btn_again': 'एक और ब्रेक लें',
        'btn_home': 'होम पर वापस जाएं',
        'btn_recharge': 'SSB रिचार्ज करें – ₹178',

        // Warnings
        'low_bal_title': 'लो बैलेंस',
        'low_bal_msg': 'आपके SSB मिनट कम हो रहे हैं। कृपया अपने ब्रेक का ध्यानपूर्वक उपयोग करें।',
        'no_bal_title': 'कोई मिनट शेष नहीं',
        'no_bal_msg': 'आपके SSB मिनट समाप्त हो गए हैं। डिजिटल ब्रेक जारी रखने के लिए रिचार्ज करें।',

        // Seller Dashboard
        'seller_prog': 'डिस्ट्रीब्यूटर पैनल',
        'auth_access': 'अधिकृत वितरण एक्सेस',
        'your_mobile': 'आपका मोबाइल नंबर',
        'btn_verify': 'सत्यापित करें',
        'back_home': '← वापस होम पर जाएं',
        'join_net': 'पार्टनर रजिस्ट्रेशन',
        'join_desc': 'हम पहले प्रोडक्ट खुद उपयोग करवाते हैं, उसके बाद ही किसी को बेचने का अधिकार देते हैं।',
        'lbl_fullname': 'पूरा नाम',
        'ph_yourname': 'पूनम शर्मा',
        'i_satisfy': 'मैं सिनांक मोबाइल थेरेपी (SMT) का उपयोग कर चुका/चुकी हूँ और संतुष्ट हूँ।',
        'btn_activate': 'पैनल एक्टिवेट करें',
        'term_title': 'अधिकृत विक्रेता समझौता',
        'term_1': '1. स्वतंत्र स्थिति: आप एक स्वतंत्र अधिकृत विक्रेता हैं, SINAANK के कर्मचारी नहीं।',
        'term_2': '2. केवल प्रत्यक्ष बिक्री: आपको केवल व्यक्तिगत बिक्री पर कमीशन मिलता है। यह कोई MLM या पिरामिड स्कीम नहीं है।',
        'term_3': '3. कमीशन: प्रत्येक सत्यापित बिक्री के लिए आपको "सेलर क्रेडिट्स" मिलते हैं। टीडीएस (TDS) नियम लागू।',
        'term_4': '4. कोई गलत बयानी नहीं: यह प्रोडक्ट "वेलनेस और रिलैक्सेशन" टूल है, चिकित्सा इलाज नहीं।',
        'term_5': '5. एंटी-स्पैम: आप सहमति के बिना किसी को संदेश नहीं भेजेंगे।',
        'term_6': '6. समाप्ति: नियमों का उल्लंघन करने पर सेलर स्टेटस रद्द किया जा सकता है।',
        'btn_close': 'बंद करें',

        // SMP & Dashboard (New)
        'smp_title': 'सिनांक मनी प्लांट',
        'smp_sales': 'कुल बिक्री',
        'smp_earn': 'अनुमानित आय',
        'smp_up_title': '🌟 SMP में अपग्रेड करें',
        'smp_up_desc': 'पात्रता (5+ बिक्री)। सिनांक मनी प्लांट स्टेटस के लिए आवेदन करें।',

        'smp_elite_title': 'एलीट स्टेटस अनलॉक',
        'smp_elite_desc': 'आपने <span style="color:#ffd700; font-weight:bold;">5+ बिक्री</span> पूरी कर ली है।<br>अब <span style="color:#ffd700;">शून्य निवेश बिजनेस पार्टनर</span> बनने के लिए आवेदन करें।',
        'smp_elite_btn': 'SMP के लिए आवेदन करें',

        'smp_form_title': 'SMP आवेदन',
        'smp_lbl_applicant': 'आवेदक की पहचान',
        'smp_lbl_address': 'शिपिंग पता',
        'smp_lbl_pincode': 'पिन कोड',
        'smp_lbl_aadhar': 'आधार (अंतिम 4)',
        'smp_lbl_photo': 'पार्टनर फोटो (सेल्फी)',
        'smp_lbl_photo_desc': 'अपने आईडी कार्ड के लिए स्पष्ट, पेशेवर फोटो अपलोड करें।',
        'smp_lbl_use_def': 'सिस्टम अवतार का उपयोग करें (केवल परीक्षण के लिए)',
        'smp_btn_cancel': 'रद्द करें',
        'smp_btn_submit': 'आवेदन जमा करें',

        'smp_apply': 'अभी आवेदन करें',
        'smp_ctrl_title': '🌿 SMP नियंत्रण',
        'smp_btn_manual': '+ पेड एंट्री',
        'smp_btn_edit': '✎ नाम बदलें',
        'smp_net_title': 'आपका नेटवर्क',
        'smp_gold_copy': 'लिंक<br>कॉपी करें',
        'smp_gold_paid': 'पेड<br>एंट्री',
        'smp_gold_edit': 'नाम<br>बदलें',
        'smp_support': 'संपर्क सहायता',
        'smp_demo': 'SMP डेमो शुरू करें',
        'smp_m_app': 'SMP आवेदन',
        'smp_ph_addr': 'पूरा पता',
        'smp_ph_pin': 'पिनकोड (6 अंक)',
        'smp_ph_aad': 'आधार (12 अंक)',
        'smp_l_photo': 'फोटो (सेल्फी):',
        'smp_use_def': 'सिस्टम डिफॉल्ट इमेज का उपयोग करें',
        'btn_cancel': 'रद्द करें',
        'btn_submit': 'जमा करें',
        'smp_m_man': 'मैनुअल पेड एंट्री',
        'smp_ph_mob': 'मोबाइल नंबर',
        'smp_ph_usr': 'उपयोगकर्ता का नाम',
        'btn_add': 'एंट्री जोड़ें',
        'smp_m_edit': 'नाम बदलें',

        // Partner Dashboard (Internal) - REMOVED/REPLACED
        // 'dash_title': 'SELLER DASHBOARD',
        // 'dash_sub': 'अधिकृत पार्टनर पैनल',
        'btn_logout': 'लॉगआउट',
        'sec_summary': 'पार्टनर का सारांश',
        'lbl_seller_name': 'विक्रेता का नाम',
        'lbl_seller_id': 'विक्रेता आईडी',
        'lbl_earn': 'कुल कमाई',
        'lbl_sales': 'बेचे गए किट',
        'lbl_active': 'सक्रिय उपयोगकर्ता',
        'lbl_active': 'सक्रिय उपयोगकर्ता',
        'lbl_pending': 'लंबित उपयोगकर्ता',

        // Dashboard Accordion
        'acc_balance': 'बैलेंस चेक करें (Check Balance)',
        'acc_slots': 'मेरे डिवाइस / स्लॉट्स (Mobile Slots)',
        'acc_break': 'डिजिटल ब्रेक शुरू करें (Start Break)',
        'acc_reminder': 'रिमाइंडर सेट करें (Daily Reminder)',
        'sensitive_info': 'संवेदनशील जानकारी (पिन/भुगतान) छिपी हुई है',
        'sec_buyers': 'खरीदार सूची',
        'no_sales': 'अभी कोई बिक्री नहीं हुई। अपना लिंक साझा करें!',
        'sec_support': 'सहायता / हेल्प डेस्क',
        'lbl_issue': 'समस्या का प्रकार',
        'opt_gen': 'सामान्य सहायता',
        'opt_pin': 'पिन बदलने का अनुरोध',
        'opt_slot': 'मोबाइल स्लॉट समस्या',
        'opt_pay': 'भुगतान भ्रम',
        'opt_other': 'अन्य',
        'lbl_msg': 'संदेश (व्यवस्थापक को दिखाई देगा)',
        'ph_msg': 'समस्या का वर्णन करें...',
        'btn_send': 'सहायता को भेजें',
        'msg_sent': '✓ संदेश FCC पैनल को भेजा गया',
        'flow_seller': 'विक्रेता<br>संदेश',
        'flow_admin': 'FCC / व्यवस्थापक<br>पैनल',
        'flow_reply': 'उत्तर<br>प्राप्त हुआ',
        'sec_security': '🔒 सुरक्षा और अनुपालन',
        'sec_security_msg': 'सुरक्षा कारणों से, उपयोगकर्ता पिन और भुगतान डेटा केवल FCC / व्यवस्थापक टीम द्वारा नियंत्रित किया जाता है। विक्रेता केवल वितरण और मार्गदर्शन के लिए अधिकृत हैं।',
        'btn_open_support': 'सहायता खोलें',

        // Dynamic Data (Added for partner.html JS)
        'kit_1': 'SMT बेस',
        'kit_2': 'SMT मिक्स',
        'kit_3': 'SMT फैमिली',
        'alert_logout': 'विक्रेता पैनल से लॉगआउट करें?',
        'alert_msg_empty': 'कृपया एक संदेश टाइप करें।',
        'alert_msg_sent': 'संदेश एडमिन पैनल को भेजा गया। जल्द ही उत्तर प्राप्त होगा।',

        // Login / Validation errors
        'err_mobile': 'अमान्य मोबाइल नंबर',
        'err_pin_len': '4-अंकीय पिन दर्ज करें',
        'err_pin_match': 'इस नंबर के लिए गलत पिन',

        // Alerts & Validation (Audit)
        'err_name_len': 'अमान्य नाम: कृपया कम से कम 3 अक्षर दर्ज करें।',
        'err_name_char': 'अमान्य नाम: केवल अक्षरों की अनुमति है।',
        'err_mobile_start': 'अमान्य मोबाइल नंबर। यह आमतौर पर 6, 7, 8 या 9 से शुरू होता है।',
        'err_mobile_zero': 'अमान्य मोबाइल: 0 से शुरू नहीं हो सकता।',
        'err_access_denied': 'एक्सेस अस्वीकार: इस मोबाइल नंबर के लिए गलत पिन।',
        'err_demo_mode': 'डेमो मोड सक्रिय',

        // Play Screen
        'play_left_ear': 'बायां कान',
        'play_right_ear': 'दायां कान',
        'play_initiate': 'सत्र शुरू करें',

        // Pricing Cards
        'kit_1_badge': 'व्यक्तिगत ब्रेक',
        'kit_1_desc': 'एक उपयोगकर्ता के लिए',
        'kit_2_badge': 'साझा बैलेंस',
        'kit_2_desc': 'जोड़ों के लिए सर्वश्रेष्ठ',
        'kit_3_badge': 'फैमिली वेलनेस पैक',
        'kit_3_desc': 'पूर्ण परिवार सुरक्षा',

        // Smart Slots
        'lbl_add_member': 'नया सदस्य जोड़ें',
        'ph_member_name': 'नाम (उदा. पत्नी)',
        'ph_member_mobile': 'mobile नंबर',
        'btn_add_now': 'अभी जोड़ें'
    }
};

let currentLang = 'hi';

function setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
        currentLang = lang;
        localStorage.setItem('ssb_lang', lang);

        // HINDI LINE HEIGHT RULE
        if (lang === 'hi') {
            document.body.classList.add('lang-hi');
        } else {
            document.body.classList.remove('lang-hi');
        }

        applyTranslations();
    }
}

function applyTranslations() {
    const texts = TRANSLATIONS[currentLang];
    document.querySelectorAll('[data-i18n], [data-i18n-ph]').forEach(element => {
        // Handle Inner HTML
        if (element.hasAttribute('data-i18n')) {
            const key = element.getAttribute('data-i18n');
            if (texts[key]) element.innerHTML = texts[key];
        }

        // Handle Placeholder
        if (element.hasAttribute('data-i18n-ph')) {
            const phKey = element.getAttribute('data-i18n-ph');
            if (texts[phKey]) element.setAttribute('placeholder', texts[phKey]);
        }
    });

    // Update Flag Buttons Manually if needed

}

function toggleLanguage(lang) {
    setLanguage(lang);

    // Update Buttons UI
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('btn-' + lang);
    if (activeBtn) activeBtn.classList.add('active');
}

// On Load
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ssb_lang') || 'hi';
    setLanguage(saved);
});
