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
  
  // Navigation
  nav_home: { en: "Home", mm: "ပင်မ" },
  nav_story: { en: "Story", mm: "ပုံပြင်" },
  nav_create: { en: "New", mm: "အသစ်" },
  nav_growth: { en: "Growth", mm: "ဖွံ့ဖြိုးမှု" },
  nav_gallery: { en: "Gallery", mm: "ဓာတ်ပုံ" },

  // Add Memory
  add_memory_title: { en: "Add New Memory", mm: "အမှတ်တရအသစ်ထည့်မယ်" },
  choose_photo: { en: "Choose Photo", mm: "ဓာတ်ပုံရွေးချယ်ပါ" },
  form_title: { en: "Title", mm: "ခေါင်းစဉ်" },
  form_title_placeholder: { en: "e.g., Day at the pool", mm: "ဥပမာ - ရေကူးကန်သွားတဲ့နေ့" },
  form_desc: { en: "Description", mm: "အကြောင်းအရာ" },
  form_desc_placeholder: { en: "What happened today...", mm: "ဒီနေ့ ဘာတွေထူးခြားလဲ..." },
  record_btn: { en: "Save Memory", mm: "မှတ်တမ်းတင်မယ်" },

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
  months_label: { en: "Months", mm: "လ (Months)" },
  height_label: { en: "Height", mm: "အရပ်" },
  weight_label: { en: "Weight", mm: "ကိုယ်အလေးချိန်" },
  disclaimer: { en: "* Not based on standard WHO Child Growth Standards, for reference only.", mm: "* Standard WHO Child Growth Standards အပေါ်အခြေခံထားခြင်းမရှိပါ၊ ကိုးကားရန်သာ။" },

  // Gallery
  gallery_title: { en: "Photo Gallery", mm: "ဓာတ်ပုံပြခန်း" },
  gallery_subtitle: { en: "Precious Moments", mm: "အမှတ်တရ ပုံရိပ်လွှာများ" },
  no_photos: { en: "No photos yet", mm: "ဓာတ်ပုံများ မရှိသေးပါ" },
};

export const getTranslation = (lang: Language, key: keyof typeof translations) => {
  return translations[key][lang];
};