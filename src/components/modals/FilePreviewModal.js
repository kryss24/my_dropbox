import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const FilePreviewModal = ({ open, onClose, fileName, contentType, contentUrl, loading }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{fileName}
        <IconButton
          aria-label="close"
          onClick={onClose}
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
        {loading ? (
          <CircularProgress />
        ) : contentUrl && contentType ? (
          contentType.startsWith('image/') ? (
            <img src={contentUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', objectFit: 'contain' }} />
          ) : contentType === 'application/pdf' ? (
            <iframe src={contentUrl} title={fileName} width="100%" height="500px" style={{ border: 'none' }}></iframe>
          ) : (
            <Typography>Preview not available for this file type.</Typography>
          )
        ) : (
          <Typography>No content to preview.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreviewModal;
