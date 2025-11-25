import React from 'react';
import {
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CreateNewFolder as CreateNewFolderIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { Flex } from '@aws-amplify/ui-react';

const FileActions = ({
  breadcrumbParts,
  handleBreadcrumbClick,
  setCreateFolderModalOpen,
  fileInputRef,
  uploading
}) => {
  return (
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
  );
};

export default FileActions;
