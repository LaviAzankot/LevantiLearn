/**
 * generate-audio.ts — Azure TTS batch audio generator for LevantiLearn
 *
 * Usage:
 *   npx ts-node scripts/generate-audio.ts [options]
 *
 * Options:
 *   --lesson greetings_001     Generate audio for one lesson only
 *   --lessons 001-010          Generate audio for a range of lessons (by numeric suffix)
 *   --force                    Regenerate even if file already exists
 *   --dry-run                  List what would be generated, don't call Azure
 *   --voice ar-PS-AvriNeural   Override the default voice
 *   --serve                    Start HTTP server on port 9423 for AdminAudioScreen IPC
 *
 * Credentials: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in backend/.env
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import * as dotenv from 'dotenv';

// Load credentials from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// ── Configuration ─────────────────────────────────────────────────────────────

const AZURE_KEY    = process.env.AZURE_SPEECH_KEY    ?? '';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus';

const DEFAULT_VOICE  = 'ar-PS-AvriNeural';
const FALLBACK_VOICE = 'ar-SY-AmanyNeural';
const MAX_CONCURRENT = 10;
const BATCH_DELAY_MS = 100;

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT          = path.join(__dirname, '..');
const LESSONS_DIR   = path.join(ROOT, 'backend/data/lessons');
const AUDIO_DIR     = path.join(ROOT, 'frontend/src/assets/audio');
const REQUIRE_MAP   = path.join(ROOT, 'frontend/src/generated/audioRequireMap.ts');
const CHECKPOINT    = path.join(AUDIO_DIR, '.checkpoint.json');
const FAILED_FILE   = path.join(AUDIO_DIR, '.failed.json');
const AUDIO_MAP     = path.join(AUDIO_DIR, 'audio_map.json');
const TEXT_MAP      = path.join(AUDIO_DIR, 'text_map.json');
const STATUS_FILE   = path.join(AUDIO_DIR, '.status.json');

// ── Types ─────────────────────────────────────────────────────────────────────

interface AudioEntry {
  key:     string;   // e.g. 'greetings_001/vocab_c1_0'
  arabic:  string;   // the Arabic text
  outPath: string;   // absolute path to output .mp3
  relPath: string;   // relative path from assets/audio/ e.g. 'greetings_001/vocab_c1_0_arabic.mp3'
}

interface Checkpoint {
  completed:  string[];
  stopped_at: string | null;
  total:      number;
  generated:  number;
}

interface StatusPayload {
  generated:   number;
  total:       number;
  percent:     number;
  currentKey:  string;
  timestamp:   number;
  isGenerating: boolean;
}

// ── Global abort ──────────────────────────────────────────────────────────────

const globalController = new AbortController();
const { signal }       = globalController;

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Voice validation ──────────────────────────────────────────────────────────

async function selectVoice(preferred: string): Promise<string> {
  console.log('\n🔍 Checking Azure voice availability...');
  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1/voices/list`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY },
    signal,
  });
  if (!res.ok) throw new Error(`Voice list fetch failed: ${res.status} ${await res.text()}`);

  const voices = await res.json() as Array<{ ShortName: string }>;
  const names  = new Set(voices.map(v => v.ShortName));

  if (names.has(preferred)) {
    console.log(`✅ Voice ${preferred} is available.`);
    return preferred;
  }

  console.warn(`⚠️  Voice ${preferred} is not available on this account.`);

  if (names.has(FALLBACK_VOICE)) {
    console.log(`   Fallback available: ${FALLBACK_VOICE}`);
    const answer = await promptUser(`Proceed with ${FALLBACK_VOICE}? (y/N): `);
    if (answer.toLowerCase() !== 'y') { console.log('Aborted.'); process.exit(0); }
    return FALLBACK_VOICE;
  }

  throw new Error(
    `Neither ${preferred} nor ${FALLBACK_VOICE} is available. ` +
    `Check your Azure subscription region (current: ${AZURE_REGION}).`
  );
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a); }));
}

// ── Azure TTS REST API ────────────────────────────────────────────────────────

async function synthesize(text: string, voice: string, retries = 3): Promise<Buffer> {
  const ssml = [
    `<speak version='1.0' xml:lang='ar-PS'>`,
    `<voice xml:lang='ar-PS' name='${voice}'>${escapeXml(text)}</voice>`,
    `</speak>`,
  ].join('');

  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  let delay = 2000;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type':              'application/ssml+xml',
        'X-Microsoft-OutputFormat':  'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent':                'LevantiLearn/1.0',
      },
      body: ssml,
    });

    if (res.status === 429) {
      if (attempt < retries - 1) {
        console.warn(`\n  ⏳ Rate limited — waiting ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw new Error(`Rate limited after ${retries} attempts`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Azure TTS ${res.status}: ${body}`);
    }

    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('Max retries exceeded');
}

// ── Extract audio entries from lesson JSON files ──────────────────────────────

async function extractEntries(lessonFilter: string | null): Promise<AudioEntry[]> {
  const entries: AudioEntry[] = [];
  const files = (await fs.readdir(LESSONS_DIR))
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const lessonId = file.replace('.json', '');
    if (lessonFilter && lessonId !== lessonFilter) continue;

    let lesson: Record<string, unknown>;
    try {
      lesson = JSON.parse(await fs.readFile(path.join(LESSONS_DIR, file), 'utf-8'));
    } catch {
      console.warn(`  ⚠️  Could not parse ${file} — skipping`);
      continue;
    }

    if (!lesson.cycles) continue; // Only cycles-format lessons

    const lessonDir = path.join(AUDIO_DIR, lessonId);

    for (const cycle of lesson.cycles as Array<Record<string, unknown>>) {
      const c = Number(cycle.cycle);

      // Vocab words
      for (const [i, word] of ((cycle.vocab ?? []) as Array<{ arabic?: string }>).entries()) {
        if (word.arabic) {
          entries.push({
            key:     `${lessonId}/vocab_c${c}_${i}`,
            arabic:  word.arabic,
            outPath: path.join(lessonDir, `vocab_c${c}_${i}_arabic.mp3`),
            relPath: `${lessonId}/vocab_c${c}_${i}_arabic.mp3`,
          });
        }
      }

      // Quiz items
      for (const [i, item] of ((cycle.quiz ?? []) as Array<{ arabic?: string }>).entries()) {
        if (item.arabic) {
          entries.push({
            key:     `${lessonId}/quiz_c${c}_${i}`,
            arabic:  item.arabic,
            outPath: path.join(lessonDir, `quiz_c${c}_${i}_arabic.mp3`),
            relPath: `${lessonId}/quiz_c${c}_${i}_arabic.mp3`,
          });
        }
      }

      // Build — each word individually + full sentence
      for (const [bi, build] of ((cycle.build ?? []) as Array<{ sentence?: string[] }>).entries()) {
        const words = build.sentence ?? [];
        if (words.length > 0) {
          // Full joined sentence
          const full = words.join(' ');
          entries.push({
            key:     `${lessonId}/build_c${c}_${bi}_full`,
            arabic:  full,
            outPath: path.join(lessonDir, `build_c${c}_${bi}_sentence_full.mp3`),
            relPath: `${lessonId}/build_c${c}_${bi}_sentence_full.mp3`,
          });
          // Individual words
          for (const [wi, w] of words.entries()) {
            entries.push({
              key:     `${lessonId}/build_c${c}_${bi}_w${wi}`,
              arabic:  w,
              outPath: path.join(lessonDir, `build_c${c}_${bi}_word_${wi}.mp3`),
              relPath: `${lessonId}/build_c${c}_${bi}_word_${wi}.mp3`,
            });
          }
        }
      }

      // Speak turns
      const speak = cycle.speak as { turns?: Array<{ arabic?: string }> } | undefined;
      for (const [ti, turn] of (speak?.turns ?? []).entries()) {
        if (turn.arabic) {
          entries.push({
            key:     `${lessonId}/speak_c${c}_turn_${ti}`,
            arabic:  turn.arabic,
            outPath: path.join(lessonDir, `speak_c${c}_turn_${ti}_arabic.mp3`),
            relPath: `${lessonId}/speak_c${c}_turn_${ti}_arabic.mp3`,
          });
        }
      }
    }

    // Optional review section
    const review = lesson.review as { all_vocab?: Array<{ arabic?: string }> } | undefined;
    for (const [i, word] of (review?.all_vocab ?? []).entries()) {
      if (word.arabic) {
        entries.push({
          key:     `${lessonId}/review_${i}`,
          arabic:  word.arabic,
          outPath: path.join(AUDIO_DIR, lessonId, `review_${i}_arabic.mp3`),
          relPath: `${lessonId}/review_${i}_arabic.mp3`,
        });
      }
    }

    // Optional listen section
    for (const [i, item] of ((lesson.listen ?? []) as Array<{ arabic?: string }>).entries()) {
      if (item.arabic) {
        entries.push({
          key:     `${lessonId}/listen_${i}`,
          arabic:  item.arabic,
          outPath: path.join(AUDIO_DIR, lessonId, `listen_${i}_arabic.mp3`),
          relPath: `${lessonId}/listen_${i}_arabic.mp3`,
        });
      }
    }
  }

  return entries;
}

// ── Checkpoint helpers ────────────────────────────────────────────────────────

async function readCheckpoint(): Promise<Checkpoint> {
  try {
    return JSON.parse(await fs.readFile(CHECKPOINT, 'utf-8')) as Checkpoint;
  } catch {
    return { completed: [], stopped_at: null, total: 0, generated: 0 };
  }
}

async function writeCheckpoint(cp: Checkpoint): Promise<void> {
  await fs.writeFile(CHECKPOINT, JSON.stringify(cp, null, 2));
}

// ── Status file (for AdminAudioScreen IPC) ────────────────────────────────────

let _isGenerating = false;

async function writeStatus(payload: Partial<StatusPayload>): Promise<void> {
  try {
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    await fs.writeFile(STATUS_FILE, JSON.stringify({
      generated:    0,
      total:        0,
      percent:      0,
      currentKey:   '',
      timestamp:    Date.now(),
      isGenerating: _isGenerating,
      ...payload,
    }));
  } catch { /* non-critical */ }
}

