import React from 'react';
import { createRoot } from 'react-dom/client';
import DesignSystemPreview from './DesignSystemPreview';

createRoot(document.getElementById('design-system-root')).render(<React.StrictMode><DesignSystemPreview /></React.StrictMode>);
