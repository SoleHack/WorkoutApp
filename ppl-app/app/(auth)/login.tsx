import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/lib/ThemeContext'

type Mode = 'login' | 'signup' | 'reset'

export default function LoginScreen() {
  const { colors } = useTheme()
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handle = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'reset') {
      const { error } = await resetPassword(email)
      if (error) setError(error.message)
      else setMessage('Check your email for a reset link.')
      setLoading(false)
      return
    }

    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (error) setError(error.message)
    else if (mode === 'signup') setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  const submitLabel =
    mode === 'login'  ? 'LOG IN'         :
    mode === 'signup' ? 'CREATE ACCOUNT' :
                        'SEND RESET LINK'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand block — centered industrial header */}
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 56, height: 56, resizeMode: 'contain', marginBottom: 16 }}
          />
          <Text style={{
            fontFamily: 'BebasNeue',
            fontSize: 64,
            color: colors.push,
            letterSpacing: 4,
            lineHeight: 64,
            textAlign: 'center',
          }}>
            THE FORGE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <View style={{ width: 24, height: 1, backgroundColor: colors.muted, marginRight: 10 }} />
            <Text style={{
              fontFamily: 'DMMono',
              fontSize: 10,
              color: colors.muted,
              letterSpacing: 3,
            }}>
              FORGE PROTOCOL v1.0
            </Text>
            <View style={{ width: 24, height: 1, backgroundColor: colors.muted, marginLeft: 10 }} />
          </View>
        </View>

        {/* Tab switcher — sharp, mono caps, orange active fill */}
        {mode !== 'reset' && (
          <View style={{ flexDirection: 'row', marginBottom: 28, gap: 8 }}>
            {(['login', 'signup'] as const).map(m => {
              const active = mode === m
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => { setMode(m); setError(''); setMessage('') }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    alignItems: 'center',
                    backgroundColor: active ? colors.push : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.push : colors.border,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{
                    fontFamily: 'DMMono_500',
                    fontSize: 11,
                    color: active ? colors.bg : colors.muted,
                    letterSpacing: 2,
                  }}>
                    {m === 'login' ? 'LOG IN' : 'SIGN UP'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {mode === 'reset' && (
          <View style={{ marginBottom: 28, borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 14 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 2 }}>
              RESET PASSWORD
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
              Enter your email and we'll send a reset link.
            </Text>
          </View>
        )}

        {/* Email */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontFamily: 'DMMono_500',
            fontSize: 10,
            color: colors.muted,
            letterSpacing: 2,
            marginBottom: 6,
          }}>
            EMAIL
          </Text>
          <TextInput
            style={{
              fontFamily: 'DMSans',
              fontSize: 15,
              color: colors.text,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        {/* Password */}
        {mode !== 'reset' && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontFamily: 'DMMono_500',
              fontSize: 10,
              color: colors.muted,
              letterSpacing: 2,
              marginBottom: 6,
            }}>
              PASSWORD
            </Text>
            <TextInput
              style={{
                fontFamily: 'DMSans',
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </View>
        )}

        {/* Error / Message blocks with FORGE border-left accent */}
        {error ? (
          <View style={{
            borderLeftWidth: 3,
            borderLeftColor: colors.danger,
            backgroundColor: colors.danger + '14',
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 16,
            borderRadius: 4,
          }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.danger, letterSpacing: 2, marginBottom: 2 }}>
              ERROR
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text }}>
              {error}
            </Text>
          </View>
        ) : null}
        {message ? (
          <View style={{
            borderLeftWidth: 3,
            borderLeftColor: colors.success,
            backgroundColor: colors.success + '14',
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 16,
            borderRadius: 4,
          }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.success, letterSpacing: 2, marginBottom: 2 }}>
              CHECK YOUR INBOX
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text }}>
              {message}
            </Text>
          </View>
        ) : null}

        {/* Primary action — orange filled, mono caps, sharp */}
        <TouchableOpacity
          onPress={handle}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.push,
            borderRadius: 6,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 16,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={{
                fontFamily: 'DMMono_500',
                fontSize: 12,
                color: colors.bg,
                letterSpacing: 3,
              }}>
                {submitLabel} →
              </Text>
          }
        </TouchableOpacity>

        {/* Secondary link — mono caps, muted */}
        {mode === 'login' && (
          <TouchableOpacity
            onPress={() => { setMode('reset'); setError(''); setMessage('') }}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>
              FORGOT PASSWORD?
            </Text>
          </TouchableOpacity>
        )}
        {mode === 'reset' && (
          <TouchableOpacity
            onPress={() => { setMode('login'); setError(''); setMessage('') }}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>
              ← BACK TO LOG IN
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer tagline — distant industrial */}
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text style={{
            fontFamily: 'DMMono',
            fontSize: 9,
            color: colors.muted,
            letterSpacing: 2,
            opacity: 0.6,
          }}>
            BUILD · BREAK · REPEAT
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
