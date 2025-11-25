import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';
import App from './App';
import LandingPage from './LandingPage';
import SignIn from './SignIn'; // Import the SignIn component
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

function AppWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('landing'); // landing, signIn, app

  useEffect(() => {
    const checkUser = async () => {
      try {
        const authUser = await getCurrentUser();
        setUser(authUser);
        setCurrentView('app');
      } catch (error) {
        setUser(null);
        setCurrentView('landing');
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const listener = Hub.listen('auth', (data) => {
      switch (data.payload.event) {
        case 'signedIn':
          setUser(data.payload.data);
          setCurrentView('app');
          break;
        case 'signOut':
          setUser(null);
          setCurrentView('landing');
          break;
        default:
          break;
      }
    });

    return () => listener();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or a more sophisticated loading spinner
  }

  if (user) {
    return <App user={user} />;
  }

  if (currentView === 'signIn') {
    return <SignIn />;
  }

  return <LandingPage showSignIn={() => setCurrentView('signIn')} />;
}

export default AppWrapper;
