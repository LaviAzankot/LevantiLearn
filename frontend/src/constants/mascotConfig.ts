export const MASCOT_IMAGES = {
  celebrating: require('../assets/mascot/celebrating.png'),
  default:     require('../assets/mascot/default.png'),
  didit:       require('../assets/mascot/didit.png'),
  excited:     require('../assets/mascot/excited.png'),
  happy:       require('../assets/mascot/happy.png'),
  letsgo:      require('../assets/mascot/letsgo.png'),
  proud:       require('../assets/mascot/proud.png'),
  shocked:     require('../assets/mascot/shocked.png'),
  surprised:   require('../assets/mascot/surprised.png'),
  thinking:    require('../assets/mascot/thinking.png'),
} as const;

export type MascotKey = keyof typeof MASCOT_IMAGES;

export type MascotState =
  | 'idle'
  | 'correct'
  | 'streak3'
  | 'streak5'
  | 'streak10'
  | 'wrong'
  | 'complete'
  | 'perfect';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface MascotConfig {
  pool:  MascotKey[];
  texts: string[];
}

const CONFIG: Record<MascotState, MascotConfig> = {
  idle: {
    pool:  ['default'],
    texts: ["Let's do this!", 'Ready?', 'Here we go!'],
  },
  correct: {
    pool:  ['happy', 'excited'],
    texts: ['Nice one!', 'Keep going!', 'Good answer!'],
  },
  streak3: {
    pool:  ['happy', 'excited', 'shocked', 'proud'],
    texts: ["You're on fire! 🔥 ×3", 'Three in a row!', 'On a roll!'],
  },
  streak5: {
    pool:  ['excited', 'letsgo', 'shocked', 'proud'],
    texts: ['Lets go! 🔥 ×5', 'Five straight!', 'You are unstoppable!'],
  },
  streak10: {
    pool:  ['letsgo', 'shocked', 'proud'],
    texts: ['Unreal! 🔥 ×10', 'Ten in a row!', 'Absolutely on fire! 🔥'],
  },
  wrong: {
    pool:  ['thinking'],
    texts: ['Think again...', 'Not quite.', 'Try once more.'],
  },
  complete: {
    pool:  ['didit', 'celebrating'],
    texts: ['You crushed it!', 'Lesson done!', 'Well done!'],
  },
  perfect: {
    pool:  ['shocked', 'proud'],
    texts: ['Perfect round. Zero mistakes.', 'Flawless!', 'Not a single mistake.'],
  },
};

export function resolveMascot(state: MascotState): { image: MascotKey; text: string } {
  const cfg = CONFIG[state];
  return {
    image: pick(cfg.pool),
    text:  pick(cfg.texts),
  };
}
