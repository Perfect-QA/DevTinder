import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store';
import Layout from './components/Layout';
import UploadTestData from './components/UploadTestData';
import './App.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={
            <Layout>
              <UploadTestData />
            </Layout>
          } />
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;
