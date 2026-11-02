import React from 'react';
import {Image, ImageSourcePropType, ImageStyle, StyleSheet, Text, View, ViewProps} from 'react-native';
import {colors, fontFamily} from '../theme/colors';

type Props = ViewProps & {title?: string; children?: React.ReactNode; backgroundImage?: ImageSourcePropType; backgroundImageStyle?: ImageStyle};

export function ScreenHeader({title, children, style, backgroundImage, backgroundImageStyle, ...props}: Props) {
  return <View style={[styles.header, style]} {...props}>
    {backgroundImage ? <Image pointerEvents="none" source={backgroundImage} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={[styles.backgroundImage, backgroundImageStyle]} /> : null}
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  header: {height: 395, backgroundColor: colors.blue, borderBottomRightRadius: 50, overflow: 'hidden'},
  backgroundImage: {position: 'absolute'},
  title: {position: 'absolute', top: 54, left: 36, color: colors.white, fontFamily, fontWeight: '700', fontSize: 28},
});
