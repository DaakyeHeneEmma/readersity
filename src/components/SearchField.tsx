import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, fontFamily} from '../theme/colors';

type Props = {value: string; onChangeText: (value: string) => void; placeholder: string};

export function SearchField({value, onChangeText, placeholder}: Props) {
  return <View style={styles.row}>
    <Text style={styles.icon}>⌕</Text>
    <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.paleBlue} style={styles.input} returnKeyType="search" />
  </View>;
}

const styles = StyleSheet.create({
  row: {height: 44, flexDirection: 'row', alignItems: 'center'},
  icon: {fontSize: 32, color: colors.white, fontWeight: '700'},
  input: {marginLeft: 17, flex: 1, height: 44, borderLeftWidth: 1, borderColor: colors.white, color: colors.white, paddingLeft: 18, fontFamily},
});
