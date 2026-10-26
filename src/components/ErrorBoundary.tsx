import type { ReactNode } from "react";
import { Component } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="fatal-error">
          <h1>The app hit an unexpected error</h1>
          <p>Your saved progress has not been sent anywhere. Reloading usually restores the app.</p>
          <pre>{this.state.error.message}</pre>
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
