// React entry point: mount <App /> inside the #root div of index.html.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/style.css';
import './styles/extra.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
