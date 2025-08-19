
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// --- Type Declarations ---
interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  interface Window {
    google: any;
  }
}

interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const appContainer = document.getElementById('app') as HTMLElement;
const googleSignInButton = document.getElementById('google-signin-button') as HTMLDivElement;

// User Profile Elements
const userProfileEl = document.getElementById('user-profile') as HTMLDivElement;
const userNameEl = document.getElementById('user-name') as HTMLSpanElement;
const userAvatarEl = document.getElementById('user-avatar') as HTMLImageElement;
const signOutBtn = document.getElementById('signout-btn') as HTMLButtonElement;


const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const recordBtnIcon = recordBtn.querySelector('svg') as SVGElement;
const playModelBtn = document.getElementById('play-model-btn') as HTMLButtonElement;
const sentenceInputEl = document.getElementById('sentence-input') as HTMLTextAreaElement;
const clearSentenceBtn = document.getElementById('clear-sentence-btn') as HTMLButtonElement;
const resultsSection = document.getElementById('results-section') as HTMLElement;
const loader = document.getElementById('loader') as HTMLElement;
const resultsContent = document.getElementById('results-content') as HTMLElement;

// Result display elements
const pronunciationScoreEl = document.getElementById('pronunciation-score') as HTMLParagraphElement;
const fluencyScoreEl = document.getElementById('fluency-score') as HTMLParagraphElement;
const intonationScoreEl = document.getElementById('intonation-score') as HTMLParagraphElement;
const pronunciationGaugeEl = document.getElementById('pronunciation-gauge') as HTMLDivElement;
const fluencyGaugeEl = document.getElementById('fluency-gauge') as HTMLDivElement;
const intonationGaugeEl = document.getElementById('intonation-gauge') as HTMLDivElement;
const transcriptionTextEl = document.getElementById('transcription-text') as HTMLDivElement;
const adviceTextEl = document.getElementById('advice-text') as HTMLParagraphElement;

// Overall Score Elements
const overallProgressCircle = document.getElementById('overall-progress-circle') as unknown as SVGCircleElement;
const overallScoreValueEl = document.getElementById('overall-score-value') as HTMLSpanElement;

// Sentence Modal Elements
const selectSentenceBtn = document.getElementById('select-sentence-btn') as HTMLButtonElement;
const sentenceModal = document.getElementById('sentence-modal') as HTMLDivElement;
const closeModalBtn = document.getElementById('close-modal-btn') as HTMLButtonElement;
const factbookListEl = document.getElementById('factbook-list') as HTMLDivElement;
const mywayListEl = document.getElementById('myway-list') as HTMLDivElement;
const modalTabs = document.querySelectorAll('.modal-tab-btn');
const modalTabContents = document.querySelectorAll('.modal-tab-content');


// --- App State ---
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecording = false;
let isLoading = false;
let currentUser: UserProfile | null = null;


const micIcon = `<path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>`;
const stopIcon = `<path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z"/>`;

