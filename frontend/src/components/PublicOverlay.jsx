import React from 'react';
import {createPortal} from 'react-dom';

// Escape main's isolation and animated ancestors so dialogs cover the navbar.
export default function PublicOverlay({children,...props}){
  return createPortal(<div {...props}>{children}</div>,document.body);
}
