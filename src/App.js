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
import CreateFolderModal from './components/modals/CreateFolderModal';
import FilePreviewModal from './components/modals/FilePreviewModal';
import ShareLinkModal from './components/modals/ShareLinkModal';
import VersioningInfoModal from './components/modals/VersioningInfoModal';
import FileList from './components/FileList';
import FileActions from './components/FileActions';

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
    console.log(filePath);
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
    // Lancer le téléchargement
    const task = downloadData({ path: fileKey });

    // Attendre le résultat réel
    const result = await task.result;
    console.log("Preview download result:", result);

    if (!result.body) {
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
    console.log("Download key:", fileKey);
    const task = downloadData({ path: fileKey });
    
    const result = await task.result; // <- ATTENTION ici
    console.log("Download result: ", result);

    let blob;
    if (!result.body) {
      blob = new Blob([''], { type: 'application/octet-stream' });
    } else {
      blob = await result.body.blob();
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileKey.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

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
                <FileActions
                  breadcrumbParts={breadcrumbParts}
                  handleBreadcrumbClick={handleBreadcrumbClick}
                  setCreateFolderModalOpen={setCreateFolderModalOpen}
                  fileInputRef={fileInputRef}
                  uploading={uploading}
                />

                {uploading && (
                    <Box sx={{ mb: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Text textAlign="center">{uploadProgress}%</Text>
                    </Box>
                )}

                <FileList
                  loading={loading}
                  folders={folders}
                  files={files}
                  identityId={identityId}
                  currentPath={currentPath}
                  handleFolderClick={handleFolderClick}
                  handlePreview={handlePreview}
                  handleOpenShareLinkModal={handleOpenShareLinkModal}
                  handleOpenVersioningModal={handleOpenVersioningModal}
                  downloadFile={downloadFile}
                  deleteItem={deleteItem}
                />
                </Box>
            </Grid>
        </Grid>
      </Container>

      <CreateFolderModal
        open={isCreateFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        onCreate={createFolder}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        creatingFolder={creatingFolder}
      />

      <FilePreviewModal
        open={isPreviewModalOpen}
        onClose={handleClosePreviewModal}
        fileName={previewFileName}
        contentType={previewContentType}
        contentUrl={previewContentUrl}
        loading={loadingPreview}
      />

      <ShareLinkModal
        open={isShareLinkModalOpen}
        onClose={handleCloseShareLinkModal}
        fileName={sharingFileKey.split('/').pop()}
        expirationHours={shareExpirationHours}
        setExpirationHours={setShareExpirationHours}
        generating={generatingShareLink}
        onGenerate={generateShareableLink}
        sharedLink={sharedLink}
        onCopy={handleCopyLink}
      />

      <VersioningInfoModal
        open={isVersioningModalOpen}
        onClose={handleCloseVersioningModal}
        fileName={versioningFileName}
      />

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