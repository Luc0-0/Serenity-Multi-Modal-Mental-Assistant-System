import React from 'react';
import './SidebarToggleButton.css';

export function SidebarToggleButton({ isOpen, onClick }) {
  return (
    <button
      className={`sidebarArrowButton ${isOpen ? 'open' : 'closed'}`}
      onClick={onClick}
      aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-expanded={isOpen}
      title={isOpen ? 'Collapse' : 'Expand'}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 2L10 7L5 12"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default SidebarToggleButton;
