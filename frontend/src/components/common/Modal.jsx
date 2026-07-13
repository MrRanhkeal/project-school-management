import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/** Responsive dialog: full-screen on phones, centered card on larger screens. */
export default function Modal({ open, onClose, title, actions, children, maxWidth = 'sm' }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const handleClose = (event, data) => { 
    if (data === 'backdropClick') return; 
    if (data === 'escapeKeyDown') return;

    onClose?.(event, data);
  };
  
  return (
    <Dialog 
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={maxWidth}
      disableEscapeKeyDown
      // open={open} 
      // onClose={onClose} 
      // fullScreen={fullScreen} 
      // fullWidth 
      // maxWidth={maxWidth}  
      // disableEscapeKeyDown
    >
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton 
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>}
    </Dialog>
  );
}
