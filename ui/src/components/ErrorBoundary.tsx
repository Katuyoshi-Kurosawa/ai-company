import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? 'unknown'}]`, error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 p-8">
          <div className="text-4xl">⚠️</div>
          <div className="text-sm font-medium opacity-70">
            {this.props.name ? `${this.props.name} で` : ''}エラーが発生しました
          </div>
          <div className="text-xs opacity-40 max-w-sm text-center font-mono">
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-4 py-1.5 text-xs rounded-md border border-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