// --- Factbook Data ---
const factbookContentData = {
    "chapter1": {
        title: "第1章 文型（1）",
        sections: [
            {
                sentences: [
                    { en: "My computer froze.", ja: "私のコンピューターがフリーズした。" },
                    { en: "My father swims really well.", ja: "私の父は泳ぐのが本当に上手だ。" },
                    { en: "My cousin is an engineer.", ja: "私のいとこはエンジニアです。" },
                    { en: "My father is shy.", ja: "父は内気です。" },
                    { en: "You look happy.", ja: "楽しそうですね。" },
                    { en: "He read an interesting book.", ja: "彼は興味深い本を読んだ。" },
                    { en: "Ellie has beautiful eyes.", ja: "エリーは美しい目をしている。" },
                ]
            }
        ]
    },
    "chapter2": {
        title: "第2章 文型（2）",
        sections: [
            {
                sentences: [
                    { en: "Can you give me your phone number?", ja: "あなたの電話番号を（教えて）くれませんか。" },
                    { en: "My parents bought me a nice sweater.", ja: "両親は私にすてきなセーターを買ってくれた。" },
                    { en: "She gave this book to me.", ja: "彼女はこの本を，私にくれました。" },
                    { en: "We call him Jimmy.", ja: "私たちは彼をジミーと呼ぶ。" },
                    { en: "I'll make you happy.", ja: "君を幸せにしてあげるよ。" },
                    { en: "The door opened.", ja: "ドアが開いた。" },
                    { en: "He opened the door.", ja: "彼はドアを開けた。" },
                    { en: "The sun rises in the east.", ja: "太陽は東から上がる。" },
                    { en: "He raised his hand.", ja: "彼は手を上げた。" },
                    { en: "We discussed the matter.", ja: "私たちはその問題について話し合った。" },
                    { en: "I complained to him.", ja: "私は彼に文句を言った。" },
                ]
            },
        ]
    },
     "plus_bunkei": {
        title: "Plus 文型",
        sections: [
            {
                sentences: [
                    { en: "Study hard.", ja: "一生懸命勉強しなさい。" },
                    { en: "Be quiet.", ja: "静かにしなさい。" },
                    { en: "Don't talk during the test.", ja: "テスト中に話をするな。" },
                    { en: "Don't be nervous. You'll be fine.", ja: "弱気になるな。だいじょうぶだから。" },
                    { en: "Let's order pizza tonight.", ja: "今晩，ピザ頼もうよ。" },
                    { en: "Mommy, there is a dog at the door.", ja: "ママ，犬がドアのところにいるよ。" },
                    { en: "What a nice camera you have!", ja: "君はなんてすてきなカメラを持っているのだろう。" },
                    { en: "How fast he runs!", ja: "彼はなんて速く走るのだろう。" },
                ]
            }
        ]
    },
    "chapter3": {
        title: "第3章 時を表す表現（1）",
        sections: [
            {
                sentences: [
                    { en: "I am a student.", ja: "私は学生です。" },
                    { en: "I know three languages.", ja: "私は３つの言語を知っています。" },
                    { en: "The earth goes around the sun.", ja: "地球は太陽の周りを回っている。" },
                    { en: "My dad takes the first train every day.", ja: "私の父は毎日，始発電車に乗ります。" },
                    { en: "It started raining.", ja: "雨が降り始めた。" },
                    { en: "My father played golf when he was younger.", ja: "私の父は今より若い頃，ゴルフをしていた。" },
                    { en: "I am planning a trip to London.", ja: "私はロンドンへの旅行を計画しているところです。" },
                    { en: "They were chatting with Lucy at that time.", ja: "そのとき，彼らはルーシーとおしゃべりしていました。" },
                ]
            }
        ]
    },
    "chapter4": {
        title: "第4章 時を表す表現（2）",
        sections: [
            {
                sentences: [
                    { en: "Take an umbrella because it will rain later.", ja: "傘をもっていきなさい。あとで雨になるから。" },
                    { en: "OK, I'll phone her right away.", ja: "わかった。すぐに彼女に電話を入れるよ。" },
                    { en: "It's going to rain soon.", ja: "もうすぐ雨になるよ。" },
                    { en: "Are you going to have a party?", ja: "あなたはパーティーをするつもりですか。" },
                    { en: "I'm seeing a movie with Keiko on Thursday.", ja: "私は木曜日にケイコと映画を見る予定です。" },
                    { en: "My birthday is next Tuesday.", ja: "私の誕生日は来週の火曜日です。" },
                    { en: "What time does this train arrive at Tokyo Station?", ja: "この電車は何時に東京駅に到着しますか。" },
                    { en: "I'll be playing tennis at three.", ja: "私は３時にはテニスをすることになっています。" },
                ]
            }
        ]
    },
    "chapter5": {
        title: "第5章 完了形（1）",
        sections: [
            {
                sentences: [
                    { en: "I have finished it.", ja: "私はそれを終えてしまった。" },
                    { en: "He has finished it.", ja: "彼はそれを終えてしまった。" },
                    { en: "Have you finished it?", ja: "あなたはそれを終えてしまいましたか？" },
                    { en: "I have not finished it.", ja: "私はそれを終えていない。" },
                    { en: "Look! It's stopped raining.", ja: "見て！　雨がやんだわ。" },
                    { en: "I've eaten wild deer.", ja: "私は野生の鹿を食べたことがある。" },
                    { en: "We've been to Universal Studios in Los Angeles.", ja: "私たちはロサンゼルスのユニバーサルスタジオに行ったことがあります。" },
                    { en: "We've been teammates for three years.", ja: "私たちは３年間ずっとチームメートです。" },
                    { en: "I've lived in Tokyo since 2014.", ja: "私は2014年から東京に住んでいます。" },
                    { en: "Where's Mom? ─ She's gone to the hair salon.", ja: "お母さんはどこ？ ―― 美容室に行ったよ。" },
                    { en: "Don't worry. I've cleaned your room.", ja: "だいじょうぶ。あなたの部屋を掃除しておいたわよ。" },
                ]
            },
        ]
    },
    "chapter6": {
        title: "第6章 完了形（2）",
        sections: [
            {
                sentences: [
                    { en: "The game had already started when I got to the stadium.", ja: "その試合は私がスタジアムに着いたときには，すでに始まっていました。" },
                    { en: "I had never used a smartphone before I bought one this year.", ja: "今年買う前は，私はスマートフォンを使ったことがありませんでした。" },
                    { en: "They had known each other for seven years before they got married.", ja: "彼らは結婚する前に７年間，知り合いだったんですよ。" },
                    { en: "I knew the ending of the movie because I had read the book.", ja: "私は本を読んでいたから，映画のエンディングを知っていました。" },
                    { en: "I will have finished my homework by ten.", ja: "私は10 時までには宿題を終わらせていますよ。" },
                    { en: "I've been cleaning my room since this morning.", ja: "私は今朝からずっと自分の部屋を掃除し続けているんです。" },
                ]
            }
        ]
    },
    "chapter7": {
        title: "第7章 助動詞（１）",
        sections: [
            {
                sentences: [
                    { en: "You must finish this report on time.", ja: "あなたたちはこのレポートを時間どおりに仕上げなければいけません。" },
                    { en: "You mustn't do that! You'll break the window.", ja: "それをやっちゃだめだ！ 窓を割ってしまうよ。" },
                    { en: "The injury isn't serious? You must be relieved!", ja: "ケガは大したことないの？ ホッとしたでしょう！" },
                    { en: "May I come in?", ja: "入ってよろしいでしょうか。" },
                    { en: "We may go to Spain this summer.", ja: "私たちは今年の夏，スペインに行くかもしれません。" },
                    { en: "It will rain tomorrow.", ja: "明日は雨になるでしょう。" },
                    { en: "Accidents will happen.", ja: "事故は起こるものだ。" },
                    { en: "My dad would often take us fishing.", ja: "父はよく私たちを釣りに連れていってくれたものだった。" },
                    { en: "I'll give you a hand.", ja: "私が手伝ってあげますよ。" },
                ]
            }
        ]
    },
    "chapter8": {
        title: "第8章 助動詞（2）",
        sections: [
            {
                sentences: [
                    { en: "Kenji can run 100 meters in 11 seconds.", ja: "ケンジは100メートルを11秒で走ることができます。" },
                    { en: "You can use my eraser.", ja: "私の消しゴムを使ってもいいよ。" },
                    { en: "Tokyo can be very cold in April.", ja: "東京は４月にとても寒くなることがある。" },
                    { en: "That can't be true.", ja: "それは本当のはずがない。" },
                    { en: "You should be more careful with your money.", ja: "あなたはお金にもっと気をつけるべきです。" },
                    { en: "I should be able to get to the restaurant by seven.", ja: "私はレストランには７時までには着けるはずですよ。" },
                    { en: "Shall I help you?", ja: "お手伝いしましょうか。" },
                    { en: "Shall we dance?", ja: "ダンスしましょうよ。" },
                ]
            }
        ]
    },
    "chapter9": {
        title: "第9章 助動詞（3）",
        sections: [
            {
                sentences: [
                    { en: "You'd better call an ambulance!", ja: "救急車を呼んだほうがいいよ！" },
                    { en: "I used to live in Gunma.", ja: "私は以前，群馬に住んでいました。" },
                    { en: "This would be my eighth trip to Kyoto.", ja: "これで８回目の京都旅行になるのだろうな。" },
                    { en: "Can you give me a hand?", ja: "手伝ってくれる？" },
                    { en: "Could[Would] you open the window?", ja: "窓を開けていただけますか。" },
                    { en: "Something may have happened to her.", ja: "彼女に何かあったのかもしれない。" },
                    { en: "They must have lost their way.", ja: "彼らは道に迷ったにちがいない。" },
                    { en: "I could have left my smartphone at home.", ja: "私は家にスマートフォンを忘れたかもしれない。" },
                    { en: "He can't have said that.", ja: "彼がそんなことを言ったわけがない。" },
                    { en: "My mom should have arrived home by now.", ja: "お母さんは今頃，家に着いているはずですよ。" },
                    { en: "I should have studied harder.", ja: "私はもっと一生懸命勉強すべきだった。" },
                ]
            },
        ]
    },
    "chapter10": {
        title: "第10章 受動態（１）",
        sections: [
            {
                sentences: [
                    { en: "John was attacked by the dog.", ja: "ジョンはその犬に襲われた。" },
                    { en: "English is spoken all over the world.", ja: "英語は世界中で話されている。" },
                    { en: "We have been invited to Hiro's New Year's party.", ja: "私たちはヒロの新年会に呼ばれています。" },
                    { en: "A new cafeteria is being built at our school.", ja: "私たちの学校では新しいカフェテリアが建てられているところです。" },
                    { en: "Our school sports day will be held next Sunday.", ja: "私たちの学校の運動会は来週の日曜日に開催されます。" },
                    { en: "Is French spoken in Canada?", ja: "カナダでフランス語は話されていますか。" },
                    { en: "When was Botchan written by Natsume Soseki?", ja: "いつ『坊ちゃん』は夏目漱石によって書かれましたか。" },
                    { en: "Some questions weren't answered by the teacher.", ja: "いくつかの質問は先生に答えてもらえなかった。" },
                    { en: "I was born and raised in London.", ja: "私はロンドンで生まれ育ちました。" },
                ]
            }
        ]
    },
    "chapter11": {
        title: "第11章 受動態（2）",
        sections: [
            {
                sentences: [
                    { en: "My brother was injured in a skiing accident.", ja: "私の兄はスキーの事故でけがをした。" },
                    { en: "We were surprised at the news.", ja: "私たちはそのニュースを聞いて驚いた。" },
                    { en: "Our science club was given an award.", ja: "私たちの科学クラブが賞を与えられた。" },
                    { en: "An award was given to our science club.", ja: "賞が私たちの科学クラブに与えられた。" },
                    { en: "Christopher is called Chris by his friends.", ja: "クリストファーは友人にクリスと呼ばれている。" },
                    { en: "I was brought up in a big family.", ja: "私は大家族で育てられました。" },
                    { en: "Jericho is said to be the oldest city in the world.", ja: "ジェリコは世界で最も古い都市だと言われている。" },
                    { en: "It is said that Jericho is the oldest city in the world.", ja: "ジェリコは世界で最も古い都市だと言われている。" },
                ]
            },
        ]
    },
    "chapter12": {
        title: "第12章 不定詞（1）",
        sections: [
            {
                sentences: [
                    { en: "To make new friends is not so easy.", ja: "新しい友だちを作ることはそれほど簡単ではありません。" },
                    { en: "I like to play video games with my friends.", ja: "私は友だちとテレビゲームをするのが好きです。" },
                    { en: "To see is to believe.", ja: "見ることは信じることである。（＝百聞は一見に如かず）" },
                    { en: "It's not so easy to make new friends.", ja: "新しい友だちを作ることはそれほど簡単ではありません。" },
                    { en: "I think it strange to put pineapple on a pizza.", ja: "私はピザにパイナップルを載せるのは変だと思います。" },
                    { en: "I have many teachers to help me.", ja: "私には手助けをしてくれる多くの先生がいる。" },
                    { en: "I have a lot of homework to do.", ja: "私にはやるべき宿題がたくさんある。" },
                    { en: "I have two hamsters to look after.", ja: "私には世話をすべき２匹のハムスターがいる。" },
                    { en: "I don't have time to relax.", ja: "私にはリラックスできる時間がありません。" },
                ]
            }
        ]
    },
    "chapter13": {
        title: "第13章 不定詞（2）",
        sections: [
            {
                sentences: [
                    { en: "Many Japanese students go to Australia to practice English.", ja: "多くの日本人学生は，英語を練習するためにオーストラリアに行きます。" },
                    { en: "My parents were delighted to hear about my excellent grades.", ja: "両親は私の良い成績を聞いて大喜びした。" },
                    { en: "He grew up to be a famous singer.", ja: "彼は成長して有名な歌手になった。" },
                    { en: "She must be rich to buy such an expensive car.", ja: "そんなに高い車を買うなんて，彼女はお金持ちにちがいない。" },
                    { en: "Try not to think too much.", ja: "考えすぎないようにしなさい。" },
                    { en: "I saw Mary cross the street.", ja: "私はメアリーが通りを渡るのを見た。" },
                    { en: "The movie made me cry.", ja: "その映画を見て私は泣いてしまった。" },
                ]
            }
        ]
    },
    "chapter14": {
        title: "第14章 不定詞（3）",
        sections: [
            {
                sentences: [
                    { en: "My parents always tell me to study harder.", ja: "両親はいつも，私にもっと一生懸命勉強をしなさいと言います。" },
                    { en: "I want her to stay with us.", ja: "私は彼女に私たちと一緒にいてほしい。" },
                    { en: "You are to be here by 7 a.m.", ja: "午前7時までにここに集合すること。" },
                    { en: "The president is to visit Japan next week.", ja: "大統領は来週，訪日の予定です。" },
                    { en: "He came to realize the importance of teamwork.", ja: "彼はチームワークの重要性を理解するようになった。" },
                    { en: "She seems to be happy in her new school.", ja: "彼女は新しい学校で楽しそうだ。" },
                    { en: "Lucy seems to have been sick.", ja: "ルーシーは体調が悪かったみたいですね。" },
                    { en: "I'm sorry to have missed your birthday party.", ja: "あなたの誕生日パーティーに行けなくてすみません。" },
                ]
            }
        ]
    },
    "plus_futeishi": { // Renamed for valid ID
        title: "Plus 文型",
        sections: [
            {
                sentences: [
                    { en: "I don't know what to say.", ja: "なんて言っていいのか私はわかりません。" },
                    { en: "Tell me when to start.", ja: "いつスタートすればいいのか私に教えてね。" },
                    { en: "I know where to find them.", ja: "私はどこで彼らが見つかるのか知っています。" },
                    { en: "She is sure to win.", ja: "彼女は必ず勝つ。" },
                    { en: "He is easy to please.", ja: "彼を喜ばせるのは簡単です。" },
                    { en: "OK. I'm ready to go.", ja: "オーケー。出発の準備ができました。" },
                    { en: "I have enough money to buy a new smartphone.", ja: "私は新しいスマートフォンを買うのに十分なお金をもっています。" },
                    { en: "Are you old enough to drive a car?", ja: "あなたは運転できる年齢ですか。" },
                    { en: "I was too sad to speak.", ja: "私は悲しすぎて口がきけなかった。" },
                    { en: "To tell the truth, I didn't study for the test.", ja: "実を言うと（本当のことを言うと），私はテストのための勉強をしませんでした。" },
                    { en: "To be honest, I don't like pizza.", ja: "正直に言って，私はピザが好きではありません。" },
                ]
            },
        ]
    },
    "chapter15": {
        title: "第15章 動名詞（１）",
        sections: [
            {
                sentences: [
                    { en: "Making new friends is not so easy.", ja: "新しい友だちを作ることはそれほど簡単ではありません。" },
                    { en: "I like playing video games with my friends.", ja: "私は友だちとテレビゲームをするのが好きです。" },
                    { en: "My hobby is collecting stamps.", ja: "私の趣味は切手を集めることです。" },
                    { en: "Ken is good at playing baseball.", ja: "ケンは野球をするのが得意です。" },
                    { en: "My mother doesn't like me playing video games.", ja: "母は私がテレビゲームをするのが好きではない。" },
                    { en: "I hope to see you again.", ja: "またお目にかかりたく存じます。" },
                    { en: "Just stop calling me.", ja: "とにかく私に電話するのをやめてよ。" },
                    { en: "Remember to lock the door when you go out.", ja: "外出するときはドアに鍵をかけるのを忘れないように。" },
                    { en: "I remember meeting her at a party.", ja: "私は彼女とパーティーで会ったことを覚えています。" },
                ]
            },
        ]
    },
    "chapter16": {
        title: "第16章 動名詞（2）",
        sections: [
            {
                sentences: [
                    { en: "Not wearing a helmet on a bike is dangerous.", ja: "ヘルメットをつけないで自転車に乗るのは危険です。" },
                    { en: "I'm proud of having been a student at this school.", ja: "私はこの学校の生徒だったことを誇りに思っている。" },
                    { en: "Nobody likes being scolded.", ja: "誰も怒られるのは好きではない。" },
                    { en: "I'm looking forward to seeinng you next month.", ja: "来月あなたと会うのを楽しみにしています。" },
                    { en: "My mom is used to getting up early.", ja: "私の母は早起きすることに慣れている。" },
                    { en: "I can't help laughing at his jokes.", ja: "私は彼の冗談に笑わずにはいられない。" },
                    { en: "It's no use regretting your decision.", ja: "自分の決断を後悔してもむだだ。" },
                    { en: "There is no telling who will win the gold medal.", ja: "誰が金メダルをとるかは断言できない。" },
                    { en: "I don't feel like watching a movie tonight.", ja: "私は今晩映画を見る気にならない。" },
                    { en: "How about having Thai food for lunch?", ja: "昼食にタイ料理を食べるのはどう？" },
                    { en: "Her new book is worth reading.", ja: "彼女の新刊は読む価値があるよ。" },
                    { en: "A bad cold prevented her from going to the concert.", ja: "ひどい風邪のせいで彼女はコンサートに行けなかった。" },
                ]
            }
        ]
    },
    "chapter17": {
        title: "第17章 分詞（1）",
        sections: [
            {
                sentences: [
                    { en: "The man eating popcorn is my friend Bill.", ja: "ポップコーンを食べている男性は，友人のビルです。" },
                    { en: "The things stolen were not so valuable.", ja: "盗まれたものはそれほど高価ではなかった。" },
                    { en: "This is the picture painted by my father.", ja: "これは父が描いた絵です。" },
                    { en: "The baby kept crying.", ja: "赤ちゃんは泣き続けた。" },
                    { en: "My racket got broken during the match.", ja: "私のラケットが試合中に壊れた。" },
                    { en: "Sorry to keep you waiting.", ja: "あなたを待たせてごめんね。" },
                    { en: "Keep the door locked.", ja: "ドアに鍵をかけておきなさい。" },
                    { en: "I saw Mary crossing the street.", ja: "私はメアリーが通りを渡るのを見た。" },
                    { en: "I saw a boy scolded by his father.", ja: "私は少年が父親に叱られているのを見た。" },
                    { en: "I had my hair cut yesterday.", ja: "昨日髪をカットしてもらったよ。" },
                    { en: "It's difficult to make myself understood in English.", ja: "英語で意思を伝えるのはむずかしい。" },
                ]
            },
        ]
    },
    "chapter18": {
        title: "第18章 分詞（2）",
        sections: [
            {
                sentences: [
                    { en: "I spent all morning cleaning up my room.", ja: "私は部屋の片づけをして午前中ずっと過ごした。" },
                    { en: "I was busy doing my homework.", ja: "私は宿題をするのに忙しかった。" },
                    { en: "A bird came flying into the classroom.", ja: "一羽の鳥が教室の中に飛んできた。" },
                    { en: "My daughter came home disappointed.", ja: "私の娘はがっかりして家に帰ってきた。" },
                    { en: "She accepted the prize, smiling happily.", ja: "彼女はうれしそうにほほ笑みながら，賞品を受け取った。" },
                    { en: "She left a note on the door, finding nobody home.", ja: "誰も家にいなかったので，彼女はドアに置き手紙をした。" },
                    { en: "The captain scored a goal, putting the team into the finals.", ja: "キャプテンがゴールを決めて，チームを決勝に進めた。" },
                    { en: "Feeling really hungry, I ate half a dozen donuts.", ja: "お腹が本当にすいて，私ドーナツを６個も食べちゃったよ。" },
                    { en: "Pleased by her test result, she jumped for joy!", ja: "テストの結果がうれしくて，彼女はとび上がって喜んだ。" },
                ]
            }
        ]
    },
    "plus_bunshi": { // Renamed for valid ID
        title: "Plus 分詞",
        sections: [
            {
                sentences: [
                    { en: "Not wanting to be late, she took a taxi.", ja: "遅刻したくなかったので，彼女はタクシーに乗った。" },
                    { en: "Having visited New York before, she knew the good restaurants.", ja: "以前ニューヨークを訪れたことがあったので，彼女はおいしいレストランを知っていました。" },
                    { en: "Today being my sister's birthday, I bought her some chocolates.", ja: "今日は妹の誕生日なので，私は彼女にチョコレートを買ってあげました。" },
                    { en: "I listened to the music with my heart beating.", ja: "私は心を高鳴らせながらその曲を聞いた。" },
                    { en: "She prayed for peace with her eyes closed.", ja: "彼女は目を閉じて平和を祈った。" },
                    { en: "Judging from the sky, it's going to snow tonight.", ja: "空模様から判断すると，今夜は雪が降るね。" },
                    { en: "Compared to Tokyo, San Francisco is a small city.", ja: "東京に比べると，サンフランシスコは小さな都市です。" },
                ]
            },
        ]
    },
    "chapter19": {
        title: "第19章 比較（1）",
        sections: [
            {
                sentences: [
                    { en: "Tom is as tall as Mary.", ja: "トムはメアリーと同じくらいの背の高さだ。" },
                    { en: "She speaks as naturally as a native speaker.", ja: "彼女はネイティブ・スピーカーと同じくらい自然に話す。" },
                    { en: "I'm not as tall as him.", ja: "私は彼ほど背が高くない。" },
                    { en: "Our new cafeteria is twice as large as the old one.", ja: "私たちの新しいカフェテリアは以前のものの２倍の広さだ。" },
                    { en: "I have as many CDs as Ken.", ja: "私はケンと同じくらいの数のCDをもっている。" },
                    { en: "Follow me. This way is quicker.", ja: "ついておいで。こっちの道のほうが早いよ。" },
                    { en: "Please drive more slowly.", ja: "もっとゆっくり運転してください。" },
                    { en: "I became taller than him.", ja: "僕は彼よりも背が高くなった。" },
                    { en: "Fruit is much cheaper in my country than in Japan.", ja: "果物は日本よりも私の国のほうがはるかに安い。" },
                    { en: "Sue is three years younger than me.", ja: "スーは私よりも３歳若い。" },
                ]
            }
        ]
    },
    "chapter20": {
        title: "第20章 比較（2）",
        sections: [
            {
                sentences: [
                    { en: "Oh, that's the best idea.", ja: "ああ，それは最高のアイデアですね。" },
                    { en: "Who speaks English the most fluently in your family?", ja: "家族で誰が一番英語をすらすら話しますか。" },
                    { en: "Tom is the tallest in his class.", ja: "トムはクラスでもっとも背が高い。" },
                    { en: "Tom is the tallest of the three.", ja: "トムは３人のうち［全体で］もっとも背が高い。" },
                    { en: "This is by far the best restaurant in town.", ja: "これは断然，街で最高のレストランです。" },
                    { en: "K2 is the second highest mountain in the world.", ja: "K2は世界で２番目に高い山だ。" },
                    { en: "Boston is one of the oldest cities in the U.S.", ja: "ボストンはアメリカでもっとも古い都市の１つです。" },
                    { en: "This is the most moving film I've ever seen.", ja: "これはこれまで見た中でもっとも感動的な映画です。" },
                    { en: "No other mountain in Japan is as high as Mt. Fuji.", ja: "日本の（ほかの）どの山も富士山ほど高くない。" },
                    { en: "No other mountain in Japan is higher than Mt. Fuji.", ja: "日本の（ほかの）どの山も富士山より高くない。" },
                    { en: "Mt. Fuji is higher than any other mountain in Japan.", ja: "富士山は日本のほかのどの山よりも高い。" },
                ]
            },
        ]
    },
    "plus_hikaku": { // Renamed for valid ID
        title: "Plus 比較",
        sections: [
            {
                sentences: [
                    { en: "She visits her grandmother as often as three times a week.", ja: "彼女はおばあさんのところに週に３回も行っています。" },
                    { en: "OK, keep calm. I'll get there as fast as I can.", ja: "いいかい，落ち着いて。できるだけ早くそこに行くから。" },
                    { en: "Photography is not so much a job as a hobby for me.", ja: "写真撮影は私にとって仕事というよりはむしろ趣味です。" },
                    { en: "He is the taller of the two.", ja: "彼は２人のうちで背の高いほうだ。" },
                    { en: "This product is superior to that one.", ja: "この製品はあの製品よりも優れている。" },
                    { en: "Your English is getting better and better.", ja: "君の英語，どんどんよくなっているね。" },
                    { en: "The younger you are, the easier it is to learn.", ja: "若ければ若いほど，学ぶのは易しい。" },
                    { en: "This dictionary is less useful than that one.", ja: "この辞書はあの辞書ほど役に立たない。" },
                    { en: "The earth is no more than a little planet.", ja: "地球は小さな惑星にすぎない。" },
                    { en: "A house in that area costs no less than $500,000.", ja: "あの地域の家は50万ドルもする。" },
                    { en: "This is no more a Rolex than my toy watch is.", ja: "これは僕のおもちゃの時計と同じで，ロレックスなんかじゃないよ。" },
                    { en: "I'm no less confident than before, just because I didn't win.", ja: "試合に勝てなかったというだけで以前よりも自信を失ったわけじゃない。" },
                ]
            },
        ]
    },
    "chapter21": {
        title: "第21章 関係詞（1）",
        sections: [
            {
                sentences: [
                    { en: "I have a friend who wants to be an astronaut.", ja: "宇宙飛行士になりたい友だちがいます。" },
                    { en: "I like stories which have happy endings.", ja: "私はハッピーエンドの物語が好きです。" },
                    { en: "That is the man who I met on the train to Kyoto.", ja: "あの人が私が京都に行く電車で会った男性です。" },
                    { en: "The dress which Ann bought is so cute!", ja: "アンが買ったドレスはすごくかわいい！" },
                    { en: "I have a friend whose father is a lawyer.", ja: "私にはお父さんが弁護士をしている友だちがいます。" },
                ]
            }
        ]
    },
    "chapter22": {
        title: "第22章 関係詞（2）",
        sections: [
            {
                sentences: [
                    { en: "This is the hospital in which I was born.", ja: "これが私が生まれた病院です。" },
                    { en: "The woman that lives next door is an artist.", ja: "隣に住んでいる女性は芸術家です。" },
                    { en: "The car that I want to get is eco-friendly.", ja: "私が買いたい車は環境に配慮したものです。" },
                    { en: "The human is the only animal that uses fire.", ja: "人間は火を使う唯一の動物だ。" },
                    { en: "The car I want to get is eco-friendly.", ja: "私が買いたい車は環境に配慮したものです。" },
                    { en: "The man you were talking to is my cousin.", ja: "あなたが話していたのは私のいとこです。" },
                ]
            }
        ]
    },
    "chapter23": {
        title: "第23章 関係詞（3）",
        sections: [
            {
                sentences: [
                    { en: "Yokohama is the city where I was born.", ja: "横浜は私が生まれた都市だ。" },
                    { en: "Christmas is the day when the whole family gets together.", ja: "クリスマスは家族全員が集まる日です。" },
                    { en: "I don't know the reason why he got angry.", ja: "私は彼が腹を立てた理由がわかりません。" },
                    { en: "This is how I solved the problem.", ja: "これが私がその問題を解決したやり方です。" },
                    { en: "She has a son, who is a college student.", ja: "彼女には息子が1人いて，大学生なのです。" },
                    { en: "We stayed at the Grand Hotel, which some friends recommended to us.", ja: "私たちはグランドホテルに泊まりました。何人かの友だちが私たちに勧めてくれたところです。" },
                    { en: "I'm going to spend two weeks in New York, where my brother lives.", ja: "私はニューヨークに2週間滞在する予定です。そこには兄が住んでいます。" },
                    { en: "She is hardworking, which he is not.", ja: "彼女は努力家だが，彼はそうではない。" },
                ]
            }
        ]
    },
    "chapter24": {
        title: "第24章 パッケージ表現としての節（1）",
        sections: [
            {
                sentences: [
                    { en: "What he told me was a lie.", ja: "彼が私に言ったことはうそだった。" },
                    { en: "This story is what is called an urban legend.", ja: "この話はいわゆる都市伝説だ。" },
                    { en: "My hometown today is different from what it was 15 years ago.", ja: "今では私の故郷は15年前とは違っている。" },
                    { en: "My bike got a flat tire, and what was worse, it started to rain.", ja: "自転車がパンクして，さらに悪いことに雨が降りだした。" },
                    { en: "It's the best dish on the menu, and what is more, it's cheap.", ja: "それはメニューの中で一番の料理で，その上安い。" },
                    { en: "You can eat whatever you like.", ja: "何でも好きなものを食べていいよ。" },
                    { en: "Please choose whichever you need.", ja: "どれでも必要なものを選んでください。" },
                    { en: "I'll take you wherever you want to go.", ja: "あなたが行きたいところならどこにでも連れていくよ。" },
                    { en: "I'll be here for you whenever you need me.", ja: "あなたが私を必要なときはいつでもそばにいてあげげるよ。" },
                ]
            }
        ]
    },
    "chapter25": {
        title: "第25章 パッケージ表現としての節（2）",
        sections: [
            {
                sentences: [
                    { en: "Whoever I play against, I must win the next match.", ja: "対戦する相手が誰でも，私は次の試合に勝たなければなりません。" },
                    { en: "Whatever I say, he won't agree with me.", ja: "私が何を言おうとも，彼は私に賛成しないでしょう。" },
                    { en: "However hard I tried, I couldn't think of a good idea.", ja: "どんなに一生懸命頑張っても，よい考えを思いつきませんでした。" },
                    { en: "Whether I buy the racket will depend on the price.", ja: "そのラケットを買うかどうかは値段によります。" },
                    { en: "He asked me if I wanted to have lunch with him.", ja: "彼は私に昼食を一緒に食べたいかどうかを尋ねた。" },
                ]
            }
        ]
    },
    "chapter26": {
        title: "第26章 仮定法（1）",
        sections: [
            {
                sentences: [
                    { en: "If you practiced more, you would be a better player.", ja: "〈実際はあまり練習しないが〉もっと練習したら，あなたは今よりよい選手になれるのになあ。" },
                    { en: "If I were you, I wouldn't do such things.", ja: "もし私があなただったら，そんなことはしないだろう。" },
                    { en: "If you had asked me, I would have helped you.", ja: "もし私に頼んでくれたら，あなたを助けてあげたのに。" },
                    { en: "If you had followed my advice, you wouldn't be in trouble now.", ja: "もしあなたが私の助言に従っていたら，今困ったことにはなっていないだろうに。" },
                    { en: "I wish I had a brother.", ja: "〈実際はいないが〉弟がいたらなあ。" },
                    { en: "I wish I were rich.", ja: "〈実際はそうではないが〉お金持ちだったらなあ。" },
                    { en: "I have a stomachache. I wish I hadn't eaten so much chocolate!", ja: "おなかが痛い。〈実際には食べたのだが〉あんなにたくさんチョコレートを食べなければよかった！" },
                ]
            },
        ]
    },
    "chapter27": {
        title: "第27章 仮定法（2）",
        sections: [
            {
                sentences: [
                    { en: "Without my parents' support, I couldn't have graduated from college.", ja: "両親の援助がなかったら，私は大学を卒業することはできなかったろうな。" },
                    { en: "But for your help, I would have given up a long time ago.", ja: "君の助けがなかったら，ずいぶん前にあきらめていただろう。" },
                    { en: "Something strange is happening. Otherwise, he would not act like this.", ja: "何か妙なことが起こっている。そうでなければ彼がこんなふうに振る舞うわけはない。" },
                    { en: "Oh, if only Bob were here!", ja: "ああ，ボブがここにいたらなあ。" },
                    { en: "My brother talks as if he knew everything.", ja: "兄は何でも知っているかのように話す。" },
                    { en: "If it weren't for sports, my life would be pretty dull.", ja: "スポーツがなかったら，私の生活はかなり退屈なものになっていることだろう。" },
                    { en: "It's time we said good-bye.", ja: "お別れの時間です。" },
                    { en: "If you were to visit Japan in early April, you'd see the beautiful cherry blossoms.", ja: "もし4月の初めに日本に来るなら，美しい桜を見ることができるでしょうね。" },
                    { en: "If you should arrive at the theater before me, just wait at the entrance.", ja: "もし映画館に私より先に着くようなら，入口で待っていてね。" },
                ]
            }
        ]
    },
    "option1": { // Renamed for valid ID
        title: "Option① 否定",
        sections: [
            {
                sentences: [
                    { en: "Who ate my pudding? ─ Not me!", ja: "私のプリンを食べたのは誰？ ─ 僕じゃないよ！" },
                    { en: "This apartment is not for rent.", ja: "このアパートは賃貸用ではありません。" },
                    { en: "I don't really like your new car.", ja: "君の新しい車，それほど好きではないなあ。" },
                    { en: "I really don't like your new car.", ja: "君の新しい車，まったく好きではない。" },
                    { en: "It won't be long before Dad leaves the hospital.", ja: "まもなく父は退院するだろう。" },
                    { en: "She is not only talented but confident.", ja: "彼女は才能があるだけではなく自信にあふれている。" },
                    { en: "My teachers don't put me down but give me self-confidence.", ja: "先生たちは私を縮こまらせず自信を与えてくれる。" },
                    { en: "My uncle never comes to our house without bringing a present.", ja: "おじは我が家に来るときは必ずプレゼントを持ってくる。" },
                    { en: "She would be the last person to say something like that.", ja: "彼女はそんなことは絶対に言わない人だ。" },
                    { en: "Can't you find a job?", ja: "あなたは仕事を見つけられないの？" },
                    { en: "You speak English, don't you?", ja: "君は英語を話すよね？" },
                ]
            },
        ]
    },
    "option2": { // Renamed for valid ID
        title: "Option② さまざまな表現",
        sections: [
            {
                sentences: [
                    { en: "The news made us excited.", ja: "私たちはそのニュースを聞いてワクワクした。" },
                    { en: "The sign says you can't swim in the lake.", ja: "標識には湖で泳いではいけないとあります。" },
                    { en: "This road takes you to the stadium.", ja: "この道を行けばスタジアムに着きます。" },
                    { en: "Do help yourself to tea or coffee.", ja: "どうぞご自由に紅茶やコーヒーをお召し上がりくださいね。" },
                    { en: "What on earth is that?", ja: "いったい全体あれは何？" },
                    { en: "She doesn't eat any meat at all.", ja: "彼女は肉をまったく食べない。" },
                    { en: "I've heard that excuse again and again.", ja: "その言い訳は何度も聞いた。" },
                    { en: "It was my little sister that stepped on the cat yesterday.", ja: "昨日ネコふんじゃったのは、私の妹なんだよ。" },
                    { en: "I love banana pancakes. ─ So do I!", ja: "私はバナナパンケーキが大好きです。―私もだよ！" },
                    { en: "Never have I tasted such delicious sushi!", ja: "こんなおいしいお寿司を私は食べたことがない!" },
                    { en: "We heard a rumor that she was going to quit her job.", ja: "彼女が仕事を辞めるといううわさを私たちは聞いた。" },
                ]
            }
        ]
    },
    "option3": { // Renamed for valid ID
        title: "Option③ 話法",
        sections: [
            {
                sentences: [
                    { en: "He said, “It's rainy.”", ja: "彼は「雨が降っている」と言った。" },
                    { en: "He said it was rainy.", ja: "彼は，雨が降っていると言った。" },
                    { en: "He said, “It will be rainy.”", ja: "彼は「雨になるだろう」と言った。" },
                    { en: "He said it would be rainy.", ja: "彼は，雨になるだろうと言った。" },
                    { en: "He said, “It was rainy.”", ja: "彼は「雨だった」と言った。" },
                    { en: "He said it had been rainy.", ja: "彼は，雨だったと言った。" },
                    { en: "My dad said,“I'll lend you the money.”", ja: "父は「君にお金を貸してあげるよ」と言った。" },
                    { en: "My dad said he would lend me the money.", ja: "父は，私にお金を貸してくれると言った。" },
                    { en: "My brother called from Paris and said,“I'm leaving here tomorrow.”", ja: "兄はパリから電話をかけてきて「ここを明日出発するよ」って言いました。" },
                    { en: "My brother called from Paris and said he was leaving there the next day.", ja: "兄はパリから電話をかけてきて，そこを次の日出発すると言いました。" },
                    { en: "Ken said to me, “I am ready.”", ja: "ケンは私に「準備ができたよ」と言った。" },
                    { en: "Ken told me he was ready.", ja: "ケンは私に，準備ができたと言った。" },
                    { en: "She said to me,“Do you like the movie?”", ja: "彼女は私に「その映画は好きですか」と言った。" },
                    { en: "She asked me if I liked the movie.", ja: "彼女は私に，その映画が好きかどうか尋ねた。" },
                    { en: "She said to me,“Where do you live?”", ja: "彼女は私に「どこに住んでいるのですか」と言った。" },
                    { en: "She asked me where I lived.", ja: "彼女は私に，どこに住んでいるのか尋ねた。" },
                    { en: "My mom said to me,“Be back by ten.”", ja: "母は私に「10時までに帰りなさい」と言った。" },
                    { en: "My mom told me to be back by ten.", ja: "母は私に，10時までに帰るように言った。" },
                ]
            },
        ]
    },
    "option4": { // Renamed for valid ID
        title: "Option④ 限定詞",
        sections: [
            {
                sentences: [
                    { en: "There are some dogs in his garden.", ja: "彼の家の庭に数匹の犬がいる。" },
                    { en: "Choose any card.", ja: "どのカードでもいいから選んでください。" },
                    { en: "Do you have any questions?", ja: "何か質問はありますか。" },
                    { en: "All the spectators were delighted.", ja: "観客たちはみんな大喜びした。" },
                    { en: "Every participant will receive a prize.", ja: "すべての参加者に賞品が出ます。" },
                    { en: "She had a teacup in each hand.", ja: "彼女はそれぞれの手にティーカップを持っていた。" },
                    { en: "You can have both dresses.", ja: "両方のドレスを買ってあげます。" },
                    { en: "You can have either dress.", ja: "どちらかのドレスを買ってあげます。" },
                    { en: "You can have neither dress.", ja: "どちらのドレスも買えませんよ。" },
                    { en: "What do you think about this bag?", ja: "このバッグ，どう思う？" },
                    { en: "Whose is that red sports car over there?", ja: "向こうにあるあの赤いスポーツカーは誰のものですか。" },
                ]
            },
        ]
    },
    "option5": { // Renamed for valid ID
        title: "Option⑤ 代名詞",
        sections: [
            {
                sentences: [
                    { en: "We are happy.", ja: "私たちは幸せだ。" },
                    { en: "His arms are bigger than my legs!", ja: "彼の腕は私の脚より太い！" },
                    { en: "I know him.", ja: "私は彼のことを知っている。" },
                    { en: "Is this your tennis racket? ─ No, mine is on the bench.", ja: "これはあなたのテニスラケットですか。─ いえ，私のはベンチの上にあります。" },
                    { en: "Helen cut herself chopping carrots.", ja: "ヘレンは，ニンジンを切りながら指を切ってしまった。" },
                    { en: "How did you like the movie? ─ I liked it a lot.", ja: "その映画どうだった？─ とても気に入ったよ。" },
                    { en: "It's dark here.", ja: "ここ暗いね。" },
                    { en: "It's sunny today.", ja: "今日はいい天気だ。" },
                    { en: "It's Wednesday today.", ja: "今日は水曜日だ。" },
                    { en: "What time is it? ─ It's five o'clock now.", ja: "今何時ですか。 ─ ５時です。" },
                    { en: "It's five kilometers from here to the station.", ja: "ここから駅までは５キロあります。" },
                    { en: "My laptop is broken, so I need to buy a new one.", ja: "私のノートパソコンは壊れているから，新しいのを買う必要がある。" },
                ]
            },
        ]
    },
    "option6": { // Renamed for valid ID
        title: "Option⑥ 前置詞",
        sections: [
            {
                sentences: [
                    { en: "My favorite band is playing at the Budokan next week.", ja: "私の大好きなバンドが来週，武道館で演奏することになっている。" },
                    { en: "There's ice cream in the fridge.", ja: "アイスクリームが冷蔵庫の中にある。" },
                    { en: "Put your homework on my desk.", ja: "宿題は，私の机の上に置いてください。" },
                    { en: "I weigh about 58 kilos.", ja: "私の体重は約58キロです。" },
                    { en: "He gave a talk about cats.", ja: "彼は猫についての話をした。" },
                    { en: "I know a great bookshop by my school.", ja: "私の学校の近くにすごくいい書店を知っているよ。" },
                    { en: "I go to school by bicycle.", ja: "私は自転車で学校に通っています。" },
                    { en: "I need to finish this report by 11:00.", ja: "私は11時までにこのレポートを終えなければならない。" },
                    { en: "These chocolates are for you.", ja: "これらのチョコはあなたにです。" },
                    { en: "This is a special knife for making sashimi.", ja: "これは刺身用の特別な包丁なんですよ。" },
                    { en: "I jumped for joy when I passed the entrance exam.", ja: "私は入試に合格したとき，喜びで飛び上がった。" },
                    { en: "Are you for or against the plan?", ja: "あなたはこの計画に賛成ですか，それとも反対ですか。" },
                    { en: "Our flight leaves from Terminal 2.", ja: "私たちの航空便はターミナル２から出る。" },
                    { en: "the last chapter of the book", ja: "その本の最終章" },
                    { en: "Come and have lunch with us.", ja: "こっちに来て私たちとランチを食べようよ。" },
                    { en: "I ate the fish with chopsticks.", ja: "私はその魚をはしで食べた。" },
                ]
            },
        ]
    },
    "option7": { // Renamed for valid ID
        title: "Option⑦ 接続詞",
        sections: [
            {
                sentences: [
                    { en: "Jane and Nancy are best friends.", ja: "ジェーンとナンシーは親友だ。" },
                    { en: "I didn't use sun cream, so I got burned.", ja: "私は日焼け止めクリームを使わなかったので，日焼けしてしまった。" },
                    { en: "I like my new teacher but hate his jokes.", ja: "新任の先生は好きだけど，彼の言う冗談はごめんだ。" },
                    { en: "You can pay in cash, or you can use a credit card.", ja: "現金で支払うことも，あるいはクレジットカードを使うこともできます。" },
                    { en: "If you wait a few minutes, I'll give you a ride.", ja: "少し待ってくれれば，車に乗せて行ってあげますよ。" },
                    { en: "He asked me if I had time to talk.", ja: "彼は私に話をする時間があるか尋ねてきた。" },
                    { en: "I don't care if she dances with my boyfriend.", ja: "私は彼女が私のボーイフレンドとダンスをしても気にしません。" },
                    { en: "Because I didn't practice, I didn't play well.", ja: "私は練習しなかったので，上手にプレーできなかった。" },
                    { en: "Although[Though] he was injured, he kept on playing.", ja: "彼はケガをしていたが，プレーを続けた。" },
                    { en: "When I opened the door, a cat ran out.", ja: "私がドアを開けたとき，猫が飛び出してきた。" },
                ]
            }
        ]
    }
};

