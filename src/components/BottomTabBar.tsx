import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, fontFamily} from '../theme/colors';

type TabScreen = 'splash' | 'home' | 'search' | 'shelf' | 'details';
type Props = {screen: TabScreen; onNavigate: (screen: TabScreen) => void};
const tabs: {screen: TabScreen; label: string; icon: string}[] = [
  {screen: 'home', label: 'Home', icon: '⌂'},
  {screen: 'search', label: 'Search', icon: '⌕'},
  {screen: 'shelf', label: 'Shelf', icon: '▤'},
];

export function BottomTabBar({screen, onNavigate}: Props) {
  const activeScreen = screen === 'details' ? 'search' : screen;
  return <View style={styles.bar}>
    {tabs.map(tab => {
      const selected = activeScreen === tab.screen;
      return <Pressable key={tab.screen} hitSlop={8} accessibilityRole="button" accessibilityState={{selected}} accessibilityLabel={tab.label} onPress={() => onNavigate(tab.screen)} style={[styles.button, selected && styles.selected]}>
        <Text style={[styles.icon, selected && styles.selectedIcon]}>{tab.icon}</Text>
        {selected ? <Text style={styles.label}>{tab.label}</Text> : null}
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bar: {position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around'},
  button: {height: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7},
  selected: {paddingHorizontal: 14, backgroundColor: colors.white, borderRadius: 20},
  icon: {fontSize: 27, color: colors.white},
  selectedIcon: {color: colors.blue},
  label: {fontFamily, fontWeight: '700', fontSize: 13, color: colors.blue},
});
