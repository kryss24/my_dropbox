import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Amplify } from 'aws-amplify';
import amplifyconfig from './amplifyconfiguration.json';

// Configure Amplify and provide Storage settings under the Storage key.
// The installed @aws-amplify/storage package exposes modular functions
// (list, uploadData, downloadData, remove, etc.) which we import where
// needed. Amplify still reads a Storage section from its configuration
// to determine S3 bucket/region.
Amplify.configure({
  ...amplifyconfig,
  Storage: {
    AWSS3: {
      bucket: amplifyconfig.aws_user_files_s3_bucket,
      region: amplifyconfig.aws_user_files_s3_bucket_region,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
