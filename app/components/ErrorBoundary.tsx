import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { logSecurityEvent } from '../utils/security';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error securely (without sensitive data)
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    
    // Log security event with safe data
    logSecurityEvent('app_error_boundary', {
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack?.substring(0, 500) || 'No stack trace',
      componentStack: errorInfo.componentStack?.substring(0, 500) || 'No component stack'
    }).catch(logError => {
      console.error('Failed to log error event:', logError);
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. This has been logged and will be fixed.
          </Text>
          {__DEV__ && this.state.errorInfo && (
            <Text style={styles.errorInfo}>
              Debug Info: {this.state.errorInfo}
            </Text>
          )}
          <Button title="Restart App" onPress={this.handleRestart} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  errorInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
