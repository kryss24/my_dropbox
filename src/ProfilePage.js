import React, { useState, useEffect } from 'react';
import { fetchUserAttributes, updateUserAttribute } from 'aws-amplify/auth';
import { Flex } from '@aws-amplify/ui-react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Paper,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import { Auth } from 'aws-amplify';

const ProfilePage = ({ user, onNavigate }) => {
  const [attributes, setAttributes] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    setLoading(true);
    setError(null);
    try {
      const userAttributes = await fetchUserAttributes();
      // Only keep attributes that are not objects or arrays
      const filteredAttributes = Object.entries(userAttributes).reduce((acc, [key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          acc[key] = value;
        }
        return acc;
      }, {});
      setAttributes(filteredAttributes);
      setSuccess(null);
    } catch (err) {
      console.error('Error fetching user attributes:', err);
      setError('Failed to load profile information.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAttributes(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
        // Prepare attributes to update
        const attributesToUpdate = {};
        for (const key in attributes) {
            // Cognito attributes require specific names, e.g., 'email', 'phone_number', 'given_name', 'family_name'
            // We need to map our state keys to Cognito's expected keys
            let cognitoKey = key; 
            if (key === 'given_name') cognitoKey = 'given_name';
            if (key === 'family_name') cognitoKey = 'family_name';
            if (key === 'email') cognitoKey = 'email';
            if (key === 'phone_number') cognitoKey = 'phone_number';
            if (key === 'preferred_username') cognitoKey = 'preferred_username';
            // Add more mappings if needed for other standard attributes

            attributesToUpdate[cognitoKey] = attributes[key];
        }

        // Only update attributes that have actually changed (though updateUserAttribute handles this too)
        // For simplicity, we send all current `attributes` state.
        
        // Cognito's updateUserAttributes expects an object like { email: 'new@example.com', family_name: 'Doe' }
        await Promise.all(Object.keys(attributesToUpdate).map(async (key) => {
            // Check if the attribute actually changed before updating
            const currentVal = (await fetchUserAttributes())[key];
            if (currentVal !== attributesToUpdate[key]) {
                await updateUserAttribute({
                    userAttribute: {
                        attributeKey: key,
                        value: attributesToUpdate[key]
                    }
                });
            }
        }));

        setSuccess('Profile updated successfully!');
        setIsEditing(false); // Exit editing mode after successful update
        // Re-fetch attributes to ensure UI is in sync with Cognito, especially if there were pending confirmations
        await fetchAttributes(); 

    } catch (err) {
      console.error('Error updating user attributes:', err);
      setError(`Failed to update profile: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <CircularProgress />
        <Typography>Loading profile...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" component="h2" gutterBottom>
                User Profile
            </Typography>
            <Button variant="outlined" onClick={() => onNavigate('dropbox')}>Back to Dropbox</Button>
        </Flex>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

        {isEditing ? (
            <>
                {Object.keys(attributes).map(key => (
                    // Exclude 'sub' as it's typically immutable and internal
                    // Exclude 'username' as it's the primary identifier and often not directly editable this way
                    // Exclude 'identities' if it appears
                    (key !== 'sub' && key !== 'username' && key !== 'identities') && (
                        <TextField
                            key={key}
                            label={key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            name={key}
                            value={attributes[key]}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                            disabled={submitting}
                            type={key.includes('email') ? 'email' : (key.includes('phone') ? 'tel' : 'text')}
                        />
                    )
                ))}
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button 
                        variant="contained" 
                        onClick={handleUpdate} 
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} /> : null}
                    >
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outlined" onClick={() => { setIsEditing(false); fetchAttributes(); }} disabled={submitting}>
                        Cancel
                    </Button>
                </Box>
            </>
        ) : (
            <>
                {Object.keys(attributes).map(key => (
                     (key !== 'sub' && key !== 'identities') && ( // Exclude 'sub' and 'identities' for display
                        <Box key={key} sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" component="span" fontWeight="bold">
                                {key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
                            </Typography>
                            <Typography variant="body1" component="span" sx={{ ml: 1 }}>
                                {attributes[key]}
                            </Typography>
                        </Box>
                    )
                ))}
                <Box sx={{ mt: 3 }}>
                    <Button variant="contained" onClick={() => setIsEditing(true)}>
                        Edit Profile
                    </Button>
                </Box>
            </>
        )}
      </Paper>
    </Container>
  );
};

export default ProfilePage;