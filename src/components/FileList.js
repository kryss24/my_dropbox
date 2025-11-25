import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  PictureAsPdf as PictureAsPdfIcon,
  InsertDriveFile as FileIcon,
  Share as ShareIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { Flex } from '@aws-amplify/ui-react';

const FileList = ({
  loading,
  folders,
  files,
  identityId,
  currentPath,
  handleFolderClick,
  handlePreview,
  handleOpenShareLinkModal,
  handleOpenVersioningModal,
  downloadFile,
  deleteItem
}) => {
  if (loading) {
    return <CircularProgress />;
  }

  if (folders.length === 0 && files.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="h6" gutterBottom>
          No files or folders here yet!
        </Typography>
        <Typography variant="body1">
          Upload your first file or create a new folder to get started.
        </Typography>
      </Box>
    );
  }

  return (
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
            <ImageIcon sx={{ mr: 2 }} />
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
  );
};

export default FileList;
