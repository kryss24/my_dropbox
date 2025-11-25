import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  CircularProgress,
  Typography,
  Box
} from '@mui/material';
import { Close as CloseIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';

const ShareLinkModal = ({
  open,
  onClose,
  fileName,
  expirationHours,
  setExpirationHours,
  generating,
  onGenerate,
  sharedLink,
  onCopy
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Share File
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
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          Generate a shareable link for: {fileName}
        </Typography>
        <TextField
          label="Link expires in (hours)"
          type="number"
          value={expirationHours}
          onChange={(e) => setExpirationHours(Math.max(1, parseInt(e.target.value) || 1))}
          fullWidth
          margin="normal"
          InputProps={{ inputProps: { min: 1 } }}
          disabled={generating}
        />
        <Button
          variant="contained"
          onClick={onGenerate}
          disabled={generating}
          sx={{ mt: 2 }}
          startIcon={generating ? <CircularProgress size={20} /> : null}
        >
          {generating ? 'Generating...' : 'Generate Link'}
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
              onClick={onCopy}
              startIcon={<ContentCopyIcon />}
              sx={{ mt: 1 }}
            >
              Copy Link
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareLinkModal;
