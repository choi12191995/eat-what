/**
 * Fine-grained cuisine/venue tags (OpenRice-style) that Google's Table A
 * types cannot express — 茶餐廳, 潮州菜, 點心, 火鍋, 放題… Each tag maps to a
 * Text Search (New) query, biased to the draw origin, merged with the
 * type-based Nearby results and deduped by place id.
 *
 * Curation: from the OpenRice taxonomy, keeping tags that (a) describe a
 * restaurant you'd draw for a meal and (b) return solid Text Search results
 * in HK. Dropped: non-dining venues (網吧/卡拉OK/販賣機/網店/到會), seasonal
 * one-offs (賀年食品/蛇羹/大閘蟹), certifications with no searchable term
 * (無翅), and anything the type-based tier already covers as a whole cuisine.
 *
 * Labels live in i18n (`kw.<id>`, groups `kwGroup.<id>`); queries here are
 * locale-tuned because 茶餐廳-style terms search best in Chinese while the
 * English UI wants romanized queries.
 */
export interface KeywordTag {
  id: string
  emoji: string
  q: { 'zh-TW': string; en: string }
  /** Table A types that mean this tag — lets EXCLUSION catch places by type */
  types?: string[]
}

export interface KeywordGroup {
  id: string
  emoji: string
  tags: KeywordTag[]
}

/** Each selected tag costs one (cached) Text Search per draw — keep it tight. */
export const MAX_KEYWORD_TAGS = 3

export const KEYWORD_GROUPS: KeywordGroup[] = [
  {
    id: 'hk',
    emoji: '🇭🇰',
    tags: [
      { id: 'chaChaanTeng', emoji: '🍞', q: { 'zh-TW': '茶餐廳', en: 'cha chaan teng' } },
      { id: 'daiPaiDong', emoji: '🍳', q: { 'zh-TW': '大牌檔', en: 'dai pai dong' } },
      { id: 'twoDishRice', emoji: '🍱', q: { 'zh-TW': '兩餸飯', en: 'two dish rice' } },
      { id: 'roastMeat', emoji: '🍗', q: { 'zh-TW': '燒味 燒臘', en: 'hong kong roast meat siu mei' } },
      { id: 'congee', emoji: '🥣', q: { 'zh-TW': '粥品 粥店', en: 'congee' } },
      { id: 'dimSum', emoji: '🥟', q: { 'zh-TW': '點心 飲茶', en: 'dim sum' } },
      { id: 'cartNoodle', emoji: '🛒', q: { 'zh-TW': '車仔麵', en: 'cart noodles' } },
      { id: 'snackShop', emoji: '🍡', q: { 'zh-TW': '小食店 街頭小食', en: 'hong kong street snacks' } },
    ],
  },
  {
    id: 'regional',
    emoji: '🀄',
    tags: [
      { id: 'chiuChow', emoji: '🦆', q: { 'zh-TW': '潮州菜', en: 'chiu chow restaurant' } },
      { id: 'shunTak', emoji: '🐟', q: { 'zh-TW': '順德菜', en: 'shunde restaurant' } },
      { id: 'hakka', emoji: '🍘', q: { 'zh-TW': '客家菜', en: 'hakka restaurant' } },
      { id: 'shanghainese', emoji: '🥠', q: { 'zh-TW': '上海菜', en: 'shanghainese restaurant' } },
      { id: 'sichuan', emoji: '🌶️', q: { 'zh-TW': '川菜 四川菜', en: 'sichuan restaurant' } },
      { id: 'hunan', emoji: '🥵', q: { 'zh-TW': '湖南菜 湘菜', en: 'hunan restaurant' } },
      { id: 'beijing', emoji: '🏮', q: { 'zh-TW': '北京菜 京菜', en: 'peking restaurant' } },
      { id: 'northeastern', emoji: '❄️', q: { 'zh-TW': '東北菜', en: 'dongbei northeastern chinese restaurant' } },
      { id: 'xinjiang', emoji: '🍢', q: { 'zh-TW': '新疆菜', en: 'xinjiang restaurant' } },
    ],
  },
  {
    id: 'jpkr',
    emoji: '🎌',
    tags: [
      { id: 'omakase', emoji: '🍣', q: { 'zh-TW': '廚師發辦 omakase', en: 'omakase' } },
      { id: 'ramen', emoji: '🍜', q: { 'zh-TW': '拉麵', en: 'ramen' }, types: ['ramen_restaurant'] },
      { id: 'izakaya', emoji: '🏮', q: { 'zh-TW': '居酒屋', en: 'izakaya' } },
      { id: 'yakiniku', emoji: '🥩', q: { 'zh-TW': '日式燒肉', en: 'yakiniku' } },
      { id: 'teppanyaki', emoji: '🔥', q: { 'zh-TW': '鐵板燒', en: 'teppanyaki' } },
      { id: 'koreanFriedChicken', emoji: '🍗', q: { 'zh-TW': '韓式炸雞', en: 'korean fried chicken' } },
    ],
  },
  {
    id: 'hotpotGrill',
    emoji: '🫕',
    tags: [
      { id: 'hotpot', emoji: '🫕', q: { 'zh-TW': '火鍋 打邊爐', en: 'hot pot' } },
      { id: 'chickenPot', emoji: '🐔', q: { 'zh-TW': '雞煲', en: 'chicken hot pot 雞煲' } },
      { id: 'skewers', emoji: '🍢', q: { 'zh-TW': '串燒', en: 'skewers yakitori' } },
      { id: 'allYouCanEat', emoji: '🍽️', q: { 'zh-TW': '放題 任食', en: 'all you can eat' } },
      { id: 'buffet', emoji: '🥂', q: { 'zh-TW': '自助餐', en: 'buffet' } },
    ],
  },
  {
    id: 'noodleWorks',
    emoji: '🍜',
    tags: [
      { id: 'riceNoodles', emoji: '🍜', q: { 'zh-TW': '米線', en: 'mixian rice noodles' } },
      { id: 'wonton', emoji: '🥟', q: { 'zh-TW': '雲吞麵', en: 'wonton noodles' } },
    ],
  },
  {
    id: 'special',
    emoji: '✨',
    tags: [
      { id: 'privateKitchen', emoji: '🔒', q: { 'zh-TW': '私房菜', en: 'private kitchen' } },
      { id: 'fineDining', emoji: '🍾', q: { 'zh-TW': 'fine dining 高級餐廳', en: 'fine dining' } },
      { id: 'hotelDining', emoji: '🏨', q: { 'zh-TW': '酒店餐廳', en: 'hotel restaurant' } },
      { id: 'curry', emoji: '🍛', q: { 'zh-TW': '咖喱', en: 'curry restaurant' } },
      { id: 'allDayBreakfast', emoji: '🍳', q: { 'zh-TW': '全日早餐 all day breakfast', en: 'all day breakfast' } },
      { id: 'dessertSoup', emoji: '🍧', q: { 'zh-TW': '糖水舖 中式甜品', en: 'chinese dessert soup tong sui' } },
      { id: 'halal', emoji: '☪️', q: { 'zh-TW': '清真餐廳 halal', en: 'halal restaurant' } },
      { id: 'themed', emoji: '🎠', q: { 'zh-TW': '主題餐廳', en: 'themed restaurant' } },
      { id: 'kidFriendly', emoji: '👶', q: { 'zh-TW': '親子餐廳', en: 'family friendly restaurant kids' } },
    ],
  },
]