// ── Output file writers ───────────────────────────────────────────────────────

async function writeOutputFiles(allEntries: AudioEntry[]): Promise<void> {
  const audioMap: Record<string, string>  = {};
  const textMap:  Record<string, string>  = {};
  const requireLines: string[]            = [];

  for (const e of allEntries) {
    try {
      await fs.access(e.outPath);
      audioMap[e.key]    = e.relPath;
      textMap[e.arabic]  = e.key;
      // Paths relative from frontend/src/generated/ to frontend/src/assets/audio/
      requireLines.push(`  '${e.key.replace(/'/g, "\\'")}': require('../assets/audio/${e.relPath}'),`);
    } catch {
      // File not generated yet — omit from maps
    }
  }

  await fs.writeFile(AUDIO_MAP, JSON.stringify(audioMap, null, 2));
  await fs.writeFile(TEXT_MAP, JSON.stringify(textMap, null, 2));

  const requireMapContent = [
    '// Auto-generated by scripts/generate-audio.ts — do not edit manually',
    '// Run `npm run generate-audio` from the scripts/ directory to regenerate',
    '// eslint-disable-next-line @typescript-eslint/no-require-imports',
    'export const AUDIO_REQUIRE_MAP: Record<string, number> = {',
    ...requireLines,
    '};',
    '',
  ].join('\n');
  await fs.writeFile(REQUIRE_MAP, requireMapContent);

  const count = Object.keys(audioMap).length;
  console.log(`\n📝 audio_map.json    — ${count} entries`);
  console.log(`📝 text_map.json     — ${Object.keys(textMap).length} entries`);
  console.log(`📝 audioRequireMap.ts — ${requireLines.length} require() entries`);
}

