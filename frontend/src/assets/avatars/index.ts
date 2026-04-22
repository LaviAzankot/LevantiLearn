/**
 * Static avatar image map — required by Metro bundler (no dynamic require).
 * 23 avatars: avatar_1.png … avatar_23.png
 */
const AVATARS: Record<number, any> = {
  1:  require('./avatar_1.png'),
  2:  require('./avatar_2.png'),
  3:  require('./avatar_3.png'),
  4:  require('./avatar_4.png'),
  5:  require('./avatar_5.png'),
  6:  require('./avatar_6.png'),
  7:  require('./avatar_7.png'),
  8:  require('./avatar_8.png'),
  9:  require('./avatar_9.png'),
  10: require('./avatar_10.png'),
  11: require('./avatar_11.png'),
  12: require('./avatar_12.png'),
  13: require('./avatar_13.png'),
  14: require('./avatar_14.png'),
  15: require('./avatar_15.png'),
  16: require('./avatar_16.png'),
  17: require('./avatar_17.png'),
  18: require('./avatar_18.png'),
  19: require('./avatar_19.png'),
  20: require('./avatar_20.png'),
  21: require('./avatar_21.png'),
  22: require('./avatar_22.png'),
  23: require('./avatar_23.png'),
};

export const AVATAR_COUNT = 23;

/** Pick 2 different avatar indices deterministically from a lesson ID. */
export function pickAvatarsForLesson(lessonId: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < lessonId.length; i++) {
    hash = (hash * 31 + lessonId.charCodeAt(i)) & 0xffff;
  }
  const a1 = (hash % AVATAR_COUNT) + 1;
  let a2 = ((hash >> 4) % AVATAR_COUNT) + 1;
  if (a2 === a1) a2 = (a2 % AVATAR_COUNT) + 1;
  return [a1, a2];
}

export function getAvatar(index: number): any {
  return AVATARS[index] ?? AVATARS[1];
}

export default AVATARS;
