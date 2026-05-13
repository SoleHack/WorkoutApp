import { ErrorBoundary } from './ErrorBoundary'

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  scope: string
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary scope={scope}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