// ── Core generation logic ─────────────────────────────────────────────────────

async function runGeneration(
  entries: AudioEntry[],
  voice:   string,
  force:   boolean,
): Promise<void> {
  const cp           = await readCheckpoint();
  const completedSet = new Set(cp.completed);
  const todo         = force ? entries : entries.filter(e => !completedSet.has(e.key));

  console.log(`\n🎵 Generating ${todo.length} files (${entries.length - todo.length} already done)...`);
  cp.total = entries.length;

  const failed: Array<{ key: string; arabic: string; error: string }> = [];
  let doneCount = cp.completed.length;
  _isGenerating = true;

  for (let i = 0; i < todo.length; i += MAX_CONCURRENT) {
    if (signal.aborted) { console.log('\n🛑 Stopped by user.'); break; }

    const batch = todo.slice(i, i + MAX_CONCURRENT);
    await Promise.allSettled(
      batch.map(async (entry) => {
        if (signal.aborted) return;
        try {
          await fs.mkdir(path.dirname(entry.outPath), { recursive: true });
          const audio = await synthesize(entry.arabic, voice);
          await fs.writeFile(entry.outPath, audio);
          cp.completed.push(entry.key);
          doneCount++;
          const pct = Math.round((doneCount / cp.total) * 100);
          process.stdout.write(
            `\r  ${doneCount}/${cp.total} (${pct}%) — ${entry.key.padEnd(50)}`
          );
          await writeStatus({ generated: doneCount, total: cp.total, percent: pct, currentKey: entry.key });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('AbortError') || msg === 'Aborted') return;
          process.stdout.write(`\n  ❌ ${entry.key}: ${msg}\n`);
          failed.push({ key: entry.key, arabic: entry.arabic, error: msg });
        }
      })
    );

    await writeCheckpoint(cp);
    if (i + MAX_CONCURRENT < todo.length) await sleep(BATCH_DELAY_MS);
  }

  process.stdout.write('\n');
  _isGenerating = false;

  if (failed.length > 0) {
    await fs.writeFile(FAILED_FILE, JSON.stringify(failed, null, 2));
    console.log(`\n⚠️  ${failed.length} files failed — see assets/audio/.failed.json`);
  }

  cp.stopped_at = signal.aborted ? new Date().toISOString() : null;
  await writeCheckpoint(cp);
  await writeStatus({ generated: doneCount, total: cp.total, percent: 100, currentKey: '' });
}

