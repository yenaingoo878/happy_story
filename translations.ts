
import { Language } from './types';

export const translations = {
  // App General
  greeting: { en: "Hello", mm: "မင်္ဂလာပါ" },
  latest_arrival: { en: "Latest Arrival", mm: "အသစ်ရောက်ရှိ" },
  create_story: { en: "Create Story", mm: "ပုံပြင်ဖန်တီးမယ်" },
  start: { en: "Start", mm: "စရန်" },
  current_height: { en: "Current Height", mm: "လက်ရှိအရပ်" },
  current_weight: { en: "Current Weight", mm: "လက်ရှိ ပေါင်ချိန်" },
  memories: { en: "Memories", mm: "အမှတ်တရများ" },
  see_all: { en: "See All", mm: "အားလုံးကြည့်ရန်" },
  
  // Auth
  welcome_title: { en: "Little Moments", mm: "Little Moments" },
  welcome_subtitle: { en: "Capture your child's precious journey.", mm: "သင့်ကလေး၏ ကြီးထွားမှုအဆင့်ဆင့်ကို မှတ်တမ်းတင်လိုက်ပါ။" },
  signin_google: { en: "Sign in with Google", mm: "Google ဖြင့် ဝင်ရောက်ရန်" },
  logging_in: { en: "Signing in...", mm: "ဝင်ရောက်နေပါသည်..." },
  logout: { en: "Log Out", mm: "အကောင့်ထွက်မည်" },
  email: { en: "Email", mm: "အီးမေးလ်" },
  password: { en: "Password", mm: "စကားဝှက်" },
  sign_in: { en: "Sign In", mm: "အကောင့်ဝင်မည်" },
  sign_up: { en: "Sign Up", mm: "အကောင့်သစ်ဖွင့်မည်" },
  or_email: { en: "Or continue with email", mm: "အီးမေးလ်ဖြင့် ဆက်လက်ဆောင်ရွက်မည်" },
  no_account: { en: "Don't have an account?", mm: "အကောင့်မရှိဘူးလား?" },
  have_account: { en: "Already have an account?", mm: "အကောင့်ရှိပြီးသားလား?" },
  auth_error: { en: "Authentication failed. Please check your credentials.", mm: "အကောင့်ဝင်မရပါ။ အချက်အလက်များ ပြန်စစ်ဆေးပါ။" },

  // Navigation
  nav_home: { en: "Home", mm: "ပင်မ" },
  nav_story: { en: "Story", mm: "ပုံပြင်" },
  nav_create: { en: "New", mm: "အသစ်" },
  nav_growth: { en: "Growth", mm: "ဖွံ့ဖြိုးမှု" },
  nav_gallery: { en: "Gallery", mm: "ဓာတ်ပုံ" },
  nav_settings: { en: "Settings", mm: "ဆက်တင်" },

  // Add/Edit Memory
  add_memory_title: { en: "Add New Memory", mm: "အမှတ်တရအသစ်ထည့်မယ်" },
  edit_memory_title: { en: "Edit Memory", mm: "အမှတ်တရ ပြင်ဆင်ရန်" },
  choose_photo: { en: "Choose Photo", mm: "ဓာတ်ပုံရွေးချယ်ပါ" },
  form_title: { en: "Title", mm: "ခေါင်းစဉ်" },
  form_title_placeholder: { en: "e.g., Day at the pool", mm: "ဥပမာ - ရေကူးကန်သွားတဲ့နေ့" },
  form_desc: { en: "Description", mm: "အကြောင်းအရာ" },
  form_desc_placeholder: { en: "What happened today...", mm: "ဒီနေ့ ဘာတွေထူးခြားလဲ..." },
  record_btn: { en: "Save Memory", mm: "မှတ်တမ်းတင်မယ်" },
  update_btn: { en: "Update Memory", mm: "ပြင်ဆင်မှု သိမ်းဆည်းမယ်" },
  cancel_btn: { en: "Cancel", mm: "မလုပ်တော့ပါ" },
  date_label: { en: "Date", mm: "နေ့စွဲ" },

  // Story Generator
  story_title: { en: "Bedtime Story", mm: "အိပ်ရာဝင် ပုံပြင်" },
  story_subtitle: { en: "Create stories using AI", mm: "AI ကိုအသုံးပြုပြီး ပုံပြင်လေးတွေ ဖန်တီးပါ" },
  story_card_title: { en: "Let's create a story", mm: "ပုံပြင်လေး ဖန်တီးမယ်" },
  story_card_desc: { en: "Enter a topic and let AI tell a story.", mm: "အကြောင်းအရာလေး ရိုက်ထည့်ပြီး AI ကို ပုံပြင်ပြောခိုင်းကြည့်ရအောင်။" },
  child_name: { en: "CHILD NAME", mm: "ကလေးနာမည်" },
  child_name_placeholder: { en: "e.g., Maung Maung", mm: "ဥပမာ - မောင်မောင်" },
  topic_label: { en: "STORY TOPIC", mm: "ပုံပြင်အကြောင်းအရာ" },
  topic_placeholder: { en: "e.g., A rabbit going to the moon...", mm: "ဥပမာ - ယုန်ကလေး နဲ့ လိပ်ကလေး ပြေးပွဲ..." },
  generate_btn: { en: "Generate Story", mm: "ပုံပြင်ဖန်တီးမယ်" },
  thinking: { en: "Thinking...", mm: "စဉ်းစားနေသည်..." },
  result_title: { en: "Generated Story", mm: "ရရှိလာသော ပုံပြင်" },

  // Growth Chart
  growth_title: { en: "Growth Record", mm: "ကြီးထွားမှု မှတ်တမ်း" },
  growth_subtitle: { en: "Height and Weight Chart", mm: "အရပ် နှင့် ကိုယ်အလေးချိန် ဇယား" },
  growth_tracker: { en: "Growth Tracker", mm: "ဖွံ့ဖြိုးမှု မှတ်တမ်း (Growth Tracker)" },
  analyze_btn: { en: "Analyze Growth with AI", mm: "AI ဖြင့် ကြီးထွားမှုကို ဆန်းစစ်ရန်" },
  ai_insight: { en: "AI Insight", mm: "AI အကြံပြုချက်" },
  analyzing: { en: "Analyzing...", mm: "ဆန်းစစ်နေသည်..." },
  months_label: { en: "Months", mm: "လ (Months)" },
  height_label: { en: "Height", mm: "အရပ်" },
  weight_label: { en: "Weight", mm: "ကိုယ်အလေးချိန်" },
  disclaimer: { en: "* Not based on standard WHO Child Growth Standards, for reference only.", mm: "* Standard WHO Child Growth Standards အပေါ်အခြေခံထားခြင်းမရှိပါ၊ ကိုးကားရန်သာ။" },

  // Gallery
  gallery_title: { en: "Photo Gallery", mm: "ဓာတ်ပုံပြခန်း" },
  gallery_subtitle: { en: "Precious Moments", mm: "အမှတ်တရ ပုံရိပ်လွှာများ" },
  no_photos: { en: "No photos yet", mm: "ဓာတ်ပုံများ မရှိသေးပါ" },

  // Settings
  settings_title: { en: "Settings", mm: "ဆက်တင်များ" },
  settings_subtitle: { en: "Preferences & Profile", mm: "အသုံးပြုသူ နှင့် ကလေးအချက်အလက်" },
  about_child: { en: "Child Profile", mm: "ကလေးအချက်အလက်" },
  app_settings: { en: "App Preferences", mm: "App ဆက်တင်များ" },
  data_management: { en: "Data Management", mm: "အချက်အလက် စီမံခန့်ခွဲမှု" },
  
  // New Profile Fields
  child_name_label: { en: "Child's Name", mm: "ကလေးအမည်" },
  child_dob: { en: "Date of Birth", mm: "မွေးသက္ကရာဇ်" },
  birth_time: { en: "Time of Birth", mm: "မွေးဖွားချိန်" },
  blood_type: { en: "Blood Type", mm: "သွေးအမျိုးအစား" },
  gender_label: { en: "Gender", mm: "ကျား/မ" },
  boy: { en: "Boy", mm: "သားသား" },
  girl: { en: "Girl", mm: "မီးမီး" },
  hospital_name: { en: "Hospital", mm: "မွေးဖွားရာဆေးရုံ" },
  city_label: { en: "City", mm: "မြို့" },
  country_label: { en: "Country", mm: "နိုင်ငံ" },
  
  hospital_placeholder: { en: "e.g. City Hospital", mm: "ဥပမာ - ဗဟိုအမျိုးသမီးဆေးရုံ" },
  location_placeholder: { en: "e.g. Yangon", mm: "ဥပမာ - ရန်ကုန်" },
  country_placeholder: { en: "e.g. Myanmar", mm: "ဥပမာ - မြန်မာ" },
  
  save_changes: { en: "Save Changes", mm: "သိမ်းဆည်းမည်" },
  language: { en: "Language", mm: "ဘာသာစကား" },
  theme: { en: "Dark Mode", mm: "အမှောင်မုဒ် (Dark Mode)" },
  back: { en: "Back", mm: "ပြန်ထွက်" },
  
  // Manage Data
  manage_growth: { en: "Growth Records", mm: "ကြီးထွားမှုမှတ်တမ်း" },
  growth_input_title: { en: "Add/Edit Record", mm: "မှတ်တမ်း အသစ်/ပြင်ဆင်" },
  add_record: { en: "Save Record", mm: "မှတ်တမ်းတင်မည်" },
  update_record: { en: "Update", mm: "ပြင်ဆင်မည်" },
  month: { en: "Month", mm: "လ" },
  cm: { en: "cm", mm: "စင်တီမီတာ" },
  kg: { en: "kg", mm: "ကီလို" },
  manage_memories: { en: "Memories List", mm: "အမှတ်တရများ စာရင်း" },
  delete: { en: "Delete", mm: "ဖျက်မည်" },
  edit: { en: "Edit", mm: "ပြင်မည်" },
  confirm_delete: { en: "Are you sure you want to delete this?", mm: "ဤအမှတ်တရကို ဖျက်ရန် သေချာပါသလား?" },

  // Security
  private_info: { en: "Private Details", mm: "ကိုယ်ရေးအချက်အလက်များ" },
  locked_msg: { en: "Details are locked", mm: "အချက်အလက်များကို ပိတ်ထားပါသည်" },
  tap_to_unlock: { en: "Tap to view", mm: "ကြည့်ရှုရန် နှိပ်ပါ" },
  enter_passcode: { en: "Enter Passcode", mm: "လျှို့ဝှက်နံပါတ် ရိုက်ထည့်ပါ" },
  create_passcode: { en: "Create Passcode", mm: "လျှို့ဝှက်နံပါတ် အသစ်သတ်မှတ်ပါ" },
  confirm: { en: "Confirm", mm: "အတည်ပြုမည်" },
  wrong_passcode: { en: "Incorrect passcode", mm: "လျှို့ဝှက်နံပါတ် မှားယွင်းနေပါသည်" },
  hide_details: { en: "Hide Details", mm: "ပြန်ဖွက်ထားမည်" },
  
  // Security Management
  security_title: { en: "Security", mm: "လုံခြုံရေး" },
  change_passcode: { en: "Change Passcode", mm: "လျှို့ဝှက်နံပါတ် ပြောင်းမည်" },
  remove_passcode: { en: "Turn off Passcode", mm: "လျှို့ဝှက်နံပါတ် ဖြုတ်မည်" },
  enter_old_passcode: { en: "Enter Current PIN", mm: "လက်ရှိနံပါတ် ရိုက်ထည့်ပါ" },
  enter_new_passcode: { en: "Enter New PIN", mm: "နံပါတ်အသစ် ရိုက်ထည့်ပါ" },
  setup_passcode: { en: "Setup Passcode", mm: "လျှို့ဝှက်နံပါတ် သတ်မှတ်မည်" }
};

export const getTranslation = (lang: Language, key: keyof typeof translations) => {
  return translations[key][lang];
};
