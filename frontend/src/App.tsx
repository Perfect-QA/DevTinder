import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store';
import Layout from './components/Layout';
import UploadTestData from './components/UploadTestData';
import OfflinePage from './components/OfflinePage';
import ErrorBoundary from './components/ErrorBoundary';
import AsyncErrorBoundary from './components/AsyncErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import './App.css';

const AppContent: React.FC = () => {
  const { isOnline, retry, isReconnecting, retryCount } = useNetworkStatus();
  const [showOfflinePage, setShowOfflinePage] = React.useState(false);

  const handleRetry = async () => {
    const success = await retry();
    if (success) {
      console.log('Connection restored!');
      setShowOfflinePage(false);
    }
  };

  // Add a delay before showing offline page to prevent false positives
  React.useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setShowOfflinePage(true);
      }, 2000); // Wait 2 seconds before showing offline page
      
      return () => clearTimeout(timer);
    } else {
      setShowOfflinePage(false);
      return undefined;
    }
  }, [isOnline]);

  // Show offline page when user is offline (with delay)
  if (showOfflinePage) {
    return (
      <OfflinePage 
        onRetry={handleRetry}
        retryCount={retryCount}
        isRetrying={isReconnecting}
      />
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Layout>
            <UploadTestData />
          </Layout>
        } />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <AsyncErrorBoundary>
            <AppContent />
          </AsyncErrorBoundary>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