// ── HTTP server for AdminAudioScreen IPC ──────────────────────────────────────

function startHttpServer(entries: AudioEntry[], voice: string, force: boolean): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/status' && req.method === 'GET') {
      const cp = await readCheckpoint();
      let statusData: Record<string, unknown> = {
        generated: cp.completed.length, total: cp.total, percent: 0,
        currentKey: '', isGenerating: _isGenerating, stoppedAt: cp.stopped_at,
        timestamp: Date.now(),
      };
      try {
        const raw = JSON.parse(await fs.readFile(STATUS_FILE, 'utf-8')) as Record<string, unknown>;
        statusData = { ...statusData, ...raw };
      } catch { /* use defaults */ }
      res.end(JSON.stringify(statusData));
      return;
    }

    if (req.url === '/info' && req.method === 'GET') {
      const cp = await readCheckpoint();
      res.end(JSON.stringify({
        total:       entries.length,
        completed:   cp.completed.length,
        stoppedAt:   cp.stopped_at,
      }));
      return;
    }

    if (req.url === '/start' && req.method === 'POST') {
      if (!_isGenerating) {
        runGeneration(entries, voice, force)
          .then(() => writeOutputFiles(entries))
          .catch(e => console.error('Generation error:', e));
      }
      res.end(JSON.stringify({ started: !_isGenerating }));
      return;
    }

    if (req.url === '/stop' && req.method === 'POST') {
      globalController.abort();
      res.end(JSON.stringify({ stopped: true }));
      return;
    }

    res.writeHead(404); res.end('{}');
  });

  server.listen(9423, () => {
    console.log('\n🌐 Generation server listening on http://localhost:9423');
    console.log('   Open AdminAudioScreen in the Expo app to control generation.');
    console.log('   Press Ctrl+C to stop.\n');
  });

  // Keep alive
  process.on('SIGINT', () => {
    globalController.abort();
    server.close();
    console.log('\nServer stopped.');
    process.exit(0);
  });
}

