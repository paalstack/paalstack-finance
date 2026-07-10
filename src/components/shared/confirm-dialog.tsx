'use client';

import { AlertDialog } from '@paalstack/react-ui';
import { type ComponentProps } from 'react';

type AlertDialogProps = ComponentProps<typeof AlertDialog>;

type ConfirmDialogProps = Omit<AlertDialogProps, 'confirmButtonText' | 'cancelButtonText'> & {
  confirmText?: string;
  cancelText?: string;
};

/**
 * App-wide default for destructive confirmations (delete account, delete
 * transaction, etc.) so copy and behavior stay consistent across features.
 */
export const ConfirmDialog = ({
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  ...props
}: ConfirmDialogProps) => (
  <AlertDialog confirmButtonText={confirmText} cancelButtonText={cancelText} {...props} />
);
