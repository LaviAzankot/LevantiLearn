/**
 * audioKey — builds a canonical lookup key for audio_map.json / AUDIO_REQUIRE_MAP.
 *
 * Examples:
 *   audioKey('greetings_001', 'vocab',  1, 0)  → 'greetings_001/vocab_c1_0'
 *   audioKey('greetings_001', 'speak',  2, 3)  → 'greetings_001/speak_c2_3'
 *   audioKey('greetings_001', 'quiz',   1, 5)  → 'greetings_001/quiz_c1_5'
 */
export function audioKey(
  lesson:   string,
  exercise: string,
  cycle:    number,
  index:    number,
): string {
  return `${lesson}/${exercise}_c${cycle}_${index}`;
}
