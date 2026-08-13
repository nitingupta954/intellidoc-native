import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Text from './Text';
import { Colors } from '../theme/colors';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const {
    state,
    errorType,
    countdown,
    startRecording,
    stopRecording,
    resetVoice,
  } = useVoiceRecorder(onTranscript);

  // Pulse animation for recording state
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseAnim.stopAnimation();
    }
  }, [state, pulseAnim]);

  // Auto-reset error state after 3 seconds
  useEffect(() => {
    if (state === 'error' && errorType !== 'permission-denied') {
      const timer = setTimeout(() => {
        resetVoice();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state, errorType, resetVoice]);

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (state === 'idle' || state === 'error') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isError = state === 'error';
  const isDisabled = disabled || isProcessing || errorType === 'permission-denied';

  const renderIcon = () => {
    if (isRecording) {
      return <Feather name="square" size={16} color="#fff" />;
    } else if (isProcessing) {
      return <ActivityIndicator size="small" color={Colors.primary} />;
    } else if (errorType === 'permission-denied') {
      return <Feather name="mic-off" size={18} color={Colors.textMuted} />;
    } else if (isError) {
      return <Feather name="alert-circle" size={18} color={Colors.warning} />;
    }
    return <Feather name="mic" size={18} color={isDisabled ? Colors.textMuted : Colors.primary} />;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleClick}
        disabled={isDisabled}
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
        ]}
      >
        <Animated.View style={isRecording ? { transform: [{ scale: pulseAnim }] } : undefined}>
          {renderIcon()}
        </Animated.View>
      </TouchableOpacity>

      {/* Popups */}
      {errorType === 'permission-denied' && (
        <View style={styles.popup}>
          <Text style={styles.popupText}>Mic denied</Text>
        </View>
      )}
      
      {errorType === 'too-short' && (
        <View style={styles.popup}>
          <Text style={styles.popupText}>Too short</Text>
        </View>
      )}

      {errorType === 'empty-audio' && (
        <View style={styles.popup}>
          <Text style={styles.popupText}>Couldn't hear anything</Text>
        </View>
      )}

      {isRecording && countdown !== null && (
        <View style={styles.popup}>
          <Text style={styles.popupText}>{formatCountdown(countdown)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    backgroundColor: Colors.primary,
  },
  popup: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  popupText: {
    fontSize: 10,
    color: Colors.text,
  },
});