const tagById = new Map<string, KeywordTag>(
  KEYWORD_GROUPS.flatMap((g) => g.tags).map((t) => [t.id, t]),
)

export function keywordTagById(id: string): KeywordTag | undefined {
  return tagById.get(id)
}

const stripPattern = /[\s·・,，。()（）【】\-–—'']/g

function normalized(s: string): string {
  return s.toLowerCase().replace(stripPattern, '')
}

const hasCjk = (s: string) => /[㐀-鿿]/.test(s)

/**
 * Does a place LOOK like this tag? Used by keyword EXCLUSION (opt-out), which
 * can't run a search — it matches by name terms, Table A types, and the
 * diner's own diary craving tags. Term rules guard against generic-word false
 * positives: the zh query splits into alternatives (火鍋／打邊爐), the en query
 * matches only as a whole compound ("hotpot", never "hot"). Heuristic by
 * nature: a hotpot place with an oblique name and no diary tag slips through —
 * that's the honest limit.
 */
export function matchesKeywordTag(
  place: { name: string; types: string[] },
  tag: KeywordTag,
  diaryKeywords?: readonly string[],
): boolean {
  if (diaryKeywords?.includes(tag.id)) return true
  if (tag.types?.some((t) => place.types.includes(t))) return true
  const name = normalized(place.name)
  const terms = [...tag.q['zh-TW'].split(' ').map(normalized), normalized(tag.q.en)]
  return terms
    .filter((term) => (hasCjk(term) ? term.length >= 2 : term.length >= 4))
    .some((term) => name.includes(term))
}
