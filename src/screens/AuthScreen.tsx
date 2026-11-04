import React, {useState} from 'react';
import {ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {GoogleSignin, isSuccessResponse} from '@react-native-google-signin/google-signin';
import {AUTH_REDIRECT_URL, completeAuthRedirect, supabase} from '../data/supabaseClient';
import {colors, fontFamily} from '../theme/colors';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
if (googleWebClientId) {
  GoogleSignin.configure({webClientId: googleWebClientId, iosClientId: googleIosClientId, offlineAccess: false});
}

type Props = {onAuthenticated: () => void; onBack: () => void};

export function AuthScreen({onAuthenticated, onBack}: Props) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    const finishRedirect = (url: string) => {
      if (!url.startsWith('readersity://auth/')) return;
      if (new URL(url).searchParams.has('code')) return;
      completeAuthRedirect(url).then(onAuthenticated).catch(error => Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.'));
    };
    const subscription = Linking.addEventListener('url', ({url}) => finishRedirect(url));
    Linking.getInitialURL().then(url => { if (url) finishRedirect(url); });
    return () => subscription.remove();
  }, [onAuthenticated]);

  const handleEmail = async () => {
    if (!supabase) {
      Alert.alert('Authentication unavailable', 'Add the Supabase URL and publishable key to the app environment.');
      return;
    }
    setBusy(true);
    try {
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({email: email.trim(), password})
        : await supabase.auth.signUp({email: email.trim(), password, options: {emailRedirectTo: AUTH_REDIRECT_URL}});
      if (result.error) throw result.error;
      if (result.data.session) onAuthenticated();
      else Alert.alert('Check your email', 'Use the confirmation link to finish creating your account, then return to Readersity and sign in.');
    } catch (error) {
      Alert.alert(mode === 'sign-in' ? 'Sign-in failed' : 'Sign-up failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (!supabase) {
      Alert.alert('Authentication unavailable', 'Add the Supabase URL and publishable key to the app environment.');
      return;
    }
    if (!googleWebClientId) {
      Alert.alert('Google sign-in needs setup', 'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env, then rebuild the development app.');
      return;
    }
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return;
      const idToken = result.data.idToken;
      if (!idToken) throw new Error('Google did not return an ID token. Check the Google Web OAuth client ID.');
      const {error} = await supabase.auth.signInWithIdToken({provider: 'google', token: idToken});
      if (error) throw error;
      onAuthenticated();
    } catch (error) {
      Alert.alert('Google sign-in failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹  Continue browsing</Text></Pressable>
      <View style={styles.intro}><Text style={styles.title}>{mode === 'sign-in' ? 'Your shelf, anywhere' : 'Create your account'}</Text><Text style={styles.subtitle}>Sign in to save books to your personal shelf.</Text></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={handleGoogle} style={styles.google}><Text style={styles.googleText}>Continue with Google</Text></Pressable>
      <Text style={styles.or}>or continue with email</Text>
      <Text style={styles.label}>Email</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" style={styles.input} />
      <Text style={styles.label}>Password</Text><TextInput autoCapitalize="none" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy || !email.trim() || !password} onPress={handleEmail} style={[styles.primary, (busy || !email.trim() || !password) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === 'sign-in' ? 'Sign In' : 'Create Account'}</Text>}</Pressable>
      <Pressable disabled={busy} onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}><Text style={styles.switch}>{mode === 'sign-in' ? 'New to Readersity? Create an account' : 'Already have an account? Sign in'}</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.white}, content: {flexGrow: 1, paddingHorizontal: 26, paddingTop: 22, paddingBottom: 44}, back: {fontFamily, color: colors.blue, fontSize: 17}, intro: {marginTop: 70, marginBottom: 30}, title: {fontFamily, color: colors.ink, fontSize: 29, fontWeight: '700'}, subtitle: {fontFamily, color: colors.muted, fontSize: 15, marginTop: 8}, google: {height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#D4D8E1', alignItems: 'center', justifyContent: 'center'}, googleText: {fontFamily, color: colors.ink, fontSize: 16, fontWeight: '700'}, or: {textAlign: 'center', color: colors.muted, fontFamily, marginVertical: 23}, label: {fontFamily, color: colors.ink, fontWeight: '700', marginBottom: 7}, input: {height: 50, borderWidth: 1, borderColor: '#D4D8E1', borderRadius: 10, paddingHorizontal: 13, marginBottom: 18, fontFamily, color: colors.ink}, primary: {height: 52, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 5}, disabled: {opacity: 0.55}, primaryText: {fontFamily, color: colors.white, fontSize: 17, fontWeight: '700'}, switch: {fontFamily, color: colors.blue, fontWeight: '700', textAlign: 'center', marginTop: 22},
});
