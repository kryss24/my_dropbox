import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress
} from '@mui/material';

const CreateFolderModal = ({ open, onClose, onCreate, newFolderName, setNewFolderName, creatingFolder }) => {
  return (
    <Dialog open={open} onClose={onClose}>
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
          onKeyPress={(e) => e.key === 'Enter' && onCreate()}
          disabled={creatingFolder}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onCreate} disabled={creatingFolder}>
          {creatingFolder ? <CircularProgress size={24} /> : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateFolderModal;
