import { extraRows } from './vocab-extra.js';

// [written form, kana reading, English, category]
// If the written form equals the kana, the word has no kanji.
const rows = [
  // people
  ['私', 'わたし', 'I, me', 'people'], ['友達', 'ともだち', 'friend', 'people'], ['先生', 'せんせい', 'teacher', 'people'],
  ['学生', 'がくせい', 'student', 'people'], ['家族', 'かぞく', 'family', 'people'], ['父', 'ちち', 'my father', 'people'],
  ['母', 'はは', 'my mother', 'people'], ['子供', 'こども', 'child', 'people'], ['男', 'おとこ', 'man', 'people'], ['女', 'おんな', 'woman', 'people'],
  // time
  ['今日', 'きょう', 'today', 'time'], ['昨日', 'きのう', 'yesterday', 'time'], ['明日', 'あした', 'tomorrow', 'time'],
  ['毎日', 'まいにち', 'every day', 'time'], ['今', 'いま', 'now', 'time'], ['午前', 'ごぜん', 'morning, a.m.', 'time'],
  ['午後', 'ごご', 'afternoon, p.m.', 'time'], ['来週', 'らいしゅう', 'next week', 'time'], ['先月', 'せんげつ', 'last month', 'time'],
  ['去年', 'きょねん', 'last year', 'time'], ['時間', 'じかん', 'time, hours', 'time'], ['朝', 'あさ', 'morning', 'time'], ['夜', 'よる', 'night', 'time'],
  // places
  ['学校', 'がっこう', 'school', 'places'], ['会社', 'かいしゃ', 'company', 'places'], ['駅', 'えき', 'station', 'places'],
  ['病院', 'びょういん', 'hospital', 'places'], ['銀行', 'ぎんこう', 'bank', 'places'], ['図書館', 'としょかん', 'library', 'places'],
  ['部屋', 'へや', 'room', 'places'], ['店', 'みせ', 'shop', 'places'], ['町', 'まち', 'town', 'places'], ['国', 'くに', 'country', 'places'],
  ['日本', 'にほん', 'Japan', 'places'], ['外国', 'がいこく', 'foreign country', 'places'], ['公園', 'こうえん', 'park', 'places'],
  // nature
  ['山', 'やま', 'mountain', 'nature'], ['川', 'かわ', 'river', 'nature'], ['海', 'うみ', 'sea', 'nature'], ['雨', 'あめ', 'rain', 'nature'],
  ['天気', 'てんき', 'weather', 'nature'], ['花', 'はな', 'flower', 'nature'], ['空', 'そら', 'sky', 'nature'], ['木', 'き', 'tree', 'nature'],
  // things
  ['本', 'ほん', 'book', 'things'], ['車', 'くるま', 'car', 'things'], ['電話', 'でんわ', 'telephone', 'things'], ['電車', 'でんしゃ', 'train', 'things'],
  ['お金', 'おかね', 'money', 'things'], ['写真', 'しゃしん', 'photograph', 'things'], ['手紙', 'てがみ', 'letter', 'things'],
  ['かばん', 'かばん', 'bag', 'things'], ['かさ', 'かさ', 'umbrella', 'things'], ['机', 'つくえ', 'desk', 'things'], ['時計', 'とけい', 'clock, watch', 'things'],
  ['映画', 'えいが', 'movie', 'things'], ['名前', 'なまえ', 'name', 'things'], ['言葉', 'ことば', 'word, language', 'things'],
  // food
  ['水', 'みず', 'water', 'food'], ['お茶', 'おちゃ', 'tea', 'food'], ['肉', 'にく', 'meat', 'food'], ['魚', 'さかな', 'fish', 'food'],
  ['野菜', 'やさい', 'vegetable', 'food'], ['果物', 'くだもの', 'fruit', 'food'], ['卵', 'たまご', 'egg', 'food'], ['ご飯', 'ごはん', 'meal, cooked rice', 'food'],
  ['パン', 'パン', 'bread', 'food'], ['牛乳', 'ぎゅうにゅう', 'milk', 'food'],
  // verbs
  ['食べる', 'たべる', 'to eat', 'verbs'], ['飲む', 'のむ', 'to drink', 'verbs'], ['見る', 'みる', 'to see, watch', 'verbs'],
  ['聞く', 'きく', 'to listen, ask', 'verbs'], ['読む', 'よむ', 'to read', 'verbs'], ['書く', 'かく', 'to write', 'verbs'],
  ['話す', 'はなす', 'to speak', 'verbs'], ['行く', 'いく', 'to go', 'verbs'], ['来る', 'くる', 'to come', 'verbs'], ['帰る', 'かえる', 'to return home', 'verbs'],
  ['買う', 'かう', 'to buy', 'verbs'], ['会う', 'あう', 'to meet', 'verbs'], ['起きる', 'おきる', 'to get up', 'verbs'], ['寝る', 'ねる', 'to sleep', 'verbs'],
  ['働く', 'はたらく', 'to work', 'verbs'], ['休む', 'やすむ', 'to rest, be absent', 'verbs'], ['勉強する', 'べんきょうする', 'to study', 'verbs'],
  ['教える', 'おしえる', 'to teach, tell', 'verbs'], ['待つ', 'まつ', 'to wait', 'verbs'], ['歩く', 'あるく', 'to walk', 'verbs'],
  ['使う', 'つかう', 'to use', 'verbs'], ['住む', 'すむ', 'to live (reside)', 'verbs'], ['入る', 'はいる', 'to enter', 'verbs'], ['出る', 'でる', 'to go out, exit', 'verbs'],
  // adjectives
  ['大きい', 'おおきい', 'big', 'adjectives'], ['小さい', 'ちいさい', 'small', 'adjectives'], ['高い', 'たかい', 'tall, expensive', 'adjectives'],
  ['安い', 'やすい', 'cheap', 'adjectives'], ['新しい', 'あたらしい', 'new', 'adjectives'], ['古い', 'ふるい', 'old (things)', 'adjectives'],
  ['長い', 'ながい', 'long', 'adjectives'], ['多い', 'おおい', 'many', 'adjectives'], ['少ない', 'すくない', 'few', 'adjectives'],
  ['忙しい', 'いそがしい', 'busy', 'adjectives'], ['楽しい', 'たのしい', 'fun', 'adjectives'], ['難しい', 'むずかしい', 'difficult', 'adjectives'],
  ['おいしい', 'おいしい', 'delicious', 'adjectives'], ['暑い', 'あつい', 'hot (weather)', 'adjectives'], ['寒い', 'さむい', 'cold (weather)', 'adjectives'],
  ['静か', 'しずか', 'quiet', 'adjectives'], ['元気', 'げんき', 'healthy, energetic', 'adjectives'], ['有名', 'ゆうめい', 'famous', 'adjectives'],
  ['好き', 'すき', 'liked, favorite', 'adjectives'], ['きれい', 'きれい', 'pretty, clean', 'adjectives'],
  // directions & misc
  ['上', 'うえ', 'above, on', 'misc'], ['下', 'した', 'below, under', 'misc'], ['中', 'なか', 'inside', 'misc'], ['右', 'みぎ', 'right', 'misc'],
  ['左', 'ひだり', 'left', 'misc'], ['前', 'まえ', 'front, before', 'misc'], ['後ろ', 'うしろ', 'behind', 'misc'], ['外', 'そと', 'outside', 'misc'],
];

// Homographs (same written form, different reading or meaning) would make questions ambiguous, so the first wins.
const seen = new Set();
const unique = [...rows, ...extraRows].filter(([ja]) => !seen.has(ja) && seen.add(ja));

export const vocab = unique.map(([ja, kana, en, cat], i) => ({
  id: i + 1, ja, kana, en, cat, hasKanji: ja !== kana,
}));
