import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RommRom } from '../api/types';
import { colors } from '../theme/colors';
import { RomTile } from './RomTile';

interface Props {
  title: string;
  roms: RommRom[];
  serverUrl: string;
  onSelect: (rom: RommRom) => void;
  /** Optional line under a tile's title, e.g. "Because you played X". */
  subtitleFor?: (rom: RommRom) => string | undefined;
  /** Give the shelf's first tile TV focus on mount. */
  autoFocus?: boolean;
  testID: string;
}

const TILE_WIDTH = 160;

/** A horizontal, Netflix-style row of rom cover art, for the home screen. */
export function RomShelf({
  title,
  roms,
  serverUrl,
  onSelect,
  subtitleFor,
  autoFocus = false,
  testID,
}: Props) {
  if (roms.length === 0) {
    return null;
  }

  return (
    <View style={styles.shelf} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={roms}
        keyExtractor={item => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item, index }) => {
          const subtitle = subtitleFor?.(item);
          return (
            <View style={styles.tileWrap}>
              <RomTile
                rom={item}
                serverUrl={serverUrl}
                onPress={() => onSelect(item)}
                hasTVPreferredFocus={autoFocus && index === 0}
                testID={`${testID}-tile-${item.id}`}
                style={styles.tile}
              />
              {!!subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { marginBottom: 28 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  row: { paddingRight: 32 },
  tileWrap: { width: TILE_WIDTH, marginRight: 14 },
  tile: { width: TILE_WIDTH },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
