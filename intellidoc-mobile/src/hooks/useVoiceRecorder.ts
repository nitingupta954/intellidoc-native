import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import api from '../api/client';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'error';
export type VoiceErrorType = 'permission-denied' | 'empty-audio' | 'too-short' | 'network-error' | null;

interface UseVoiceRecorderReturn {
  state: VoiceState;
  errorType: VoiceErrorType;
  countdown: number | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetVoice: () => void;
}

const MAX_DURATION_MS = 60000; // 60 seconds
const MIN_AUDIO_MS = 1000; // 1 sec minimum

export function useVoiceRecorder(onTranscript: (text: string) => void): UseVoiceRecorderReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorType, setErrorType] = useState<VoiceErrorType>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupIntervals = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCountdown(null);
  }, []);

  const resetVoice = useCallback(() => {
    setState('idle');
    setErrorType(null);
    cleanupIntervals();
  }, [cleanupIntervals]);

  const transcribeAudio = useCallback(async (uri: string) => {
    setState('processing');
    setErrorType(null);

    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'voice-recording.m4a');
      } else {
        formData.append('file', {
          uri,
          name: 'voice-recording.m4a',
          type: 'audio/m4a',
        } as any);
      }

      const response = await api.post('/api/voice/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      if (data.transcript && data.transcript.trim().length > 0) {
        onTranscript(data.transcript);
        setState('idle');
      } else {
        setState('error');
        setErrorType('empty-audio');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setState('error');
      setErrorType('network-error');
    }
  }, [onTranscript]);

  const stopRecording = useCallback(async () => {
    cleanupIntervals();
    if (!recordingRef.current || state !== 'recording') return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      const duration = Date.now() - startTimeRef.current;
      if (duration < MIN_AUDIO_MS) {
        setState('error');
        setErrorType('too-short');
        return;
      }

      if (uri) {
        await transcribeAudio(uri);
      } else {
        throw new Error('No URI');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      setState('error');
      setErrorType('network-error');
    }
  }, [state, cleanupIntervals, transcribeAudio]);

  const startRecording = useCallback(async () => {
    try {
      setErrorType(null);

      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        setState('error');
        setErrorType('permission-denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setState('recording');

      // Countdown logic
      let secondsLeft = Math.floor(MAX_DURATION_MS / 1000);
      setCountdown(secondsLeft);

      countdownIntervalRef.current = setInterval(() => {
        secondsLeft -= 1;
        setCountdown(secondsLeft);
      }, 1000);

      // Auto stop after max duration
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_DURATION_MS);

    } catch (error) {
      console.error('Failed to start recording', error);
      setState('error');
      setErrorType('permission-denied');
    }
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      cleanupIntervals();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [cleanupIntervals]);

  return {
    state,
    errorType,
    countdown,
    startRecording,
    stopRecording,
    resetVoice,
  };
}
