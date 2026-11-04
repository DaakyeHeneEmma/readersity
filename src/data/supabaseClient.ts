import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';
import {AppState, Platform} from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const AUTH_REDIRECT_URL = 'readersity://auth/callback';

export async function completeAuthRedirect(url: string): Promise<void> {
  if (!supabase) return;
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  if (code) {
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const tokenHash = parsed.searchParams.get('token_hash');
  const type = parsed.searchParams.get('type');
  if (tokenHash && type === 'signup') {
    const {error} = await supabase.auth.verifyOtp({token_hash: tokenHash, type: 'signup'});
    if (error) throw error;
    return;
  }
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken && refreshToken) {
    const {error} = await supabase.auth.setSession({access_token: accessToken, refresh_token: refreshToken});
    if (error) throw error;
  }
}
