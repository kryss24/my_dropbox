import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { list, downloadData, remove, uploadData } from 'aws-amplify/storage';
import { withAuthenticator, Heading, Flex, Text, TextField, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  List,
  ListItem,
  ListItemText,
  IconButton,
  LinearProgress,
  Box,
  Alert,
  Input,
  Button
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchAuthSession } from 'aws-amplify/auth';

function App({ signOut, user }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [identityId, setIdentityId] = useState(null);

  useEffect(() => {
    getIdentityId();
  }, []);

  useEffect(() => {
    if (identityId) {
      fetchFiles();
    }
  }, [identityId]);

  async function getIdentityId() {
    try {
      const session = await fetchAuthSession();
      const id = session.identityId;
      setIdentityId(id);
      console.log('Identity ID:', id);
    } catch (err) {
      console.error('Error getting identity ID:', err);
      setError('Failed to get user identity.');
    }
  }

  async function fetchFiles() {
    if (!identityId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await list({ 
        path: `protected/${identityId}/`,
        options: { 
          listAll: true 
        } 
      });
      setFiles(result.items || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (event) => {
    setFileToUpload(event.target.files[0]);
  };

  async function uploadFile() {
    if (!fileToUpload) {
      setError('Please select a file to upload.');
      return;
    }
    if (!identityId) {
      setError('User identity not available.');
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    try {
      await uploadData({
        path: `protected/${identityId}/${fileToUpload.name}`,
        data: fileToUpload,
        options: {
          contentType: fileToUpload.type || 'application/octet-stream',
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setUploadProgress(Math.round((transferredBytes / totalBytes) * 100));
            }
          }
        }
      }).result;
      setFileToUpload(null);
      setUploadProgress(0);
      await fetchFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(fileKey) {
    setError(null);
    try {
      const result = await downloadData({ path: fileKey });
      const blob = await result.body.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileKey.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file.');
    }
  }

  async function deleteFile(fileKey) {
    setError(null);
    try {
      await remove({ path: fileKey });
      await fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file.');
    }
  }

  return (
    <View className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Dropbox
          </Typography>
          <Button onClick={signOut} color="inherit">Sign Out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Heading level={1} style={{ marginBottom: '20px' }}>Hello {user.username}</Heading>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 4, p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
          <Typography variant="h5" gutterBottom>Upload File</Typography>
          <Input
            type="file"
            onChange={handleFileChange}
            sx={{ mb: 2 }}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={uploadFile}
            disabled={uploading || !fileToUpload || !identityId}
          >
            {uploading ? `Uploading (${uploadProgress}%)` : 'Upload'}
          </Button>
          {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 2 }} />}
        </Box>

        <Box sx={{ p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
          <Typography variant="h5" gutterBottom>Your Files</Typography>
          {loading ? (
            <LinearProgress />
          ) : files.length === 0 ? (
            <Text>No files found. Upload one!</Text>
          ) : (
            <List>
              {files.map((file) => (
                <ListItem
                  key={file.path}
                  secondaryAction={
                    <Flex>
                      <IconButton edge="end" aria-label="download" onClick={() => downloadFile(file.path)}>
                        <DownloadIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => deleteFile(file.path)}>
                        <DeleteIcon />
                      </IconButton>
                    </Flex>
                  }
                >
                  <ListItemText 
                    primary={file.path.split('/').pop()} 
                    secondary={`Size: ${(file.size / 1024).toFixed(2)} KB`} 
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Container>
    </View>
  );
}

export default withAuthenticator(App);