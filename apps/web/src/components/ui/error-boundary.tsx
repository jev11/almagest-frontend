import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { ErrorCard } from "./error-card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full p-8">
            <ErrorCard
              message="Something went wrong rendering this page."
              onRetry={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              variant="page"
              className="max-w-sm w-full"
            />
          </div>
        )
      );
    }
    return this.props.children;
  }
}
