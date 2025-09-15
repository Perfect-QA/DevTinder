import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import your components here
// import Login from './components/Login';
// import Signup from './components/Signup';
// import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Perfect AI</h1>
          <p>Advanced Authentication System</p>
        </header>
        <main>
          <Routes>
            {/* Add your routes here */}
            <Route path="/" element={<div>Welcome to Perfect AI</div>} />
            {/* <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} /> */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
