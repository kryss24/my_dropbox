import React, { useState, useEffect, useMemo, useRef } from 'react';
import { list, downloadData, remove, uploadData, getUrl } from 'aws-amplify/storage';
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
  Tooltip,
  Snackbar,
  Grid
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  CreateNewFolder as CreateNewFolderIcon,
  AccountCircle as AccountCircleIcon,
  InsertDriveFile as FileIcon, // Generic file icon
  Image, // For image files
  PictureAsPdf as PictureAsPdfIcon, // For PDF files
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';

function App({ user, onNavigate }) {
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

  // State for file preview
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewContentUrl, setPreviewContentUrl] = useState(null);
  const [previewContentType, setPreviewContentType] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // State for share link
  const [isShareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [sharedLink, setSharedLink] = useState('');
  const [sharingFileKey, setSharingFileKey] = useState('');
  const [shareExpirationHours, setShareExpirationHours] = useState(1); // Default 1 hour
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // State for file versioning
  const [isVersioningModalOpen, setVersioningModalOpen] = useState(false);
  const [versioningFileKey, setVersioningFileKey] = useState('');
  const [versioningFileName, setVersioningFileName] = useState('');


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
          // Infer file type for preview
          fileType: getFileTypeFromFileName(segments[0])
        });
      }
    });

    // Don't show the placeholder for the folder itself as a file
    const filteredFiles = files.filter(f => f.displayName !== '');

    return { folders: Array.from(folders), files: filteredFiles };
  }, [allFiles, currentPath, identityId]);

  // Helper to infer file type
  function getFileTypeFromFileName(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream'; // Generic binary file
    }
  }


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

  async function handlePreview(fileKey, fileType, fileName) {
    setLoadingPreview(true);
    setError(null);
    setPreviewFileName(fileName);
    try {
      const result = await downloadData({ path: fileKey });
      if (!result.body) {
        // Handle case for empty files - show a message instead of trying to preview
        setError('This file is empty and cannot be previewed.');
        return; 
      }
      const blob = await result.body.blob();
      const url = URL.createObjectURL(blob);
      setPreviewContentUrl(url);
      setPreviewContentType(fileType);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error('Error creating preview:', err);
      setError('Failed to create preview.');
    } finally {
      setLoadingPreview(false);
    }
  }

  const handleClosePreviewModal = () => {
    if (previewContentUrl) {
      URL.revokeObjectURL(previewContentUrl); // Clean up the object URL
    }
    setPreviewModalOpen(false);
    setPreviewContentUrl(null);
    setPreviewContentType(null);
    setPreviewFileName('');
  };

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
      URL.revokeObjectURL(a.href); // Clean up the object URL immediately after download
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

  async function generateShareableLink() {
    if (!sharingFileKey) {
      setError('No file selected for sharing.');
      return;
    }
    setGeneratingShareLink(true);
    setSharedLink('');
    setError(null);
    try {
      // expiresIn is in seconds, so convert hours to seconds
      const urlResult = await getUrl({ 
        path: sharingFileKey, 
        options: { 
          expiresIn: shareExpirationHours * 3600 
        } 
      });
      setSharedLink(urlResult.url.toString());
    } catch (err) {
      console.error('Error generating shareable link:', err);
      setError('Failed to generate shareable link.');
    } finally {
      setGeneratingShareLink(false);
    }
  }

  const handleCopyLink = () => {
    if (sharedLink) {
      navigator.clipboard.writeText(sharedLink);
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };


  const handleOpenShareLinkModal = (fileKey) => {
    setSharingFileKey(fileKey);
    setShareExpirationHours(1); // Reset to default
    setSharedLink(''); // Clear previous link
    setShareLinkModalOpen(true);
  };

  const handleCloseShareLinkModal = () => {
    setShareLinkModalOpen(false);
    setSharedLink('');
    setSharingFileKey('');
    setShareExpirationHours(1);
    setGeneratingShareLink(false);
  };

  const handleOpenVersioningModal = (fileKey, fileName) => {
    setVersioningFileKey(fileKey);
    setVersioningFileName(fileName);
    setVersioningModalOpen(true);
  };

  const handleCloseVersioningModal = () => {
    setVersioningModalOpen(false);
    setVersioningFileKey('');
    setVersioningFileName('');
  };


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
          {onNavigate && (
            <Button onClick={() => onNavigate('profile')} color="inherit" startIcon={<AccountCircleIcon />}>
              Profile
            </Button>
          )}
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

        <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
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
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="h6" gutterBottom>
                            No files or folders here yet!
                        </Typography>
                        <Typography variant="body1">
                            Upload your first file or create a new folder to get started.
                        </Typography>
                    </Box>
                ) : (
                    <List>
                    {/* Render Folders */}
                    {folders.map((folderName) => (
                        <ListItem
                            key={folderName}
                            onDoubleClick={() => handleFolderClick(folderName)}
                            sx={{ cursor: 'pointer' }}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={(e) => {
                                    e.stopPropagation(); // Prevent folder navigation
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
                        onClick={() => handlePreview(file.path, file.fileType, file.displayName)} // Preview on click
                        secondaryAction={
                            <Flex>
                            <IconButton edge="end" aria-label="download" onClick={(e) => {
                                e.stopPropagation(); // Prevent preview
                                downloadFile(file.path);
                            }}>
                                <DownloadIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="share" onClick={(e) => {
                                e.stopPropagation(); // Prevent preview
                                handleOpenShareLinkModal(file.path);
                            }}>
                                <ShareIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="versions" onClick={(e) => {
                                e.stopPropagation(); // Prevent preview
                                handleOpenVersioningModal(file.path, file.displayName);
                            }}>
                                <HistoryIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={(e) => {
                                e.stopPropagation(); // Prevent preview
                                deleteItem(file.path);
                            }}>
                                <DeleteIcon />
                            </IconButton>
                            </Flex>
                        }
                        sx={{ cursor: 'pointer' }}
                        >
                        {file.fileType.startsWith('image/') ? (
                            <Image sx={{ mr: 2 }} />
                        ) : file.fileType === 'application/pdf' ? (
                            <PictureAsPdfIcon sx={{ mr: 2 }} />
                        ) : (
                            <FileIcon sx={{ mr: 2 }} />
                        )}
                        <ListItemText 
                            primary={file.displayName} 
                            secondary={file.size ? `Size: ${(file.size / 1024).toFixed(2)} KB` : ''} 
                        />
                        </ListItem>
                    ))}
                    </List>
                )}
                </Box>
            </Grid>
        </Grid>
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

      {/* File Preview Modal */}
      <Dialog open={isPreviewModalOpen} onClose={handleClosePreviewModal} maxWidth="md" fullWidth>
        <DialogTitle>{previewFileName}
            <IconButton
                aria-label="close"
                onClick={handleClosePreviewModal}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
            >
                <CloseIcon />
            </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {loadingPreview ? (
            <CircularProgress />
          ) : previewContentUrl && previewContentType ? (
            previewContentType.startsWith('image/') ? (
              <img src={previewContentUrl} alt={previewFileName} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', objectFit: 'contain' }} />
            ) : previewContentType === 'application/pdf' ? (
              <iframe src={previewContentUrl} title={previewFileName} width="100%" height="500px" style={{ border: 'none' }}></iframe>
            ) : (
              <Text>Preview not available for this file type.</Text>
            )
          ) : (
            <Text>No content to preview.</Text>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreviewModal}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Share Link Modal */}
      <Dialog open={isShareLinkModalOpen} onClose={handleCloseShareLinkModal}>
        <DialogTitle>Share File
          <IconButton
            aria-label="close"
            onClick={handleCloseShareLinkModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Generate a shareable link for: {sharingFileKey.split('/').pop()}
          </Typography>
          <TextField
            label="Link expires in (hours)"
            type="number"
            value={shareExpirationHours}
            onChange={(e) => setShareExpirationHours(Math.max(1, parseInt(e.target.value) || 1))}
            fullWidth
            margin="normal"
            InputProps={{ inputProps: { min: 1 } }}
            disabled={generatingShareLink}
          />
          <Button
            variant="contained"
            onClick={generateShareableLink}
            disabled={generatingShareLink || !sharingFileKey}
            sx={{ mt: 2 }}
            startIcon={generatingShareLink ? <CircularProgress size={20} /> : null}
          >
            {generatingShareLink ? 'Generating...' : 'Generate Link'}
          </Button>

          {sharedLink && (
            <Box sx={{ mt: 3 }}>
              <TextField
                label="Shareable Link"
                value={sharedLink}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <Button
                variant="outlined"
                onClick={handleCopyLink}
                startIcon={<ContentCopyIcon />}
                sx={{ mt: 1 }}
              >
                Copy Link
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareLinkModal}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* File Versioning Modal */}
      <Dialog open={isVersioningModalOpen} onClose={handleCloseVersioningModal} maxWidth="sm" fullWidth>
        <DialogTitle>File Versions for {versioningFileName}
          <IconButton
            aria-label="close"
            onClick={handleCloseVersioningModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" gutterBottom>
            Implementing a full versioning system with UI for browsing and restoring previous versions requires direct AWS SDK calls or a backend service (e.g., AWS Lambda) to interact with S3's versioning API. This functionality is beyond the scope of this frontend-only implementation using `aws-amplify/storage`'s high-level API.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            To enable S3 bucket versioning, this must be configured in your AWS S3 bucket settings or via Amplify overrides. Once enabled, the versions are managed by S3 automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVersioningModal}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message="Link copied to clipboard!"
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* Simple Footer */}
      <Box component="footer" sx={{ mt: 5, py: 3, bgcolor: 'background.paper', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} My Dropbox. All rights reserved.
        </Typography>
      </Box>
    </View>
  );
}

export default App;