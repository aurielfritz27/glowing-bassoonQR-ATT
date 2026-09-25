import type { Session, User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

import { isMissingSchemaError, PROFILE_SETUP_HINT } from './profiles';
import { isSupabaseConfigured, supabase } from './supabase';

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

let state: AuthState = { session: null, user: null, loading: true };
const listeners = new Set<() => void>();
let initialized = false;

function emit(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAuth(session: Session | null) {
  emit({ session, user: session?.user ?? null, loading: false });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export async function initializeAuth() {
  if (initialized) return;
  initialized = true;

  if (!isSupabaseConfigured) {
    setAuth(null);
    return;
  }

  const { data } = await supabase.auth.getSession();
  setAuth(data.session);
  supabase.auth.onAuthStateChange((_event, session) => setAuth(session));
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: profile
      ? {
          data: {
            full_name: profile.full_name,
            role: profile.role,
          },
        }
      : undefined,
  });

  if (!error && data.session) {
    if (profile) {
      // Upsert (instead of update) so the row is also created for accounts that
      // signed up before the on_auth_user_created trigger existed.
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.session.user.id,
          email: data.session.user.email ?? email,
          full_name: profile.full_name,
          role: profile.role,
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.warn(
          'signUp: could not save the profile row.',
          isMissingSchemaError(profileError) ? PROFILE_SETUP_HINT : profileError.message
        );
      }
    }
    setAuth(data.session);
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.session) setAuth(data.session);
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) setAuth(null);
  return { error };
}
