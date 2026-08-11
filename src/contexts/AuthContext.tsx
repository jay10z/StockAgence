import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import supabase from '../lib/supabase';
import type { Profile } from '../lib/types';

const PROFILE_CACHE_KEY = 'stockagence_profile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileError: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

function readCachedProfile(userId: string): Profile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    if (parsed?.id === userId) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedProfile(profile: Profile | null) {
  try {
    if (profile) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchProfileDirect(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, agency_id, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Impossible de charger le profil');
  if (!data) throw new Error('Profil introuvable');

  let agency_name: string | undefined;
  if (data.agency_id) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', data.agency_id)
      .maybeSingle();
    agency_name = agency?.name || undefined;
  }

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    agency_id: data.agency_id,
    created_at: data.created_at,
    agency_name,
  };
}

async function fetchProfileViaApi(accessToken: string): Promise<Profile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('/api/profile', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur profil');
    return data as Profile;
  } finally {
    clearTimeout(timeout);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const loadingUserRef = useRef<string | null>(null);
  const profileRef = useRef<Profile | null>(null);

  const applyProfile = useCallback((p: Profile | null) => {
    profileRef.current = p;
    setProfile(p);
    writeCachedProfile(p);
  }, []);

  const loadProfile = useCallback(
    async (userId: string, accessToken?: string, force = false) => {
      if (!force && profileRef.current?.id === userId) {
        setProfileError(null);
        return profileRef.current;
      }

      // Avoid duplicate in-flight loads for same user
      if (!force && loadingUserRef.current === userId && profileRef.current?.id === userId) {
        return profileRef.current;
      }
      loadingUserRef.current = userId;

      // Instant paint from cache
      const cached = readCachedProfile(userId);
      if (cached && !profileRef.current) {
        applyProfile(cached);
        setProfileError(null);
      }

      try {
        // Primary: direct Supabase client (fast, no serverless cold start)
        const p = await fetchProfileDirect(userId);
        applyProfile(p);
        setProfileError(null);
        return p;
      } catch (directErr) {
        // Fallback: API route (service role) if RLS blocks client
        if (accessToken) {
          try {
            const p = await fetchProfileViaApi(accessToken);
            applyProfile(p);
            setProfileError(null);
            return p;
          } catch (apiErr) {
            const msg =
              apiErr instanceof Error
                ? apiErr.message
                : directErr instanceof Error
                  ? directErr.message
                  : 'Chargement du profil impossible';
            if (!profileRef.current) setProfileError(msg);
            throw apiErr;
          }
        } else {
          const msg =
            directErr instanceof Error ? directErr.message : 'Chargement du profil impossible';
          if (!profileRef.current) setProfileError(msg);
          throw directErr;
        }
      } finally {
        if (loadingUserRef.current === userId) loadingUserRef.current = null;
      }
    },
    [applyProfile]
  );

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user?.id) {
      await loadProfile(s.user.id, s.access_token, true);
    }
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;
    let initialDone = false;

    const bootstrap = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user?.id) {
          const cached = readCachedProfile(s.user.id);
          if (cached) {
            applyProfile(cached);
            // Show UI immediately with cache, then refresh in background
            if (mounted) setLoading(false);
            initialDone = true;
            loadProfile(s.user.id, s.access_token, true).catch(() => {});
            return;
          }
          await loadProfile(s.user.id, s.access_token);
        } else {
          applyProfile(null);
          setProfileError(null);
        }
      } catch {
        /* profile error already set in loadProfile */
      } finally {
        if (mounted) {
          setLoading(false);
          initialDone = true;
        }
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Skip INITIAL_SESSION — bootstrap already handled it
      if (event === 'INITIAL_SESSION') return;

      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user?.id) {
        // Don't block UI on TOKEN_REFRESHED if we already have profile
        if (event === 'TOKEN_REFRESHED' && profileRef.current?.id === s.user.id) {
          return;
        }

        if (!initialDone) setLoading(true);

        loadProfile(s.user.id, s.access_token, event === 'SIGNED_IN')
          .catch(() => {})
          .finally(() => {
            if (mounted) setLoading(false);
          });
      } else {
        applyProfile(null);
        setProfileError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyProfile, loadProfile]);

  const signOut = async () => {
    applyProfile(null);
    setProfileError(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, profileError, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
