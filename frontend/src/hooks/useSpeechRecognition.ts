/**
 * useSpeechRecognition — hook for recording user speech
 * Records audio via Expo AV, returns Blob for Whisper scoring
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const requestPermission = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    setPermissionGranted(granted);
    return granted;
  }, []);

  const startRecording = useCallback(async () => {
    const hasPermission = permissionGranted || (await requestPermission());
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
        bitsPerSecond: 128000,
      },
    });

    await recording.startAsync();
    recordingRef.current = recording;
    setIsRecording(true);
  }, [permissionGranted]);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    if (!recordingRef.current) {
      throw new Error('No active recording');
    }

    await recordingRef.current.stopAndUnloadAsync();
    setIsRecording(false);

    const uri = recordingRef.current.getURI();
    recordingRef.current = null;

    if (!uri) throw new Error('Recording URI is null');

    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  }, []);

  return {
    isRecording,
    permissionGranted,
    startRecording,
    stopRecording,
    requestPermission,
  };
}
