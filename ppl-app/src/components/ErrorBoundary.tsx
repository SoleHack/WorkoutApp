import { Component, ReactNode } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'

interface Props {
  children: ReactNode
  /** Optional friendly name surfaced in the error UI (e.g. "Workout screen"). */
  scope?: string
  /** Optional callback when an error is caught — for telemetry. */
  onError?: (error: Error, info: { componentStack: string }) => void
}

interface State {
  error: Error | null
}

/**
 * Production crash safety net. Catches render-time errors in its subtree
 * and shows a FORGE-styled recovery UI instead of a white screen.
 *
 * Wrap the root layout and any screens that can crash independently.
 * Note: this does NOT catch errors in async callbacks, event handlers,
 * or promises — only render-time errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.props.onError?.(error, info)
    // Log to console so we capture it in Metro / device logs.
    console.error('[ErrorBoundary]', this.props.scope || 'unknown', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A09', padding: 24, paddingTop: 80 }}>
        <View style={{
          borderLeftWidth: 3,
          borderLeftColor: '#F43F5E',
          paddingLeft: 14,
          marginBottom: 24,
        }}>
          <Text style={{
            fontFamily: 'DMMono_500',
            fontSize: 10,
            color: '#F43F5E',
            letterSpacing: 2.5,
            marginBottom: 4,
          }}>
            UNEXPECTED ERROR
          </Text>
          <Text style={{
            fontFamily: 'BebasNeue',
            fontSize: 40,
            color: '#EDE9DD',
            letterSpacing: 3,
            lineHeight: 40,
          }}>
            SOMETHING BROKE
          </Text>
        </View>

        <Text style={{
          fontFamily: 'DMSans',
          fontSize: 14,
          color: '#8A867B',
          lineHeight: 20,
          marginBottom: 20,
        }}>
          {this.props.scope ? `The ${this.props.scope} crashed.` : 'A screen crashed.'} Your data is safe — nothing was lost. Tap below to retry.
        </Text>

        <ScrollView
          style={{
            maxHeight: 180,
            borderRadius: 6,
            backgroundColor: '#141412',
            borderWidth: 1,
            borderColor: '#2A2A26',
            padding: 12,
            marginBottom: 20,
          }}>
          <Text style={{
            fontFamily: 'DMMono',
            fontSize: 10,
            color: '#8A867B',
            letterSpacing: 1.5,
            marginBottom: 6,
          }}>
            ERROR DETAILS
          </Text>
          <Text style={{
            fontFamily: 'DMMono',
            fontSize: 11,
            color: '#EDE9DD',
            lineHeight: 16,
          }}>
            {error.message || String(error)}
          </Text>
        </ScrollView>

        <TouchableOpacity
          onPress={this.reset}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#F97316',
            borderRadius: 6,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text style={{
            fontFamily: 'DMMono_500',
            fontSize: 12,
            color: '#0A0A09',
            letterSpacing: 3,
          }}>
            TRY AGAIN →
          </Text>
        </TouchableOpacity>
      </View>
    )
  }
}
