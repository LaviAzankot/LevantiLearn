/**
 * UnsplashImage — fetches a CC0-licensed image by search query
 * Uses Unsplash Source API (free, no auth needed for source.unsplash.com)
 * Falls back to emoji if image fails to load.
 */

import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle } from 'react-native';

interface Props {
  query: string;
  style?: ImageStyle;
  fallbackEmoji?: string;
  width?: number;
  height?: number;
}

export function UnsplashImage({ query, style, fallbackEmoji = '🖼️', width = 400, height = 300 }: Props) {
  const [failed, setFailed] = useState(false);

  // source.unsplash.com returns random CC0 image for query — no API key needed
  const uri = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}`;

  if (failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setFailed(true)}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#F0EDE6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  fallbackEmoji: { fontSize: 48 },
});
