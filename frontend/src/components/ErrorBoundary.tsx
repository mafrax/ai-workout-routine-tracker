import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon } from '@ionic/react';
import { refreshOutline, bugOutline } from 'ionicons/icons';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <IonCard className="error-card">
            <IonCardHeader>
              <div className="error-icon-container">
                <IonIcon icon={bugOutline} className="error-icon" />
              </div>
              <IonCardTitle>Something went wrong</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="error-message">
                An unexpected error occurred. This has been logged and we'll look into it.
              </p>
              {this.state.error && (
                <details className="error-details">
                  <summary>Error details</summary>
                  <pre>{this.state.error.toString()}</pre>
                  {this.state.errorInfo && (
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  )}
                </details>
              )}
              <IonButton expand="block" onClick={this.handleReset} className="retry-button">
                <IonIcon slot="start" icon={refreshOutline} />
                Try Again
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
