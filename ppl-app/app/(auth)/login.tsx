import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/theme'

type Mode = 'login' | 'signup' | 'reset'

export default function LoginScreen() {
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 80, height: 80, resizeMode: 'contain' }}
          />
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 3, marginTop: 12 }}>
            PPL TRACKER
          </Text>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 2, marginTop: 4 }}>
            WORKOUTS & PROGRESS
          </Text>
        </View>

        {/* Tab switcher */}
        {mode !== 'reset' && (
          <View className="flex-row mb-6 bg-card rounded-xl p-1">
            {(['login', 'signup'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(''); setMessage('') }}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: mode === m ? colors.text : 'transparent' }}
              >
                <Text style={{
                  fontFamily: 'DMSans_500',
                  fontSize: 14,
                  color: mode === m ? colors.bg : colors.muted,
                }}>
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {mode === 'reset' && (
          <View className="mb-6">
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: colors.text, letterSpacing: 1 }}>
              Reset Password
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 4 }}>
              Enter your email and we'll send a reset link.
            </Text>
          </View>
        )}

        {/* Inputs */}
        <TextInput
          className="bg-card rounded-xl px-4 py-4 mb-3 text-text"
          style={{ fontFamily: 'DMSans', fontSize: 15, borderWidth: 1, borderColor: colors.border }}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        {mode !== 'reset' && (
          <TextInput
            className="bg-card rounded-xl px-4 py-4 mb-4 text-text"
            style={{ fontFamily: 'DMSans', fontSize: 15, borderWidth: 1, borderColor: colors.border }}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        )}

        {error ? (
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.danger, marginBottom: 12 }}>
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.success, marginBottom: 12 }}>
            {message}
          </Text>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={handle}
          disabled={loading}
          className="rounded-xl py-4 items-center mb-4"
          style={{ backgroundColor: colors.text, opacity: loading ? 0.7 : 1 }}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.bg }}>
                {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </Text>
          }
        </TouchableOpacity>

        {/* Forgot / Back */}
        {mode === 'login' && (
          <TouchableOpacity
            onPress={() => { setMode('reset'); setError(''); setMessage('') }}
            className="items-center py-2"
          >
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted }}>
              Forgot password?
            </Text>
          </TouchableOpacity>
        )}
        {mode === 'reset' && (
          <TouchableOpacity
            onPress={() => { setMode('login'); setError(''); setMessage('') }}
            className="items-center py-2"
          >
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted }}>
              ← Back to login
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
