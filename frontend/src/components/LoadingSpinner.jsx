/**
 * Loading Spinner.
 */

import './LoadingSpinner.css';

export function LoadingSpinner() {
  return (
    <div className="loadingSpinner">
      <div className="spinnerDot"></div>
      <div className="spinnerDot"></div>
      <div className="spinnerDot"></div>
    </div>
  );
}

export default LoadingSpinner;
