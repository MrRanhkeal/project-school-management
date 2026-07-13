import React from 'react';
import { TextField, MenuItem } from '@mui/material';
import { capitalize } from '../../utils/helpers';

/**
 * TextField wrapper covering the field types used across the app.
 *
 * type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select'
 * options (for select): ['a', 'b'] or [{ value, label }]
 */
export default function Input({ type = 'text', options = [], allowEmpty = false, ...props }) {
  const isSelect = type === 'select';
  return (
    <TextField
      fullWidth
      size="small"
      margin="dense"
      select={isSelect}
      type={isSelect ? undefined : type}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      {...props} 
    >
      {isSelect && allowEmpty && (
        <MenuItem value="">
          <em>—</em>
        </MenuItem>
      )}
      {isSelect &&
        options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : capitalize(opt);
          return (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          );
        })}
    </TextField>
  );
}
