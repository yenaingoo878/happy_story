import { Memory, GrowthData } from './types';

export const MOCK_MEMORIES: Memory[] = [
  {
    id: '1',
    childId: 'main',
    title: 'ပထမဆုံး လမ်းလျှောက်တဲ့နေ့',
    date: '2023-10-15',
    description: 'ဒီနေ့ သားသားလေး ပထမဆုံး ခြေလှမ်းစလှမ်းတယ်။ အရမ်းဝမ်းသာစရာကောင်းတဲ့ နေ့တစ်နေ့ပါပဲ။',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    tags: ['First Steps', 'Milestone']
  },
  {
    id: '2',
    childId: 'main',
    title: 'ကမ်းခြေခရီးစဉ်',
    date: '2023-12-20',
    description: 'သမီးလေး ပင်လယ်ကို ပထမဆုံးမြင်ဖူးတာ။ သဲတွေနဲ့ ကစားရတာ အရမ်းပျော်နေတယ်။',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    tags: ['Travel', 'Beach']
  },
  {
    id: '3',
    childId: 'main',
    title: 'ပထမဆုံး မွေးနေ့',
    date: '2024-01-10',
    description: 'ပျော်ရွှင်စရာ မွေးနေ့လေး။ ကိတ်မုန့်တွေ အများကြီး စားခဲ့တယ်။',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    tags: ['Birthday', 'Party']
  }
];

export const MOCK_GROWTH_DATA: GrowthData[] = [
  { childId: 'main', month: 1, height: 54, weight: 4.5 },
  { childId: 'main', month: 2, height: 58, weight: 5.6 },
  { childId: 'main', month: 3, height: 61, weight: 6.4 },
  { childId: 'main', month: 4, height: 63, weight: 7.0 },
  { childId: 'main', month: 5, height: 66, weight: 7.5 },
  { childId: 'main', month: 6, height: 68, weight: 8.0 },
  { childId: 'main', month: 9, height: 72, weight: 9.2 },
  { childId: 'main', month: 12, height: 76, weight: 10.5 },
];