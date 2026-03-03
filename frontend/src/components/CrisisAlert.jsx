/**
 * Crisis Alert Component.
 * Displays emergency resources.
 */

import './CrisisAlert.css';

export function CrisisAlert({ severity = 'danger', resources = [] }) {
  if (!resources || resources.length === 0) {
    return null;
  }

  const severityLabel = {
    danger: 'We are concerned about your safety',
    emergency: 'This requires immediate attention',
    warning: 'We want to ensure you have support',
  }[severity] || 'Support Resources Available';

  return (
    <div className={`crisisAlert crisisAlert--${severity}`}>
      <div className="crisisAlertContent">
        {/* Alert Header */}
        <div className="crisisAlertHeader">
          <div className="crisisAlertIcon">!</div>
          <div>
            <h3 className="crisisAlertTitle">{severityLabel}</h3>
            <p className="crisisAlertSubtitle">
              Immediate help is available. Please reach out to one of these resources.
            </p>
          </div>
        </div>

        {/* Resources List */}
        <div className="crisisResources">
          {resources.map((resource, idx) => (
            <div key={idx} className="crisisResource">
              <div className="resourceHeader">
                <h4 className="resourceName">{resource.name}</h4>
              </div>

              {/* Contact Options */}
              <div className="resourceContacts">
                {resource.phone && (
                  <a
                    href={`tel:${resource.phone}`}
                    className="resourceLink resourceLink--phone"
                    aria-label={`Call ${resource.name} at ${resource.phone}`}
                  >
                    <span className="contactMethod">Call</span>
                    <span className="contactInfo">{resource.phone}</span>
                  </a>
                )}

                {resource.text && (
                  <a
                    href={`sms:${resource.text}`}
                    className="resourceLink resourceLink--text"
                    aria-label={`Text ${resource.name}`}
                  >
                    <span className="contactMethod">Text</span>
                    <span className="contactInfo">{resource.text}</span>
                  </a>
                )}

                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resourceLink resourceLink--web"
                    aria-label={`Visit ${resource.name} website`}
                  >
                    <span className="contactMethod">Web</span>
                    <span className="contactInfo">Visit Website</span>
                  </a>
                )}
              </div>

              {/* Description */}
              {resource.description && (
                <p className="resourceDescription">{resource.description}</p>
              )}

              {/* Availability */}
              {resource.available && (
                <p className="resourceAvailability">{resource.available}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Message */}
        <div className="crisisAlertFooter">
          <p className="crisisAlertMessage">
            You don't have to face this alone. These resources are available 24/7.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CrisisAlert;
