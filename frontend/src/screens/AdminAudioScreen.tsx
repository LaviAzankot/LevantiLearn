/**
 * AdminAudioScreen — development-only screen for managing Azure TTS audio generation.
 * Only rendered when __DEV__ === true (enforced in app/admin.tsx route).
 *
 * IPC:  The generation script (scripts/generate-audio.ts --serve) runs a tiny HTTP
 *       server on port 9423. This screen polls /status every 2s and sends commands
 *       to /start and /stop. Works in iOS Simulator and Android Emulator out of the box.
 *       On a physical device, ensure the dev machine is reachable at localhost (use the
 *       same Wi-Fi network or USB tethering).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SERVER = 'http://localhost:9423';
const POLL_MS = 2000;

// Read bundled maps to compute baseline stats
let bundledAudioMapCount = 0;
let bundledTextMapCount  = 0;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  bundledAudioMapCount = Object.keys(require('../assets/audio/audio_map.json')).length;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  bundledTextMapCount  = Object.keys(require('../assets/audio/text_map.json')).length;
} catch { /* not generated yet */ }

interface ServerStatus {
  generated:    number;
  total:        number;
  percent:      number;
  currentKey:   string;
  isGenerating: boolean;
  stoppedAt:    string | null;
  timestamp:    number;
}

