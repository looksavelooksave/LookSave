import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ApiError } from '../../src/api/client';
import { Icon } from '../../src/components/Icon';
import { goBack } from '../../src/navigation/back';
import { useI18n } from '../../src/i18n';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing, text } from '../../src/theme/tokens';

const IMG_BG = require('../../assets/auth-bg.jpg');
const IMG_PHONE = require('../../assets/signup-phone-icon.png');

export default function SignIn(): JSX.Element {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const t = useI18n((state) => state.t);
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await signIn(phone.replace(/\s/g, ''), password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ImageBackground source={IMG_BG} style={styles.bg} resizeMode="cover">
      <StatusBar style="light" translucent />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(10,10,15,0.05)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.96)']}
        locations={[0, 0.4, 0.8]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Yuqori qator: orqaga + tagline ── */}
          <View style={styles.topRow}>
            {/*
              Zaxira `'/(tabs)'` — `'/'` EMAS: `app/index.tsx` faqat
              `(tabs)` ga yo'naltiradi va halqa hosil bo'lardi
              (`src/navigation/back.ts` izohiga qarang).
            */}
            <Pressable
              style={styles.backBtn}
              onPress={() => goBack('/(tabs)')}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Icon name="back" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.tagline}>Your world{'\n'}in one app</Text>
          </View>

          {/* ── Sarlavha ── */}
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>Sign </Text>
            <Text style={styles.titlePurple}>in</Text>
          </View>
          <Text style={styles.subtitle}>Welcome back! Glad to see you again 💜</Text>

          {/* ── PHONE ── */}
          <Text style={styles.label}>PHONE</Text>
          <View style={styles.field}>
            <Image source={IMG_PHONE} style={styles.fieldIcon} resizeMode="contain" />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="+998"
              placeholderTextColor={colors.textDim}
            />
          </View>

          {/* ── PASSWORD ── */}
          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.field}>
            <View style={styles.lockBox}>
              <Icon name="authentic" size={20} color={colors.accent} />
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="current-password"
              textContentType="password"
              placeholder="Enter your password"
              placeholderTextColor={colors.textDim}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={10}>
              <Icon name={showPass ? 'eyeOff' : 'eye'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Forgot password */}
          <Pressable style={styles.forgotWrap} accessibilityRole="button">
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* ── Sign in tugmasi ── */}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.88 }]}
            onPress={() => void submit()}
            disabled={busy}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.submitText}>{busy ? 'Yuklanmoqda...' : t.auth.signIn}</Text>
            <View style={styles.submitArrow}>
              <Icon name="next" size={18} color={colors.text} />
            </View>
          </Pressable>

          {/* Hint */}
          <Text style={styles.hint}>
            Parolni unutdingizmi? Hozircha qo&apos;llab-quvvatlash xizmatiga yozing — tiklash tez
            orada qo&apos;shiladi.
          </Text>

          <View style={{ flex: 1, minHeight: 80 }} />

          {/* ── Pastki qator: badge + sloganlar ── */}
          <View style={styles.bottomRow}>
            <View style={styles.betterBadge}>
              <View style={styles.betterDot} />
              <Text style={styles.betterText}>Better{'\n'}Together</Text>
            </View>

            <View style={styles.sloganCol}>
              <Text style={styles.sloganText}>Simple</Text>
              <Text style={styles.sloganText}>Secure</Text>
              <Text style={styles.sloganText}>Reliable</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xs },

  /* ── Yuqori qator ── */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(36,31,51,0.85)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tagline: {
    ...text.small,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
  },

  /* ── Sarlavha ── */
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleWhite: { fontSize: 36, fontWeight: '800', color: colors.text },
  titlePurple: { fontSize: 36, fontWeight: '800', color: colors.primary },
  subtitle: { ...text.body, color: colors.textMuted, marginBottom: spacing.sm },

  /* ── Label ── */
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textDim,
    marginTop: spacing.md,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  /* ── Field ── */
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,18,28,0.84)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    height: 58,
    gap: spacing.sm,
  },
  fieldIcon: { width: 44, height: 44 },
  lockBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...text.body,
    color: colors.text,
    paddingVertical: 0,
  },

  /* Forgot */
  forgotWrap: { alignSelf: 'flex-end', marginTop: spacing.sm },
  forgotText: { ...text.small, color: colors.accent },

  /* Error */
  error: { ...text.small, color: colors.danger, textAlign: 'center', marginTop: spacing.xs },

  /* ── Submit ── */
  submitBtn: {
    height: 58,
    borderRadius: radius.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  submitText: { ...text.bodyMed, color: colors.text, flex: 1, textAlign: 'center' },
  submitArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hint */
  hint: {
    ...text.small,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },

  /* ── Pastki qator ── */
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  betterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(36,31,51,0.75)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  betterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  betterText: { ...text.small, color: colors.text, fontWeight: '600' },
  sloganCol: { alignItems: 'flex-end', gap: 2 },
  sloganText: { ...text.tiny, color: colors.textDim, letterSpacing: 0.5 },
});
