import React, { useState, useEffect, useMemo, useRef } from 'react';
import { list, downloadData, remove, uploadData } from 'aws-amplify/storage';
import { Heading, Flex, Text, View } from '@aws-amplify/ui-react';
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
  Button,
  Breadcrumbs,
  Link,
  TextField,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  CreateNewFolder as CreateNewFolderIcon
} from '@mui/icons-material';
import { fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';

function App({ user }) {
  const [allFiles, setAllFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [identityId, setIdentityId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [isCreateFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const fileInputRef = useRef(null);

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
      setIdentityId(session.identityId);
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
        options: { listAll: true } 
      });
      setAllFiles(result.items || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }

  const { folders, files } = useMemo(() => {
    const folders = new Set();
    const files = [];

    const prefix = `protected/${identityId}/${currentPath}`;

    allFiles.forEach(file => {
      if (!file.path.startsWith(prefix)) {
        return;
      }
      
      const relativePath = file.path.substring(prefix.length);
      const segments = relativePath.split('/');

      if (segments.length > 1) {
        // This is either a folder or a file inside a folder
        if (segments[0]) {
            folders.add(segments[0]);
        }
      } else if (segments.length === 1 && segments[0]) {
        // This is a file in the current directory
        files.push({
          ...file,
          displayName: segments[0],
        });
      }
    });

    // Don't show the placeholder for the folder itself as a file
    const filteredFiles = files.filter(f => f.displayName !== '');

    return { folders: Array.from(folders), files: filteredFiles };
  }, [allFiles, currentPath, identityId]);


  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  async function uploadFile(file) {
    if (!identityId) {
      setError('User identity not available.');
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    const filePath = `protected/${identityId}/${currentPath}${file.name}`;
    
    try {
      const uploadTask = uploadData({
        path: filePath,
        data: file,
        options: {
          contentType: file.type || 'application/octet-stream',
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setUploadProgress(Math.round((transferredBytes / totalBytes) * 100));
            }
          }
        }
      });
      await uploadTask.result;
      await fetchFiles(); // Refresh file list
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file.');
    } finally {
      setUploading(false);
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) {
      setError('Please enter a valid folder name.');
      return;
    }
    if (!identityId) {
      setError('User identity not available.');
      return;
    }

    setCreatingFolder(true);
    setError(null);
    const folderPath = `protected/${identityId}/${currentPath}${newFolderName.trim()}/`;
    
    try {
      await uploadData({ path: folderPath, data: '' }).result;
      setNewFolderName('');
      setCreateFolderModalOpen(false);
      await fetchFiles();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(`Failed to create folder. A folder or file with the name "${newFolderName.trim()}" may already exist.`);
    } finally {
      setCreatingFolder(false);
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

  async function deleteItem(itemPath, isFolder = false) {
    setError(null);
    const itemName = itemPath.split('/').filter(Boolean).pop();
    const confirmMessage = isFolder 
      ? `Are you sure you want to delete the folder "${itemName}" and all its contents?`
      : `Are you sure you want to delete "${itemName}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
        if (isFolder) {
            const result = await list({ path: itemPath, options: { listAll: true } });
            const itemsToDelete = result.items.map(item => remove({ path: item.path }));
            // Also delete the folder placeholder itself
            await Promise.all([...itemsToDelete, remove({ path: itemPath })]);
        } else {
            await remove({ path: itemPath });
        }
        await fetchFiles();
    } catch (err) {
        console.error('Error deleting item:', err);
        setError('Failed to delete item.');
    }
  }


  function handleFolderClick(folderName) {
    setCurrentPath(prev => `${prev}${folderName}/`);
  }

  function handleBreadcrumbClick(index) {
    const newPath = currentPath.split('/').slice(0, index).join('/');
    setCurrentPath(newPath ? newPath + '/' : '');
  }

  const breadcrumbParts = ['Root', ...currentPath.split('/').filter(Boolean)];

  return (
    <View className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Dropbox
          </Typography>
          <Button onClick={() => amplifySignOut()} color="inherit">Sign Out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Heading level={1} style={{ marginBottom: '20px' }}>Hello {user.username}</Heading>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <Box sx={{ p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
          <Flex justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Breadcrumbs aria-label="breadcrumb">
              {breadcrumbParts.map((part, index) => (
                <Link
                  key={index}
                  underline="hover"
                  color={index === breadcrumbParts.length - 1 ? "text.primary" : "inherit"}
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(index); }}
                >
                  {part}
                </Link>
              ))}
            </Breadcrumbs>
            <Flex>
                <Tooltip title="Create Folder">
                    <IconButton onClick={() => setCreateFolderModalOpen(true)}>
                        <CreateNewFolderIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Upload File">
                    <IconButton onClick={() => fileInputRef.current.click()} disabled={uploading}>
                        <CloudUploadIcon />
                    </IconButton>
                </Tooltip>
            </Flex>
          </Flex>

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Text textAlign="center">{uploadProgress}%</Text>
            </Box>
          )}

          {loading ? (
            <CircularProgress />
          ) : (folders.length === 0 && files.length === 0) ? (
            <Text>No files or folders found.</Text>
          ) : (
            <List>
              {/* Render Folders */}
              {folders.map((folderName) => (
                <ListItem
                    key={folderName}
                    onDoubleClick={() => handleFolderClick(folderName)}
                    sx={{ cursor: 'pointer' }}
                    secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => {
                            const folderPath = `protected/${identityId}/${currentPath}${folderName}/`;
                            deleteItem(folderPath, true);
                        }}>
                            <DeleteIcon />
                        </IconButton>
                    }
                >
                    <FolderIcon sx={{ mr: 2 }} />
                    <ListItemText primary={folderName} />
                </ListItem>
              ))}

              {/* Render Files */}
              {files.map((file) => (
                <ListItem
                  key={file.path}
                  secondaryAction={
                    <Flex>
                      <IconButton edge="end" aria-label="download" onClick={() => downloadFile(file.path)}>
                        <DownloadIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => deleteItem(file.path)}>
                        <DeleteIcon />
                      </IconButton>
                    </Flex>
                  }
                >
                  <ListItemText 
                    primary={file.displayName} 
                    secondary={file.size ? `Size: ${(file.size / 1024).toFixed(2)} KB` : ''} 
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Container>

      {/* Create Folder Modal */}
      <Dialog open={isCreateFolderModalOpen} onClose={() => setCreateFolderModalOpen(false)}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            variant="standard"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            disabled={creatingFolder}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderModalOpen(false)}>Cancel</Button>
          <Button onClick={createFolder} disabled={creatingFolder}>
            {creatingFolder ? <CircularProgress size={24} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </View>
  );
}

export default App;