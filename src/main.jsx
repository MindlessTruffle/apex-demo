import React from 'react';
import ReactDOM from 'react-dom/client';
// Change this line to import the new file
import ApexApp from './ApexApp.jsx'; 
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApexApp />
  </React.StrictMode>,
);