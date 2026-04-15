import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';

export interface TextProps extends RNTextProps {
  weight?: '400' | '500' | '600' | '700' | '800' | 'bold' | 'normal';
}

export function Text({ style, weight, ...props }: TextProps) {
  let fontFamily = 'Manrope_400Regular';

  let resolvedWeight = weight;
  if (!resolvedWeight && style) {
    const flatStyle = StyleSheet.flatten(style) as TextStyle;
    if (flatStyle && flatStyle.fontWeight) {
      resolvedWeight = flatStyle.fontWeight as any;
    }
  }

  if (resolvedWeight) {
    switch (resolvedWeight) {
      case '500':
        fontFamily = 'Manrope_500Medium';
        break;
      case '600':
        fontFamily = 'Manrope_600SemiBold';
        break;
      case '700':
      case 'bold':
        fontFamily = 'Manrope_700Bold';
        break;
      case '800':
        fontFamily = 'Manrope_800ExtraBold';
        break;
      default:
        fontFamily = 'Manrope_400Regular';
    }
  }

  return (
    <RNText
      {...props}
      style={[
        { fontFamily },
        style,
        // Remove fontWeight to avoid conflicts with custom font files on iOS/Android
        resolvedWeight ? { fontWeight: undefined } : undefined
      ]}
    />
  );
}

export default Text;
