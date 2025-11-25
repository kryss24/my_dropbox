import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';
import App from './App';
import LandingPage from './LandingPage';
import SignIn from './SignIn';
import ProfilePage from './ProfilePage'; // Import ProfilePage
import amplifyconfig from './amplifyconfiguration.json';

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
  const [currentAppView, setCurrentAppView] = useState('dropbox'); // 'dropbox' or 'profile'

  useEffect(() => {
    const checkUser = async () => {
      try {
        const authUser = await getCurrentUser();
        setUser(authUser);
        setCurrentView('app'); // This means a user is logged in
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
          setCurrentAppView('dropbox'); // Reset to dropbox view on sign in
          break;
        case 'signOut':
          setUser(null);
          setCurrentView('landing');
          setCurrentAppView('dropbox'); // Reset view on sign out
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
    if (currentAppView === 'dropbox') {
      return <App user={user} onNavigate={setCurrentAppView} />;
    } else if (currentAppView === 'profile') {
      return <ProfilePage user={user} onNavigate={setCurrentAppView} />;
    }
  }

  if (currentView === 'signIn') {
    return <SignIn />;
  }

  return <LandingPage showSignIn={() => setCurrentView('signIn')} />;
}

export default AppWrapper;