// ── CLI argument parser ───────────────────────────────────────────────────────

interface CliArgs {
  lesson:      string | null;
  lessonRange: [number, number] | null;
  force:       boolean;
  dryRun:      boolean;
  voice:       string;
  serve:       boolean;
}

function parseArgs(): CliArgs {
  const args   = process.argv.slice(2);
  const result: CliArgs = {
    lesson: null, lessonRange: null,
    force: false, dryRun: false,
    voice: DEFAULT_VOICE, serve: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lesson'  && args[i + 1]) result.lesson      = args[++i];
    if (args[i] === '--voice'   && args[i + 1]) result.voice       = args[++i];
    if (args[i] === '--force')                   result.force       = true;
    if (args[i] === '--dry-run')                 result.dryRun      = true;
    if (args[i] === '--serve')                   result.serve       = true;
    if (args[i] === '--lessons' && args[i + 1]) {
      const parts = args[++i].split('-').map(Number);
      if (parts.length === 2) result.lessonRange = [parts[0], parts[1]];
    }
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🎙️  LevantiLearn Audio Generator — Azure Cognitive Services TTS\n');

  if (!AZURE_KEY) {
    console.error('❌  AZURE_SPEECH_KEY is not set.\n    Add it to backend/.env and run again.');
    process.exit(1);
  }

  const { lesson, lessonRange, force, dryRun, voice: voiceArg, serve } = parseArgs();

  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(path.dirname(REQUIRE_MAP), { recursive: true });

  // Extract all entries
  let entries = await extractEntries(lesson);

  // Apply numeric range filter (--lessons 001-010)
  if (lessonRange) {
    entries = entries.filter(e => {
      const m = e.key.match(/^[^/]+_(\d+)\//);
      if (!m) return false;
      const n = parseInt(m[1]);
      return n >= lessonRange[0] && n <= lessonRange[1];
    });
  }

  console.log(`📚 ${entries.length} audio entries found across all lessons`);

  if (dryRun) {
    console.log('\n🔍 Dry run — would generate:');
    entries.slice(0, 30).forEach(e => console.log(`  ${e.key} → ${e.relPath}`));
    if (entries.length > 30) console.log(`  ... and ${entries.length - 30} more`);
    return;
  }

  // Validate voice
  let selectedVoice = voiceArg;
  try {
    selectedVoice = await selectVoice(voiceArg);
  } catch (e: unknown) {
    console.error(`❌  ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  // Ctrl+C handler
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping...');
    globalController.abort();
    setTimeout(() => process.exit(130), 600);
  });

  if (serve) {
    startHttpServer(entries, selectedVoice, force);
  } else {
    await runGeneration(entries, selectedVoice, force);
    await writeOutputFiles(entries);

    const cp = await readCheckpoint();
    console.log(`\n✅ Complete — ${cp.completed.length}/${entries.length} audio files.`);
    if (cp.stopped_at) {
      console.log('   Run again without changes to resume from where it stopped.');
    }
  }
}

main().catch(e => {
  console.error('\nFatal error:', e);
  process.exit(1);
});
