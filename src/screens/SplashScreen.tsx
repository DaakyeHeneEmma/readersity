import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {assets} from '../data/books';
import {colors, fontFamily} from '../theme/colors';

export function SplashScreen({onReady}: {onReady: () => void}) {
  return <View style={styles.screen}>
    <Image source={assets.logo} resizeMode="contain" fadeDuration={0} style={styles.logo} />
    <Text style={styles.tagline}>Read, Think &amp; Grow Rich</Text>
    <Text style={styles.journey}>Start Your Journey With Books</Text>
    <Pressable accessibilityRole="button" onPress={onReady} style={styles.ready}><Text style={styles.readyText}>Ready</Text><Text style={styles.arrow}>→</Text></Pressable>
    <Text style={styles.community}>Join The Community</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, alignItems: 'center', backgroundColor: colors.blue},
  logo: {position: 'absolute', top: 100, width: 282, height: 103},
  tagline: {position: 'absolute', top: 195, color: colors.white, fontFamily, fontWeight: '700', fontSize: 13},
  journey: {position: 'absolute', top: 380, color: colors.white, fontFamily, fontWeight: '700', fontSize: 20},
  ready: {position: 'absolute', top: 420, width: 319, height: 55, borderRadius: 20, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 5},
  readyText: {fontFamily, fontSize: 24, fontWeight: '700', color: '#464343'},
  arrow: {fontSize: 25, color: '#464343'},
  community: {position: 'absolute', bottom: 100, color: colors.white, fontFamily, fontWeight: '700', fontSize: 16},
});
