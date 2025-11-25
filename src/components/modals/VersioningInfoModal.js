import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const VersioningInfoModal = ({ open, onClose, fileName }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>File Versions for {fileName}
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
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Implementing a full versioning system with UI for browsing and restoring previous versions requires direct AWS SDK calls or a backend service (e.g., AWS Lambda) to interact with S3's versioning API. This functionality is beyond the scope of this frontend-only implementation using `aws-amplify/storage`'s high-level API.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          To enable S3 bucket versioning, this must be configured in your AWS S3 bucket settings or via Amplify overrides. Once enabled, the versions are managed by S3 automatically.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VersioningInfoModal;
