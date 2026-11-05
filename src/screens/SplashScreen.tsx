import React, {useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, Text, View} from 'react-native';
import {assets} from '../data/books';
import {colors, fontFamily} from '../theme/colors';

export function SplashScreen({onReady}: {onReady: () => void}) {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const animations = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 120),
      Animated.timing(dot, {toValue: 1, duration: 240, useNativeDriver: true}),
      Animated.timing(dot, {toValue: 0, duration: 240, useNativeDriver: true}),
      Animated.delay(360 - index * 120),
    ])));
    animations.forEach(animation => animation.start());
    const timer = setTimeout(() => onReadyRef.current(), 1500);
    return () => {
      clearTimeout(timer);
      animations.forEach(animation => animation.stop());
    };
  }, [dots]);

  return <View style={styles.screen}>
    <View style={styles.brand}>
      <Image source={assets.logo} resizeMode="contain" fadeDuration={0} style={styles.logo} />
      <Text style={styles.tagline}>Read, Think &amp; Grow Rich</Text>
    </View>
    <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Loading Readersity">
      <View style={styles.dots}>{dots.map((dot, index) => <Animated.View key={index} style={[styles.dot, {opacity: dot.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]}), transform: [{translateY: dot.interpolate({inputRange: [0, 1], outputRange: [0, -7]})}]}]} />)}</View>
      <Text style={styles.loadingText}>Getting your library ready</Text>
    </View>
    <Text style={styles.footer}>Your next chapter starts here</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue},
  brand: {alignItems: 'center', marginTop: -40},
  logo: {width: 250, height: 92},
  tagline: {color: colors.white, fontFamily, fontWeight: '700', fontSize: 13, marginTop: 3},
  loading: {alignItems: 'center', marginTop: 70},
  dots: {height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold},
  loadingText: {marginTop: 10, color: 'rgba(255,255,255,.82)', fontFamily, fontSize: 13},
  footer: {position: 'absolute', bottom: 46, color: 'rgba(255,255,255,.72)', fontFamily, fontWeight: '700', fontSize: 13},
});