const myWayContentData = {
    myway1: {
        title: 'MY WAY Ⅰ',
        lessons: [
            {
                lessonTitle: 'Lesson 1: Proverbs Around the World',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'In my high school days, proverbs helped me a lot. They come from people’s common experiences and traditional knowledge. One famous proverb is “A friend in need is a friend indeed.” A true friend stands by you when you have trouble. Another proverb is “Where there is a will, there is a way.” When you do something, have a clear goal and work hard. Then you reach the goal in the end. Proverbs often encourage us when we need help. Proverbs enrich our lives.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'Proverbs often include animals.' },
                            { en: 'Let’s look at some examples from two countries.' },
                            { en: 'The first one is from Thailand.' },
                            { en: '“Don’t ride an elephant to catch a grasshopper.”' },
                            { en: 'When you are doing a small job, a big tool is not useful.' },
                            { en: 'The second one is from Brazil.' },
                            { en: '“In a piranha-filled river, an alligator swims backstroke.”' },
                            { en: 'Before you get in trouble, prepare for danger and protect yourself.' },
                            { en: 'Proverbs from different countries often include familiar local animals.' },
                            { en: 'Because of their images, people easily understand the messages.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'Proverbs often include flowers, too.' },
                            { en: 'Many of them have positive meanings.' },
                            { en: '“All the flowers of tomorrow are in the seeds of today” is a proverb from India.' },
                            { en: 'In this proverb, seeds indicate effort, and flowers are the result of the effort.' },
                            { en: 'Today’s effort leads to tomorrow’s success.' },
                            { en: '“Stop and smell the roses” is from the US.' },
                            { en: 'It means that a change of pace is important in our busy lives.' },
                            { en: 'Proverbs around the world often show the values in local people’s lives.' },
                            { en: 'Proverbs are cultural treasures of human beings.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 2: Iwago Mitsuaki―An Animal Photographer',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'First of all, why do you like cats?' },
                            { en: 'Because they are free.' },
                            { en: 'Cats live with people as pets, but they are not on a leash.' },
                            { en: 'Cats are beautiful and perfect.' },
                            { en: 'Your photos of cats are always interesting.' },
                            { en: 'How can you take such wonderful photos?' },
                            { en: 'I observe the lifestyle of cats very carefully before I take photos.' },
                            { en: 'For example, in a town with many cats, I watch them every day.' },
                            { en: 'On cold mornings, they always come together in the same place.' },
                            { en: 'The place may be warm from the sunlight.' },
                            { en: 'So I go there in advance and wait for them.' },
                            { en: 'They naturally sit around me.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'You lived in Africa for over a year.' },
                            { en: 'Please tell me about your experience.' },
                            { en: 'It was amazing.' },
                            { en: 'There were many animals in the Serengeti in Tanzania.' },
                            { en: 'At first, I had a typical image of Africa: lions were hunting zebras, or cheetahs were chasing gazelles.' },
                            { en: 'But my view changed after some time there.' },
                            { en: 'Why did your view change?' },
                            { en: 'Actually, many of the animals there were not moving much.' },
                            { en: 'They were just relaxing.' },
                            { en: 'Giraffes were eating leaves of a tall tree.' },
                            { en: 'I was impressed by the scene.' },
                            { en: 'It was so beautiful and peaceful.' },
                            { en: 'I realized that I had to take photos of animals and nature as they were.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'As you take photos, what do you learn from cats?' },
                            { en: 'Cats give us some hints about our lives.' },
                            { en: 'For example, they always choose comfortable places.' },
                            { en: 'When it is cold, they go to warm places.' },
                            { en: 'When it is hot, they escape to the shade of a tree.' },
                            { en: 'They live in harmony with nature.' },
                            { en: 'With that hint, humans can live a simple life, too.' },
                            { en: 'What messages do you send through your photos?' },
                            { en: 'I hope that my photos remind people of the harmony between nature and animals.' },
                            { en: 'Humans are also part of nature.' },
                            { en: 'This should be kept in mind.' },
                            { en: 'Then, we can live together with nature and animals.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 3: Sending Canned Mackerel to Space',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'In 2018, JAXA approved canned mackerel as space food.' },
                            { en: 'It was developed in Wakasa High School in Fukui.' },
                            { en: 'That was the first approval for high school students.' },
                            { en: 'How did students make space food?' },
                            { en: 'The school has a marine science course.' },
                            { en: 'It has facilities for processing fish.' },
                            { en: 'Because Fukui is famous for its mackerel, the facilities are often used for canned mackerel production.' },
                            { en: 'In 2006, the school received a special food safety certificate, HACCP.' },
                            { en: 'After that, the students learned that HACCP was originally developed by NASA for space food production.' },
                            { en: 'They were inspired by this fact.' },
                            { en: 'In 2007, they began making plans for producing their canned mackerel as space food.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'The canned mackerel had to meet the requirements of JAXA.' },
                            { en: 'There were two main difficulties in making the canned mackerel.' },
                            { en: 'The first difficulty was to make a sticky sauce.' },
                            { en: 'When astronauts eat, liquid should not float around in the space station.' },
                            { en: 'After many attempts, the students found a solution.' },
                            { en: 'They added kudzu starch to the sauce.' },
                            { en: 'It finally became sticky enough.' },
                            { en: 'The second difficulty was the taste.' },
                            { en: 'In space, astronauts’ sense of taste may become dull.' },
                            { en: 'So space food needs to have a strong flavor.' },
                            { en: 'The students tried to figure out the best level of flavor without actually going to space.' },
                            { en: 'They made many samples with different amounts of soy sauce and sugar to find the best balance.' },
                            { en: 'Finally, they agreed on a recipe.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'During twelve years of trial and error, more than 300 students were involved in this project.' },
                            { en: 'After their canned mackerel was approved in 2018, Wakata Koichi, a Japanese astronaut, visited the school.' },
                            { en: 'When he tried the product, he smiled and said, “It tastes good and goes well with rice.”' },
                            { en: 'The students’ space food was launched to the ISS in 2019.' },
                            { en: 'Thanks to the students, Japanese astronauts can enjoy a taste of home.' },
                            { en: 'The students are happy with their accomplishment.' },
                            { en: 'Yet, they are still motivated to improve their product.' },
                            { en: 'One of the students said, “We still have a lot of things to try.' },
                            { en: 'I hope that not only Japanese astronauts, but also foreign astronauts will enjoy our local mackerel.”' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 4: Messages from Winnie-the-Pooh',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'Today, I’d like to introduce one of my favorite books, Winnie-the-Pooh.' },
                            { en: 'I have read this book many times since I was a child.' },
                            { en: 'The book was written by A. A. Milne, a British author, in 1926.' },
                            { en: 'It is about Winnie-the-Pooh and his friends.' },
                            { en: 'Pooh spends his days in a forest with Christopher Robin, Piglet, Eeyore, and some other animals.' },
                            { en: 'Every character is unique.' },
                            { en: 'How did the author create these characters?' },
                            { en: 'Milne had a son, Christopher Robin.' },
                            { en: 'Christopher Robin played with many stuffed animals.' },
                            { en: 'He and the stuffed animals became models for the characters in the book.' },
                            { en: 'The book has been popular around the world for about 100 years.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'Recently I read Winnie-the-Pooh again.' },
                            { en: 'Then I found some new messages in the book.' },
                            { en: 'Here is one example.' },
                            { en: 'Pooh and Piglet find footsteps in the snow and follow them around a tree.' },
                            { en: 'They wonder, “Whose footsteps are these?”' },
                            { en: 'They have been walking around the tree.' },
                            { en: 'After a while, they realize that the footsteps are their own.' },
                            { en: 'Pooh gets disappointed with himself and says to Christopher nearby, “I have been foolish, and I am a bear of no brain at all.”' },
                            { en: 'Christopher responds, “You’re the best bear in all the world.”' },
                            { en: 'Christopher probably means, “Don’t worry.' },
                            { en: 'I like you as you are.”' },
                            { en: 'The characters in this book all respect each other and accept others as they are.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'I also read The House at Pooh Corner.' },
                            { en: 'The book has heartwarming messages, too.' },
                            { en: 'The last episode is especially moving.' },
                            { en: 'Christopher tells Pooh that he cannot see Pooh for a while because he has to start school.' },
                            { en: 'Christopher says, “Pooh, promise you won’t forget about me, ever.' },
                            { en: 'Not even when I’m a hundred.”' },
                            { en: 'Pooh asks, “How old will I be then?”' },
                            { en: 'Christopher answers, “Ninety-nine.”' },
                            { en: 'Then Pooh says, “I promise.”' },
                            { en: 'This interaction shows that real friendships last for a long time.' },
                            { en: 'I had not noticed these messages until I read the books again.' },
                            { en: 'Both of the books have meaningful messages for us, high school students.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 5: Endangered Languages',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'How many languages are there in the world?' },
                            { en: 'There are about 7,000.' },
                            { en: 'But about 40% of them are endangered languages.' },
                            { en: 'One of them is Arta in the Philippines.' },
                            { en: 'Arta people live on Luzon Island.' },
                            { en: 'There are only about 15 people who speak the language fluently.' },
                            { en: 'Can you tell me more about Arta?' },
                            { en: 'Traditionally, Arta people are hunters.' },
                            { en: 'So they have several words which express types of hunting.' },
                            { en: 'For example, the word “bugay” means to go hunting with hunting dogs.' },
                            { en: 'The word “purab” means to go hunting without dogs.' },
                            { en: 'That’s interesting.' },
                            { en: 'Language is tightly connected with people’s lifestyles.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'Can you give more examples of endangered languages?' },
                            { en: 'Sure.' },
                            { en: 'Tsimshian is an example from Canada.' },
                            { en: 'It is a language which one of the indigenous peoples speak.' },
                            { en: 'This language has a word “ts’iwox.”' },
                            { en: 'It means to eat snacks before going to bed.' },
                            { en: 'That sounds fun!' },
                            { en: 'Traditionally, Tsimshian people live by fishing and have an early dinner.' },
                            { en: 'After dinner, they often talk with their family or friends until late.' },
                            { en: 'When they become hungry, they eat snacks, including seafood.' },
                            { en: 'I see.' },
                            { en: 'How many speakers are there?' },
                            { en: 'Only about 100 speakers remain because many Tsimshian people use English instead of their own language.' },
                            { en: 'This shows major languages influence speakers of minority languages.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'We have some endangered languages in Japan.' },
                            { en: 'One of them is the Ainu language.' },
                            { en: 'There are at least 13,000 Ainu people in Japan, but only a few of them are fluent Ainu speakers.' },
                            { en: 'Yes.' },
                            { en: 'I have heard of the Ainu word “iyomante”, but I don’t know the meaning.' },
                            { en: '“Iyomante” is a ceremony to send the soul of a bear to heaven.' },
                            { en: 'Ainu people catch a young bear and raise it as a god.' },
                            { en: 'After two years, they share the meat as a gift for humans and pray to nature.' },
                            { en: 'So the word includes a lot of things.' },
                            { en: 'That’s right.' },
                            { en: 'Even a single word can express complex cultural traditions.' },
                            { en: 'In their own language, Ainu people can fully express what they value in their culture.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 4',
                        sentences: [
                            { en: 'Why do we have so many endangered languages?' },
                            { en: 'First, there are economic reasons.' },
                            { en: 'For example, to get a good job, speakers of a minority language often need to speak a major language like English.' },
                            { en: 'I see.' },
                            { en: 'Are there any other reasons?' },
                            { en: 'There are political and social reasons, too.' },
                            { en: 'For example, when Japanese is the official language, speakers of a minority language need to use Japanese in many places such as public offices and schools.' },
                            { en: 'Can we do something to save endangered languages?' },
                            { en: 'Yes.' },
                            { en: 'In New Zealand, the Maori language is taught at school.' },
                            { en: 'Now, more people are learning the language.' },
                            { en: 'So it is possible for us to increase the number of speakers.' },
                            { en: 'We can save endangered languages, and promote cultural diversity as well.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 6: A Wheelchair Traveler',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'Welcome to Miyo Tatsuya’s Blog' },
                            { en: 'Hi, I’m Miyo Tatsuya.' },
                            { en: 'I traveled around the world in a wheelchair by myself.' },
                            { en: 'I visited 42 cities in 23 countries.' },
                            { en: 'When I was 18, I got injured in a motorcycle accident.' },
                            { en: 'Because of that, I couldn’t move my arms and legs.' },
                            { en: 'But I never gave up.' },
                            { en: 'After rehabilitation, I was able to use my arms again.' },
                            { en: 'When I was 23, I traveled alone to Hawaii.' },
                            { en: 'I was impressed with the barrier-free facilities.' },
                            { en: 'Also, people living in Hawaii were kind to me.' },
                            { en: 'I became interested in foreign countries.' },
                            { en: 'I wondered how accessible other countries were for wheelchair users.' },
                            { en: 'So I decided to travel around the world.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'Traveling in Italy' },
                            { en: 'In Florence, an accident happened.' },
                            { en: 'I was moving my wheelchair on a road made of stones.' },
                            { en: 'Suddenly, the right-front wheel came off.' },
                            { en: 'The wheelchair would not move at all.' },
                            { en: 'I was at a loss.' },
                            { en: 'Just then, someone asked, “Trouble?”' },
                            { en: 'I saw an Italian man with his family.' },
                            { en: 'He looked at my wheelchair and said, “One screw is missing.' },
                            { en: 'You also need a wrench to fix it.”' },
                            { en: 'His wife found a wrench for me.' },
                            { en: 'His two kids started searching for the missing screw.' },
                            { en: 'Soon, they screamed, “We found the screw!”' },
                            { en: 'All of the family helped me, and my wheelchair was finally fixed.' },
                            { en: 'I said, “Grazie!” and tears came out of my eyes.' },
                            { en: 'Thanks to their kindness, I was able to continue my trip.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'Traveling in Greece' },
                            { en: 'I had a special experience in Greece, too.' },
                            { en: 'Traveling in Athens, I met a man from India.' },
                            { en: 'He was kind enough to take me to the Parthenon.' },
                            { en: 'At that time, the wheelchair lift was broken.' },
                            { en: 'I almost gave up, but he asked a Spanish man nearby for help.' },
                            { en: 'Then they carried me up in my wheelchair.' },
                            { en: 'Finally, we were able to reach the top of the Parthenon.' },
                            { en: 'I asked the Indian man, “Why are you so kind to me?”' },
                            { en: 'He said, “We all live on Earth together: men and women, young and old, disabled and non-disabled.' },
                            { en: 'I’m happy that I helped you.”' },
                            { en: 'From this trip, I noticed that the world is full of kind people.' },
                            { en: 'They are willing to help others.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 4',
                        sentences: [
                            { en: 'A Reflection on My Trip' },
                            { en: 'Receiving help from many people, I was able to travel around the world.' },
                            { en: 'I noticed that kind people did not hesitate to speak to someone in trouble.' },
                            { en: 'Let’s imagine that you are on a crowded train.' },
                            { en: 'A passenger nearby looks sick.' },
                            { en: 'What will you do?' },
                            { en: 'You may hesitate, but I hope you ask, “Are you OK?”' },
                            { en: 'It is important that you have the courage to talk to people.' },
                            { en: 'I believe that this courage can change the world.' },
                            { en: 'As I experienced during my trip, “barrier-free” is not only about facilities, but also about people’s mindset.' },
                            { en: 'Anyone can contribute to creating a barrier-free society.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 7: The Fugees',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'There is a unique youth soccer team in the US.' },
                            { en: 'The team was named “the Fugees” because the members were all refugees.' },
                            { en: 'The team is based in Clarkston, Georgia.' },
                            { en: 'Clarkston used to be a small, traditional town.' },
                            { en: 'In the 1980s, the town was chosen as a place where refugees started their new lives.' },
                            { en: 'Since then, a lot of refugees have come to the town.' },
                            { en: 'Some of the citizens were not happy about this.' },
                            { en: 'However, the local government continued accepting refugees.' },
                            { en: 'The town changed dramatically within a decade.' },
                            { en: 'A school had students from over 50 countries.' },
                            { en: 'Ethnic restaurants and shops were opened.' },
                            { en: 'Different languages were spoken by a variety of people.' },
                            { en: 'Clarkston became a diverse community.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'The team was founded by Luma Mufleh.' },
                            { en: 'She was the coach of a girls’ soccer team in Clarkston.' },
                            { en: 'One day in 2004, Luma saw some refugee boys.' },
                            { en: 'They were playing soccer on the street.' },
                            { en: 'As they looked happy, she asked, “Can I play soccer with you?”' },
                            { en: 'The boys were suspicious at first.' },
                            { en: 'However, once they played together, the boys noticed her soccer skills.' },
                            { en: 'That was the moment when they changed their attitude.' },
                            { en: 'Later, Luma learned about the boys’ past.' },
                            { en: 'She realized that they were able to forget about it while they were playing soccer.' },
                            { en: 'She also understood the feeling of isolation because she herself came from Jordan at the age of 18.' },
                            { en: 'She wanted to do something for the boys.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'Luma started teaching soccer to the refugee boys.' },
                            { en: 'The team practiced every week on a public field.' },
                            { en: 'In practice, Luma emphasized the importance of teamwork, and the boys trusted her.' },
                            { en: 'That was the reason why they continued training hard.' },
                            { en: 'Soon, the team made progress.' },
                            { en: 'Yet, there were some problems.' },
                            { en: 'Some boys were bullied at school, and others joined gangs.' },
                            { en: 'Luma encouraged such boys, saying, “Focus on soccer and make friends with your teammates.”' },
                            { en: 'In addition, many of the boys had not received enough education in their home countries.' },
                            { en: 'Some of them could not read or write.' },
                            { en: 'They could not do simple calculations, either.' },
                            { en: 'Luma supported them by providing private lessons after school.' },
                            { en: 'This was helpful for them to catch up with their classmates.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 4',
                        sentences: [
                            { en: 'The Fugees gradually became a better team and attracted people in Clarkston.' },
                            { en: 'In 2007, the team was featured in The New York Times.' },
                            { en: 'Many people in the US learned about the team and also started to cheer for it.' },
                            { en: 'Some people even donated money.' },
                            { en: 'With the donations, a school was established for refugee students.' },
                            { en: 'It was named the Fugees Academy.' },
                            { en: 'At this school, the class size is smaller than that of other schools.' },
                            { en: 'The school has been very successful.' },
                            { en: 'All of the first graduates went on to college.' },
                            { en: 'The young refugees still have difficulty living in the new community.' },
                            { en: 'However, thanks to the Fugees, they can feel accepted and find a way to a bright future.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 8: Avatar Robots',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'OriHime is a new type of robot.' },
                            { en: 'The robot functions as an avatar for people in remote places.' },
                            { en: 'If they use OriHime, they can talk with other people near the robot.' },
                            { en: 'Users can also express various feelings by controlling the robot’s head and hands freely.' },
                            { en: 'OriHime is 23 centimeters tall and has a camera, a microphone, and a speaker inside.' },
                            { en: 'It can be controlled with a computer through the Internet.' },
                            { en: 'Even physically disabled people can control the robot with a special eye tracking system.' },
                            { en: 'OriHime was developed for people who cannot be in a certain place for various reasons.' },
                            { en: 'It can be seen in classrooms, business meetings, family events, and many other situations.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'OriHime was created by Yoshifuji Kentaro.' },
                            { en: 'The idea for OriHime came from his own experience.' },
                            { en: 'When Yoshifuji was young, he was not able to go to school for three and a half years.' },
                            { en: 'He wanted to attend classes, but he could not.' },
                            { en: 'He was extremely lonely.' },
                            { en: 'He thought, “If I had an avatar, I could be with my classmates without going to school.”' },
                            { en: 'During this period, he became interested in designing robots.' },
                            { en: 'Yoshifuji entered an engineering high school.' },
                            { en: 'When he was 18, he took part in an engineering contest in the US.' },
                            { en: 'He met various people there and found his goal: to help people who cannot communicate with others easily.' },
                            { en: 'That is why he calls himself a “robot communicator”, not a “robot engineer.”' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'Even after Yoshifuji successfully created OriHime, he was never satisfied.' },
                            { en: 'He thought, “I wish OriHime could help more people.”' },
                            { en: 'So he started to develop OriHime-D.' },
                            { en: 'It basically has the same functions as OriHime.' },
                            { en: 'However, it can move around and carry things, and it is about 120 centimeters tall.' },
                            { en: 'In 2018, OriHime-D was used in a robot café in Tokyo for the first time.' },
                            { en: 'The robots were controlled by people with physical disabilities in remote places.' },
                            { en: 'Through OriHime-D, they carried drinks and communicated with the customers.' },
                            { en: 'Using the robots, people with physical disabilities felt the joy of working.' },
                            { en: 'In other words, they were able to feel that they participated in society.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 4',
                        sentences: [
                            { en: 'OriHime is useful not only for people with physical disabilities.' },
                            { en: 'It is also helpful for those who have other difficulties.' },
                            { en: 'For example, some workers need to stay home.' },
                            { en: 'They have to take care of young children or elderly family members.' },
                            { en: 'Using OriHime, the workers can talk with their coworkers as if they were in the same workplace.' },
                            { en: 'Also, OriHime helps some students who cannot attend school for a variety of reasons.' },
                            { en: 'Using the robot, they can spend time with their friends as if they were together.' },
                            { en: 'This is exactly what Yoshifuji wanted when he was young.' },
                            { en: 'Thanks to OriHime, people can “be” in places where they could not be before.' },
                            { en: 'Yoshifuji’s robots are changing many people’s lives and giving them hopes for the future.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 9: Kadono Eiko and the Power of Imagination',
                sections: [
                    {
                        sectionTitle: 'Section 1',
                        sentences: [
                            { en: 'I have written many children’s stories for a long time.' },
                            { en: 'You may know one of my works, Kiki’s Delivery Service.' },
                            { en: 'It was translated into English, French, Swedish, and many other languages.' },
                            { en: 'A young witch, Kiki, is the main character of the story.' },
                            { en: 'At the age of 13, she leaves her home in order to become a real witch.' },
                            { en: 'She flies on her broom to a new town with a cat named Jiji.' },
                            { en: 'She starts a delivery service and works hard to be accepted in her new community.' },
                            { en: 'She shows readers how to live in a positive way.' },
                            { en: 'I have always enjoyed writing stories throughout my life.' },
                            { en: 'So I am honored that I received the Hans Christian Andersen Award in 2018.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 2',
                        sentences: [
                            { en: 'Kiki’s Delivery Service and my other works were born from my imagination.' },
                            { en: 'It developed during my childhood.' },
                            { en: 'When I was five, my mother passed away.' },
                            { en: 'During the obon period, my father used to speak to her as if she were there.' },
                            { en: 'He said to her, “Welcome back.' },
                            { en: 'We moved the furniture.' },
                            { en: 'Be careful not to bump into anything.”' },
                            { en: 'Although I could not see my mother, I believed that she was with us.' },
                            { en: 'I became curious about the invisible world.' },
                            { en: 'I always liked stories when I was a child.' },
                            { en: 'I often asked my father to read stories to me.' },
                            { en: 'When I became a teenager, I read books every single day.' },
                            { en: 'I especially loved stories with happy endings.' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 3',
                        sentences: [
                            { en: 'When I create a story, the images of the characters are important.' },
                            { en: 'Kiki’s Delivery Service was born from my daughter’s drawing.' },
                            { en: 'It was a simple picture of a witch on a broom.' },
                            { en: 'The picture made me imagine the character.' },
                            { en: 'I imagined that a young girl like my daughter was flying over skyscrapers in New York.' },
                            { en: 'The names of the characters are also essential.' },
                            { en: 'When I was young, I didn’t like school.' },
                            { en: 'However, my teacher remembered my given name and called me “Eiko chan” one day.' },
                            { en: 'I felt very happy.' },
                            { en: 'So when I write stories, I think carefully about the names of the characters.' },
                            { en: 'Once I named the witch “Kiki”, I felt that she was next to me.' },
                            { en: 'She whispered, “Let’s fly together.”' },
                        ],
                    },
                    {
                        sectionTitle: 'Section 4',
                        sentences: [
                            { en: 'I like to experience something new.' },
                            { en: 'This influences my stories as well as my life.' },
                            { en: 'When I was 24, I decided to live in Brazil with my husband.' },
                            { en: 'I was really looking forward to seeing a new world.' },
                            { en: 'I felt my heart beating.' },
                            { en: 'Kiki has a similar experience.' },
                            { en: 'When she leaves home for an unknown town, Jiji asks, “Are you sure you want to be a witch?”' },
                            { en: 'She replies, “Yes.' },
                            { en: 'I’ve already made up my mind by myself.”' },
                            { en: 'Actually, Kiki is happy when she leaves.' },
                            { en: 'She says, “I am so excited.' },
                            { en: 'It’s like opening a gift box.”' },
                            { en: 'This feeling is exactly how I felt when I headed for Brazil.' },
                            { en: 'Jumping into a new world always inspires me and expands my imagination.' },
                        ],
                    },
                ],
            },
            {
                lessonTitle: 'Lesson 10: SDGs ― Sustainable Development Goals',
                sections: [
                    {
                        sectionTitle: 'Model 1',
                        sentences: [
                            { en: 'Hello, everyone.' },
                            { en: 'Today, our group will talk about microplastics.' },
                            { en: 'As you know, plastics are very useful.' },
                            { en: 'However, many of them end up in the ocean as waste.' },
                            { en: 'The waves then break these plastics into particles called “microplastics.”' },
                            { en: 'Also, microbeads used in health and beauty products come into the ocean.' },
                            { en: 'Next, I’ll talk about why microplastics are a problem.' },
                            { en: 'The main reason is related to the food chain.' },
                            { en: 'Birds and fish eat microplastics by mistake.' },
                            { en: 'In one study, microplastics were found in 40% of fish caught near Japan.' },
                            { en: 'Scientists worry that negative effects on human health might show up someday.' },
                            { en: 'Now, I’ll talk about actions against microplastics.' },
                            { en: 'Many actions are taken at the governmental and non-governmental levels.' },
                            { en: 'In the EU, a law bans the use of plastics for some disposable products.' },
                            { en: 'In Japan, major companies have already ended the use of microbeads.' },
                            { en: 'Let me conclude with what we can do.' },
                            { en: 'I recommend the 4Rs: refuse, reduce, reuse, and recycle.' },
                            { en: 'For example, bring your own bag when you go shopping.' },
                            { en: 'Put plastics in the recycle bin when you throw them away.' },
                            { en: 'Your small actions will lead to a big change someday.' },
                        ],
                    },
                    {
                        sectionTitle: 'Model 2',
                        sentences: [
                            { en: 'Good afternoon, everyone.' },
                            { en: 'Our group’s topic is “fast fashion.”' },
                            { en: 'Nowadays, many people buy cheap new clothes and throw away their old ones at a fast pace.' },
                            { en: 'This trend is called fast fashion.' },
                            { en: 'It may be attractive to consumers, but there are also negative aspects.' },
                            { en: 'Have you ever thought about the reasons for the low prices of fast fashion?' },
                            { en: 'Let me give you an example.' },
                            { en: 'In Bangladesh, workers in jeans factories are mostly women and children.' },
                            { en: 'They work over 15 hours a day, but their monthly salary is only about 9,000 yen.' },
                            { en: 'In this way, fast fashion companies can keep the cost of production to a minimum.' },
                            { en: 'Do we have any solution to this problem?' },
                            { en: 'Actually, some consumers have been raising their voices against the situation.' },
                            { en: 'Recently some major companies began to produce clothes in ethical ways.' },
                            { en: 'They try to keep standard working hours and pay proper wages to factory workers.' },
                            { en: 'Finally, we’d like to conclude by introducing something we can do.' },
                            { en: 'Let’s be ethical consumers.' },
                            { en: 'In other words, when you buy clothes, consider how they are made.' },
                            { en: 'I strongly believe that good clothes bring happiness to both consumers and producers.' },
                            { en: 'Thank you.' },
                        ],
                    },
                ],
            },
        ],
    },
    myway2: {
        title: 'MY WAY Ⅱ',
        comingSoon: true,
    },
    myway3: {
        title: 'MY WAY Ⅲ',
        comingSoon: true,
    },
};
// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
const evaluationSchema = {
    type: Type.OBJECT,
    properties: {
        pronunciationScore: { type: Type.NUMBER, description: "Pronunciation score (1-10)" },
        fluencyScore: { type: Type.NUMBER, description: "Fluency score (1-10)" },
        intonationScore: { type: Type.NUMBER, description: "Intonation score (1-10)" },
        advice: { type: Type.STRING, description: "Specific and encouraging advice for improvement in Japanese." },
        wordAnalysis: {
            type: Type.ARRAY,
            description: "Word-by-word analysis of the user's speech, comparing to the original text.",
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    correct: { type: Type.BOOLEAN }
                },
                required: ["word", "correct"]
            }
        }
    },
    required: ["pronunciationScore", "fluencyScore", "intonationScore", "advice", "wordAnalysis"]
};

// --- Authentication ---
function decodeJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
}

function handleCredentialResponse(response: any) {
    const payload = decodeJwt(response.credential);
    if (!payload) {
        alert("ログイン情報の解析に失敗しました。");
        return;
    }

    if (payload.hd === 'seibudai-chiba.jp') {
        currentUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        };
        updateUiForLoginState();
    } else {
        alert("このアプリケーションは @seibudai-chiba.jp ドメインのユーザーのみが利用できます。別のアカウントでログインしてください。");
        handleSignOut();
    }
}

function updateUiForLoginState() {
    if (currentUser) {
        // Logged in
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        userProfileEl.classList.remove('hidden');
        userNameEl.textContent = currentUser.name;
        userAvatarEl.src = currentUser.picture;
        
        // Initialize app features
        initializeMainApp();
    } else {
        // Logged out
        loginScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
        userProfileEl.classList.add('hidden');
    }
}

function handleSignOut() {
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    currentUser = null;
    updateUiForLoginState();
}

function initializeGoogleSignIn() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
        alert("Google Client IDが設定されていません。.envファイルを確認してください。");
        loginScreen.innerHTML = '<p style="color: var(--score-low);">設定エラー: Google Client IDがありません。</p>';
        return;
    }
    
    window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(
        googleSignInButton,
        { theme: "outline", size: "large", type: "standard", text: "signin_with", locale: "ja" }
    );
    window.google.accounts.id.prompt();
}

// --- Helper Functions ---
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.substring(base64data.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function autoResizeTextarea() {
    // Reset height to allow shrinking
    sentenceInputEl.style.height = 'auto';
    // Set height to scrollHeight to fit content
    sentenceInputEl.style.height = `${sentenceInputEl.scrollHeight}px`;
}

function updateUIForLoading(loading: boolean) {
    isLoading = loading;
    if (loading) {
        resultsSection.classList.remove('hidden');
        loader.classList.remove('hidden');
        resultsContent.classList.add('hidden');
        recordBtn.disabled = true;
        playModelBtn.disabled = true;
        sentenceInputEl.disabled = true;
        selectSentenceBtn.disabled = true;
    } else {
        loader.classList.add('hidden');
        resultsContent.classList.remove('hidden');
        updateButtonState(); // Use central function
        sentenceInputEl.disabled = false;
        selectSentenceBtn.disabled = false;
    }
}

function updateGauge(gaugeEl: HTMLElement, scoreEl: HTMLElement, score: number) {
    const roundedScore = Math.round(score * 10) / 10;
    scoreEl.textContent = `${roundedScore}/10`;
    
    const percentage = (roundedScore / 10) * 100;
    gaugeEl.style.width = `${percentage}%`;

    gaugeEl.className = 'score-gauge-bar'; // Reset classes
    if (score < 4) {
        gaugeEl.classList.add('score-low');
    } else if (score < 8) {
        gaugeEl.classList.add('score-medium');
    } else {
        gaugeEl.classList.add('score-high');
    }
}

function updateCircularProgress(score: number) {
    const radius = overallProgressCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const roundedScore = Math.round(score * 10) / 10;
    
    const offset = circumference - (roundedScore / 30) * circumference;
    overallProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    overallProgressCircle.style.strokeDashoffset = String(offset);
    
    overallScoreValueEl.textContent = String(roundedScore);

    overallProgressCircle.setAttribute('class', 'progress-bar'); // Reset classes
    if (score < 12) {
        overallProgressCircle.classList.add('score-low');
    } else if (score < 24) {
        overallProgressCircle.classList.add('score-medium');
    } else {
        overallProgressCircle.classList.add('score-high');
    }
}


function updateUIWithResults(data: any) {
    const overallScore = data.pronunciationScore + data.fluencyScore + data.intonationScore;
    
    updateGauge(pronunciationGaugeEl, pronunciationScoreEl, data.pronunciationScore);
    updateGauge(fluencyGaugeEl, fluencyScoreEl, data.fluencyScore);
    updateGauge(intonationGaugeEl, intonationScoreEl, data.intonationScore);
    updateCircularProgress(overallScore);

    transcriptionTextEl.innerHTML = '';
    if (data.wordAnalysis && data.wordAnalysis.length > 0) {
        data.wordAnalysis.forEach((item: { word: string, correct: boolean }) => {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = item.word;
            wordSpan.className = item.correct ? 'correct-word' : 'incorrect-word';
            transcriptionTextEl.appendChild(wordSpan);
        });
    } else {
        transcriptionTextEl.textContent = '書き起こしデータがありません。';
    }
    
    adviceTextEl.textContent = data.advice;
}

// --- Core Logic ---
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isRecording = true;
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
            evaluatePronunciation(audioBlob);
        };

        mediaRecorder.start();
        recordBtn.classList.add('recording');
        recordBtnIcon.innerHTML = stopIcon;
        playModelBtn.disabled = true;
        sentenceInputEl.disabled = true;
        selectSentenceBtn.disabled = true;

    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("マイクにアクセスできませんでした。ブラウザの権限を確認してください。");
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtnIcon.innerHTML = micIcon;
        sentenceInputEl.disabled = false;
        selectSentenceBtn.disabled = false;
    }
}

async function evaluatePronunciation(audioBlob: Blob) {
    updateUIForLoading(true);
    
    try {
        const audioData = await blobToBase64(audioBlob);
        const referenceText = sentenceInputEl.value;

        const textPart = { text: `You are an expert English pronunciation coach. The user is trying to read the following sentence: "${referenceText}". Please analyze the user's audio and evaluate it.
The evaluation criteria are "Pronunciation", "Fluency", and "Intonation", each scored on a scale of 1 to 10.
Furthermore, analyze the user's speech word by word, and determine if each word was pronounced correctly (correct: true/false).
Finally, provide specific and encouraging advice about user's speech word by word for improvement. The advice must be provided in Japanese language.
Your response must be in the specified JSON format.` };
        const audioPart = {
            inlineData: {
                mimeType: 'audio/webm',
                data: audioData,
            },
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, audioPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: evaluationSchema,
            }
        });

        const resultJson = response.text.trim();
        const resultData = JSON.parse(resultJson);
        updateUIWithResults(resultData);

    } catch (error) {
        console.error("Error evaluating pronunciation:", error);
        resultsSection.classList.remove('hidden');
        resultsContent.classList.remove('hidden');
        loader.classList.add('hidden'); // Hide loader on error
        const overallScoreDisplay = document.getElementById('overall-score-display') as HTMLDivElement;
        if(overallScoreDisplay) overallScoreDisplay.classList.add('hidden');
        adviceTextEl.textContent = "申し訳ありませんが、スピーチの評価中にエラーが発生しました。AIが音声を認識できなかった可能性があります。もう一度、はっきりと話してみてください。";
    } finally {
        updateUIForLoading(false);
    }
}

function playModelAudio() {
    const textToSpeak = sentenceInputEl.value;
    if (!textToSpeak || !window.speechSynthesis) {
        alert("申し訳ありません。お使いのブラウザは音声合成に対応していません。");
        return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    utterance.onstart = () => {
        playModelBtn.disabled = true;
        recordBtn.disabled = true;
    };
    
    utterance.onend = () => {
        if (!isLoading && !isRecording) {
            updateButtonState();
        }
    };
    
    window.speechSynthesis.speak(utterance);
}

function updateButtonState() {
    const hasText = sentenceInputEl.value.trim().length > 0;
    recordBtn.disabled = !hasText;
    playModelBtn.disabled = !hasText;
    clearSentenceBtn.classList.toggle('hidden', !hasText);
}

// --- Sentence Modal Logic ---
function populateFactbookList() {
    factbookListEl.innerHTML = ''; // Clear existing list
    for (const chapterKey in factbookContentData) {
        const chapter = factbookContentData[chapterKey as keyof typeof factbookContentData];
        
        const chapterContainer = document.createElement('div');
        
        const titleButton = document.createElement('button');
        titleButton.className = 'chapter-title';
        titleButton.textContent = chapter.title;
        
        const sentenceList = document.createElement('div');
        sentenceList.className = 'sentence-list hidden';

        chapter.sections.forEach(section => {
            section.sentences.forEach(sentence => {
                const sentenceEl = document.createElement('div');
                sentenceEl.className = 'sentence-item';
                sentenceEl.innerHTML = `<p class="en">${sentence.en}</p>${sentence.ja ? `<p class="ja">${sentence.ja}</p>` : ''}`;
                sentenceEl.addEventListener('click', () => {
                    sentenceInputEl.value = sentence.en;
                    sentenceInputEl.dispatchEvent(new Event('input')); // To update button states
                    closeModal();
                });
                sentenceList.appendChild(sentenceEl);
            });
        });
        
        titleButton.addEventListener('click', () => {
            titleButton.classList.toggle('active');
            sentenceList.classList.toggle('hidden');
        });
        
        chapterContainer.appendChild(titleButton);
        chapterContainer.appendChild(sentenceList);
        factbookListEl.appendChild(chapterContainer);
    }
}

function populateMyWayList() {
    mywayListEl.innerHTML = '';
    Object.values(myWayContentData).forEach((book: any) => {
        const bookContainer = document.createElement('div');

        const bookTitleBtn = document.createElement('button');
        bookTitleBtn.className = 'chapter-title';
        bookTitleBtn.textContent = book.title;
        bookContainer.appendChild(bookTitleBtn);

        const bookContent = document.createElement('div');
        bookContent.className = 'sentence-list hidden';

        if (book.comingSoon) {
            const comingSoonEl = document.createElement('div');
            comingSoonEl.className = 'coming-soon-item';
            comingSoonEl.textContent = 'Coming Soon...';
            bookContent.appendChild(comingSoonEl);
        } else if (book.lessons) {
            book.lessons.forEach((lesson: any) => {
                const lessonContainer = document.createElement('div');
                const lessonTitleBtn = document.createElement('button');
                lessonTitleBtn.className = 'chapter-title lesson-title';
                lessonTitleBtn.textContent = lesson.lessonTitle;
                lessonContainer.appendChild(lessonTitleBtn);

                const sectionsContainer = document.createElement('div');
                sectionsContainer.className = 'sentence-list lesson-sentence-list hidden';

                lesson.sections.forEach((section: any) => {
                    const combinedText = section.sentences.map((s: { en: string }) => s.en).join(' ');
                    
                    const sectionEl = document.createElement('div');
                    sectionEl.className = 'sentence-item';
                    sectionEl.innerHTML = `<p class="en">${section.sectionTitle}</p>`;
                    
                    sectionEl.addEventListener('click', () => {
                        sentenceInputEl.value = combinedText;
                        sentenceInputEl.dispatchEvent(new Event('input'));
                        closeModal();
                    });
                    sectionsContainer.appendChild(sectionEl);
                });
                
                lessonContainer.appendChild(sectionsContainer);
                bookContent.appendChild(lessonContainer);

                lessonTitleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    lessonTitleBtn.classList.toggle('active');
                    sectionsContainer.classList.toggle('hidden');
                });
            });
        }
        
        bookContainer.appendChild(bookContent);
        mywayListEl.appendChild(bookContainer);

        bookTitleBtn.addEventListener('click', () => {
            bookTitleBtn.classList.toggle('active');
            bookContent.classList.toggle('hidden');
        });
    });
}


function initializeSentenceModal() {
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            modalTabContents.forEach(content => {
                if (content.id === `${targetId}-content`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    populateFactbookList();
    populateMyWayList();
}


function openModal() {
    sentenceModal.classList.remove('hidden');
}

function closeModal() {
    sentenceModal.classList.add('hidden');
}


function initializeMainApp() {
    // --- Event Listeners ---
    recordBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    playModelBtn.addEventListener('click', playModelAudio);
    sentenceInputEl.addEventListener('input', updateButtonState);
    sentenceInputEl.addEventListener('input', autoResizeTextarea);
    
    clearSentenceBtn.addEventListener('click', () => {
        sentenceInputEl.value = '';
        sentenceInputEl.focus();
        sentenceInputEl.dispatchEvent(new Event('input'));
    });

    selectSentenceBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    sentenceModal.addEventListener('click', (e) => {
        if (e.target === sentenceModal) {
            closeModal();
        }
    });

    // --- Initialization ---
    updateButtonState();
    initializeSentenceModal();
    if (!import.meta.env.VITE_API_KEY) {
        alert("APIキーが設定されていません。.envファイルを確認してください。");
    }
}

// --- App Entry Point ---
window.onload = () => {
    updateUiForLoginState(); // Check initial state
    signOutBtn.addEventListener('click', handleSignOut);
    
    if (window.google) {
        initializeGoogleSignIn();
    } else {
        console.error("Google Sign-In library not loaded.");
    }
};