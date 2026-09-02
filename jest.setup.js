// hooks/*.ts import lib/supabase.ts, which calls createClient() at module
// load time and throws if these env vars are missing — Jest doesn't get
// them from Expo's normal env-injection, so a placeholder here keeps any
// test file that transitively imports a hook from crashing on import alone.
// No real network calls happen unless a test actually invokes the client.
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";
