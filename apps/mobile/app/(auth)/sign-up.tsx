import { registerSchema } from '@looksave/validation';
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
import { useI18n } from '../../src/i18n';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing, text } from '../../src/theme/tokens';

const IMG_HERO = require('../../assets/signup-hero-icon.png');
const IMG_PHONE = require('../../assets/signup-phone-icon.png');
const IMG_NAME = require('../../assets/signup-name-icon.png');
const IMG_BG = require('../../assets/auth-bg.jpg');

export default function SignUp(): JSX.Element {
  const router = useRouter();
  const signUp = useAuthStore((state) => state.signUp);
  const t = useI18n((state) => state.t);
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('+998');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setError(null);
    const input = { phone: phone.replace(/\s/g, ''), fullName: fullName.trim(), password };
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      await signUp(input);
      router.replace('/(tabs)');
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'ALREADY_EXISTS'
          ? "Bu raqam bilan akkaunt bor. Kirish sahifasiga o'ting."
          : err instanceof ApiError
            ? err.message
            : "Ro'yxatdan o'tib bo'lmadi",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ImageBackground source={IMG_BG} style={styles.bg} resizeMode="cover">
      {/* Status bar oq matn — fon ustida ko'rinsin */}
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={['rgba(10,10,15,0.08)', 'rgba(10,10,15,0.6)', 'rgba(10,10,15,0.97)']}
        locations={[0, 0.38, 0.78]}
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
            { paddingTop: insets.top + 4, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Yuqori qator */}
          <View style={styles.topRow}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.back()}
              accessibilityRole="button"
            >
              <Icon name="back" size={20} color={colors.text} />
            </Pressable>
            {/* Hero icon — PNG shaffof, clip kerak emas, biroz burilgan */}
            <Image source={IMG_HERO} style={styles.heroImg} resizeMode="contain" />
          </View>

          {/* Sarlavha */}
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>Sign </Text>
            <Text style={styles.titlePurple}>up</Text>
          </View>
          <Text style={styles.subtitle}>
            Telefon raqami buyurtmalar uchun ishlatiladi — sotuvchi shu raqamga qo&apos;ng&apos;iroq
            qiladi.
          </Text>

          {/* PHONE */}
          <Text style={styles.label}>PHONE</Text>
          <View style={[styles.field, fieldErrors['phone'] ? styles.fieldErr : null]}>
            <View style={styles.imgClip}>
              <Image source={IMG_PHONE} style={styles.imgIcon} resizeMode="cover" />
            </View>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+998"
              placeholderTextColor={colors.textDim}
            />
            <Icon name="next" size={18} color={colors.textMuted} />
          </View>
          {fieldErrors['phone'] ? <Text style={styles.fErr}>{fieldErrors['phone']}</Text> : null}

          {/* FULL NAME */}
          <Text style={styles.label}>FULL NAME</Text>
          <View style={[styles.field, fieldErrors['fullName'] ? styles.fieldErr : null]}>
            <View style={styles.imgClip}>
              <Image source={IMG_NAME} style={styles.imgIcon} resizeMode="cover" />
            </View>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              placeholder="Aziz Karimov"
              placeholderTextColor={colors.textDim}
            />
          </View>
          {fieldErrors['fullName'] ? (
            <Text style={styles.fErr}>{fieldErrors['fullName']}</Text>
          ) : null}

          {/* PASSWORD */}
          <Text style={styles.label}>PASSWORD</Text>
          <View style={[styles.field, fieldErrors['password'] ? styles.fieldErr : null]}>
            <View style={styles.lockBox}>
              <Icon name="authentic" size={18} color={colors.accent} />
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="new-password"
              placeholder="Kamida 8 belgi"
              placeholderTextColor={colors.textDim}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={10}>
              <Icon name={showPass ? 'eyeOff' : 'eye'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {fieldErrors['password'] ? (
            <Text style={styles.fErr}>{fieldErrors['password']}</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Get started */}
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
            <Text style={styles.submitText}>{busy ? 'Yuklanmoqda...' : t.auth.start}</Text>
            <View style={styles.submitArrow}>
              <Icon name="next" size={18} color={colors.text} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(auth)/sign-in')}
            style={styles.signinLink}
            accessibilityRole="button"
          >
            <Text style={styles.signinText}>
              Akkauntingiz bormi? <Text style={{ color: colors.accent }}>Kirish</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xs },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(36,31,51,0.82)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: {
    width: 120,
    height: 120,
    transform: [{ rotate: '-10deg' }],
  },

  titleRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  titleWhite: { fontSize: 36, fontWeight: '800', color: colors.text },
  titlePurple: { fontSize: 36, fontWeight: '800', color: colors.primary },
  subtitle: { ...text.small, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },

  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textDim,
    marginTop: spacing.md,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

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
  fieldErr: { borderColor: colors.danger },

  /* PNG shaffof — clip kerak emas, lekin o'lcham belgilash uchun qoldirdik */
  imgClip: { width: 44, height: 44 },
  imgIcon: { width: 44, height: 44 },

  lockBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: { flex: 1, ...text.body, color: colors.text, paddingVertical: 0 },
  fErr: { ...text.tiny, color: colors.danger, marginTop: 2 },
  error: { ...text.small, color: colors.danger, textAlign: 'center', marginTop: spacing.xs },

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

  signinLink: { alignItems: 'center', paddingVertical: spacing.md },
  signinText: { ...text.small, color: colors.textMuted },
});