export function AdminAudioScreen() {
  const [online,  setOnline]  = useState(false);
  const [status,  setStatus]  = useState<ServerStatus | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [logs,    setLogs]    = useState<string[]>([]);
  const scrollRef             = useRef<ScrollView>(null);
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const log = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${t}] ${msg}`]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/status`, {
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ServerStatus;
      setStatus(data);
      setOnline(true);
    } catch {
      setOnline(false);
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  const handleGenerate = async () => {
    if (!online) {
      Alert.alert(
        'Generation Server Not Running',
        'Start it from a terminal:\n\ncd scripts\nnpm install\nnpm run generate-audio:serve',
        [{ text: 'OK' }],
      );
      return;
    }
    setBusy(true);
    log('Sending start command...');
    try {
      const res  = await fetch(`${SERVER}/start`, { method: 'POST' });
      const data = await res.json() as { started: boolean };
      log(data.started ? 'Generation started.' : 'Already running.');
    } catch (e: unknown) {
      log(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  };

  const handleStop = async () => {
    log('Sending stop signal...');
    try {
      await fetch(`${SERVER}/stop`, { method: 'POST' });
      log('Stop signal sent — generation will halt after current batch.');
    } catch (e: unknown) {
      log(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleClearInfo = () => {
    Alert.alert(
      'Clear Audio Cache',
      'To fully clear the audio cache:\n\n1. Delete frontend/src/assets/audio/*.mp3 (and subdirectories)\n2. Reset frontend/src/assets/audio/audio_map.json to {}\n3. Reset frontend/src/assets/audio/text_map.json to {}\n4. Reset frontend/src/generated/audioRequireMap.ts to empty map\n5. Restart Metro bundler\n\nThis cannot be undone from the app.',
      [{ text: 'Understood' }],
    );
  };

  const generated  = status?.generated   ?? bundledAudioMapCount;
  const total      = status?.total        ?? bundledTextMapCount;
  const pct        = total > 0 ? Math.round((generated / total) * 100) : 0;
  const isRunning  = status?.isGenerating ?? false;
  const wasStopped = !!status?.stoppedAt;

  return (
    <SafeAreaView style={s.root}>
      <Text style={s.title}>🎙 Audio Admin</Text>
      <Text style={s.sub}>Azure TTS Generation — dev only</Text>

      {/* Status card */}
      <View style={s.card}>
        <Row label="Server"     value={online ? 'Running' : 'Offline'} valueColor={online ? '#34c759' : '#ff3b30'} dot={online} />
        <Row label="Generated"  value={`${generated} / ${total} files`} />
        <Row label="Status"     value={isRunning ? '⏳ Generating…' : wasStopped ? '⏸ Stopped' : '✅ Idle'} />

        {/* Progress bar */}
        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${pct}%` as `${number}%` }]} />
        </View>
        <Text style={s.pctTxt}>{pct}%</Text>

        {isRunning && status?.currentKey ? (
          <Text style={s.curKey} numberOfLines={1}>{status.currentKey}</Text>
        ) : null}
        {wasStopped ? (
          <Text style={s.stoppedTxt}>Stopped at {status?.stoppedAt} — run again to resume</Text>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={s.btnRow}>
        <Btn
          label={busy ? '' : 'Generate'}
          color="#34c759"
          onPress={handleGenerate}
          disabled={busy || isRunning}
          loading={busy}
        />
        <Btn
          label="STOP"
          color="#ff3b30"
          onPress={handleStop}
          disabled={!online || !isRunning}
        />
        <Btn label="Info" color="#8e8e93" onPress={handleClearInfo} />
      </View>

      {/* Setup instructions (shown when server is offline) */}
      {!online && (
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>How to start the generation server</Text>
          <Text style={s.infoCode}>{'cd scripts\nnpm install\nnpm run generate-audio:serve'}</Text>
          <Text style={s.infoNote}>Requires AZURE_SPEECH_KEY in backend/.env</Text>
        </View>
      )}

      {/* Live log */}
      <Text style={s.logHdr}>Log</Text>
      <ScrollView ref={scrollRef} style={s.logBox} contentContainerStyle={s.logContent}>
        {logs.length === 0
          ? <Text style={s.logEmpty}>No activity yet.</Text>
          : logs.map((l, i) => <Text key={i} style={s.logLine}>{l}</Text>)
        }
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Row({
  label, value, valueColor, dot,
}: { label: string; value: string; valueColor?: string; dot?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      {dot !== undefined && (
        <View style={[s.dot, { backgroundColor: dot ? '#34c759' : '#ff3b30' }]} />
      )}
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Btn({
  label, color, onPress, disabled, loading,
}: { label: string; color: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: color }, disabled && s.btnOff]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={s.btnTxt}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f4f1eb', padding: 16 },
  title:      { fontSize: 22, fontWeight: '800', color: '#28261f' },
  sub:        { fontSize: 12, color: '#7a7670', marginBottom: 14 },
  card:       { backgroundColor: '#fefcf7', borderRadius: 16, borderWidth: 1, borderColor: '#e2ddd5', padding: 14, marginBottom: 12 },
  row:        { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowLabel:   { fontSize: 13, color: '#7a7670', flex: 1 },
  dot:        { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  rowValue:   { fontSize: 13, fontWeight: '600', color: '#28261f' },
  barBg:      { height: 7, backgroundColor: '#e2ddd5', borderRadius: 4, marginVertical: 8, overflow: 'hidden' },
  barFill:    { height: '100%', backgroundColor: '#fe4d01', borderRadius: 4 },
  pctTxt:     { fontSize: 11, color: '#7a7670', textAlign: 'right' },
  curKey:     { fontSize: 10, color: '#7a7670', marginTop: 4, fontStyle: 'italic' },
  stoppedTxt: { fontSize: 11, color: '#ff9500', marginTop: 4 },
  btnRow:     { flexDirection: 'row', gap: 10, marginBottom: 12 },
  btn:        { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOff:     { opacity: 0.38 },
  btnTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  infoCard:   { backgroundColor: '#fffbe6', borderRadius: 12, borderWidth: 1, borderColor: '#ffd60a', padding: 12, marginBottom: 12 },
  infoTitle:  { fontSize: 13, fontWeight: '700', color: '#3c3300', marginBottom: 6 },
  infoCode:   { fontSize: 11, fontFamily: 'monospace', color: '#1c1800', backgroundColor: '#f0edd8', padding: 10, borderRadius: 8, marginBottom: 6 },
  infoNote:   { fontSize: 11, color: '#7a6d00' },
  logHdr:     { fontSize: 13, fontWeight: '700', color: '#28261f', marginBottom: 5 },
  logBox:     { flex: 1, backgroundColor: '#1c1914', borderRadius: 12 },
  logContent: { padding: 10 },
  logEmpty:   { color: '#7a7670', fontSize: 11, fontStyle: 'italic' },
  logLine:    { color: '#c8c4bb', fontSize: 10, fontFamily: 'monospace', marginBottom: 2 },
});
