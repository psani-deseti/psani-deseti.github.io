import { Category } from '../types';

export const categories: Category[] = [

/* ================= FJ + DK ================= */
{
  id: 'fjdk',
  title: 'Základy: F J + D K',
  description: 'Základní pozice ukazováčků a prostředníčků na prostřední řadě.',
  subLessons: [
    {
      id: 'fjdk-1',
      title: 'Rozcvička FJ',
      newLetters: 'fj',
      pages: [
        'ffff jjjj ffff jjjj ffj jjf fjffj jjff fjf',
        'fj fj fj fj jf jf jf jf fj fj jf jf jf jff ffj jffj fjf jjf fjf jjf'
      ]
    },
    {
      id: 'fjdk-2',
      title: 'Rozcvička DK',
      newLetters: 'dk',
      pages: [
        'dddd kkkk dddd kkkk ddk kkdd dkdd kkdk dkd',
        'dk dk dk dk kd kd kd kd dk dk kd kd kd kdd dkk kddk dkdk kddk'
      ]
    },
    {
      id: 'fjdk-3',
      title: 'Střídání FJ DK',
      pages: [
        'fj dk fj dk fj dk fj dk fj dk fj dk fff jjf jfjf',
        'fdjk kdjf fjdk dkfj fjdk dkfj fjdk dkfj fjdk dkfj fjdk dkfj fjdk dkfj'
      ]
    },
    {
      id: 'fjdk-4',
      title: 'Trojice FJDK 1',
      pages: [
        'fdf jkj dfd kjk fdfff djd kdjf',
        'fjf dkd jfj kdk fjf dkd jfj kdk fjf dkd jfj kdk'
      ]
    },
    {
      id: 'fjdk-5',
      title: 'Náhodná FJDK',
      mode: 'random',
      letters: 'fjd k',
      pageCount: 4,
      pageLength: 20,
      max_comb: 2
    },
    {
      id: 'fjdk-6',
      title: 'Malá výzva FJDK',
      mode: 'challenge',
      challengeParts: ['standard', 'shooter'],
      text: 'fjdk fjdk dkfj kjdf fjdk fjdk fjdk dkfj kjdf fjdk jfdk fjdk dkfj',
      letters: 'fjd k'
    },
    {
      id: 'fjdk-infinite',
      title: 'Nekonečná FJDK',
      mode: 'infinite',
      letters: 'fjd k',
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: true
    }
  ]
},

/* ================= SL ================= */
{
  id: 'sl',
  title: 'Základy: S L',
  description: 'Procvičení prsteníčku na levé a pravé ruce.',
  subLessons: [
    {
      id: 'sl-1',
      title: 'Rozcvička S',
      newLetters: 's',
      pages: [
        'ssss ssss ssss',
        'ss ss ss ss ss'
      ]
    },
    {
      id: 'sl-2',
      title: 'Rozcvička L',
      newLetters: 'l',
      pages: [
        'llll llll llll',
        'll ll ll ll ll'
      ]
    },
    {
      id: 'sl-3',
      title: 'Střídání SL',
      pages: [
        'sl sl sl ls ls ls',
        'slsl lsls slsl lsls'
      ]
    },
    {
      id: 'sl-4',
      title: 'Trojice SL',
      pages: [
        'sls lsl sls lsl',
        'sss lll sss lll'
      ]
    },
    {
      id: 'sl-5',
      title: 'Náhodná SL',
      mode: 'random',
      letters: 'sl',
      newLetters: 'sl',
      pageCount: 4,
      pageLength: 22,
      max_comb: 2
    },
    {
      id: 'sl-6',
      title: 'Výzva SL',
      mode: 'challenge',
      challengeParts: ['standard', 'wordShooter'],
      text: 'sl sl ls sls lsl',
      words: ['sl', 'ls', 'slsl']
    },
    {
      id: 'sl-infinite',
      title: 'Nekonečná SL',
      mode: 'infinite',
      letters: 'sl',
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: true
    }
  ]
},

/* ================= AŮ ================= */
{
  id: 'au',
  title: 'Základy: A Ů',
  description: 'Procvičení levého malíčku a pravého malíčku.',
  subLessons: [
    {
      id: 'au-1',
      title: 'Rozcvička A',
      newLetters: 'a',
      pages: [
        'aaaa aaaa aaaa',
        'aa aa aa aa aa'
      ]
    },
    {
      id: 'au-2',
      title: 'Rozcvička Ů',
      newLetters: 'ů',
      pages: [
        'ůůůů ůůůů ůůůů',
        'ůů ůů ůů ůů ůů'
      ]
    },
    {
      id: 'au-3',
      title: 'Střídání AŮ',
      pages: [
        'aů aů aů ůa ůa',
        'aaua ůaůa aůaů'
      ]
    },
    {
      id: 'au-4',
      title: 'Trojice AŮ',
      pages: [
        'aaů ůaa aůa',
        'aůa ůaů aaů'
      ]
    },
    {
      id: 'au-5',
      title: 'Náhodná AŮ',
      mode: 'random',
      letters: 'aů',
      newLetters: 'aů',
      pageCount: 4,
      pageLength: 20,
      max_comb: 2
    },
    {
      id: 'au-6',
      title: 'Výzva AŮ',
      mode: 'challenge',
      challengeParts: ['standard', 'shooter'],
      text: 'aů aůa ůaa aau ůaů',
      letters: 'aů'
    },
    {
      id: 'au-infinite',
      title: 'Nekonečná AŮ',
      mode: 'infinite',
      letters: 'aů',
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: true
    }
  ]
},

/* ================= GH ================= */
{
  id: 'gh',
  title: 'Základy: G H',
  description: 'Procvičení ukazováčků na horní řadě.',
  subLessons: [
    {
      id: 'gh-1',
      title: 'Rozcvička G',
      newLetters: 'g',
      pages: [
        'gggg gggg gggg',
        'gg gg gg gg gg'
      ]
    },
    {
      id: 'gh-2',
      title: 'Rozcvička H',
      newLetters: 'h',
      pages: [
        'hhhh hhhhh hhhh',
        'hh hh hh hh hh'
      ]
    },
    {
      id: 'gh-3',
      title: 'Střídání GH',
      pages: [
        'gh gh gh hg hg',
        'gghh hhgg gghh'
      ]
    },
    {
      id: 'gh-4',
      title: 'Trojice GH',
      pages: [
        'ggh hgg ghg hgh',
        'ggg hhh ggg hhh'
      ]
    },
    {
      id: 'gh-5',
      title: 'Náhodná GH',
      mode: 'random',
      letters: 'gh',
      newLetters: 'gh',
      pageCount: 4,
      pageLength: 22,
      max_comb: 2
    },
    {
      id: 'gh-6',
      title: 'Výzva GH',
      mode: 'challenge',
      challengeParts: ['standard', 'wordShooter'],
      text: 'gh ghh hgg ghg hgh',
      words: ['gh', 'hg', 'ghgh']
    },
    {
      id: 'gh-infinite',
      title: 'Nekonečná GH',
      mode: 'infinite',
      letters: 'gh',
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: true
    }
  ]
},

/* ================= RU ================= */
{
  id: 'ru',
  title: 'Základy: R U',
  description: 'Procvičení pravého ukazováčku a prostředníčku.',
  subLessons: [
    {
      id: 'ru-1',
      title: 'Rozcvička R',
      newLetters: 'r',
      pages: [
        'rrrr rrrr rrrr',
        'rr rr rr rr rr'
      ]
    },
    {
      id: 'ru-2',
      title: 'Rozcvička U',
      newLetters: 'u',
      pages: [
        'uuuu uuuu uuuu',
        'uu uu uu uu uu'
      ]
    },
    {
      id: 'ru-3',
      title: 'Střídání RU',
      pages: [
        'ru ru ru ur ur',
        'rruu uurr ruru'
      ]
    },
    {
      id: 'ru-4',
      title: 'Trojice RU',
      pages: [
        'rur uru rur uru',
        'rrr uuu rrr uuu'
      ]
    },
    {
      id: 'ru-5',
      title: 'Náhodná RU',
      mode: 'random',
      letters: 'ru',
      newLetters: 'ru',
      pageCount: 4,
      pageLength: 22,
      max_comb: 2
    },
    {
      id: 'ru-6',
      title: 'Výzva RU',
      mode: 'challenge',
      challengeParts: ['standard', 'shooter'],
      text: 'ru ruu urr ruru urur',
      letters: 'ru'
    },
    {
      id: 'ru-infinite',
      title: 'Nekonečná RU',
      mode: 'infinite',
      letters: 'ru',
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: true
    }
  ]
},

/* ================= EI ================= */
{
  id: 'ei',
  title: 'Základy: E I',
  description: 'Procvičení prostředníčků na horní řadě.',
  subLessons: [
    {
      id: 'ei-1',
      title: 'Rozcvička E',
      newLetters: 'e',
      pages: [
        'eeee eeee eeee',
        'ee ee ee ee ee'
      ]
    },
    {
      id: 'ei-2',
      title: 'Rozcvička I',
      newLetters: 'i',
      pages: [
        'iiii iiii iiii',
        'ii ii ii ii ii'
      ]
    },
    {
      id: 'ei-3',
      title: 'Střídání EI',
      pages: [
        'ei ei ei ie ie',
        'eeii iiee eiie'
      ]
    },
    {
      id: 'ei-4',
      title: 'Trojice EI',
      pages: [
        'eie iei eie iei',
        'eee iii eee iii'
      ]
    },
    {
      id: 'ei-5',
      title: 'Náhodná EI',
      mode: 'random',
      letters: 'ei',
      newLetters: 'ei',
      pageCount: 4,
      pageLength: 22,
      max_comb: 2
    },
    {
      id: 'ei-6',
      title: 'Výzva EI',
      mode: 'challenge',
      challengeParts: ['standard', 'wordShooter'],
      text: 'ei ie eie iei ei',
      words: ['ei', 'ie', 'eiei']
    },
    {
      id: 'ei-infinite',
      title: 'Nekonečná EI',
      mode: 'infinite',
      letters: 'ei',
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: true
    }
  ]
}

];