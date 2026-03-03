import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import styles from "../pages/Journal.module.css";
import { journalService } from "../services/journalService";

const normalizeTags = (tags) => {
   const clean = (value) => {
     if (value === null || value === undefined) return null;
     let text = String(value).trim();
     // Remove escaped quotes and brackets
     text = text.replace(/^\["/, "").replace(/"\]$/, "").replace(/["\[\]\\]/g, "");
     text = text.trim();
     if (!text || ["null", "none", "undefined", "[]"].includes(text.toLowerCase())) {
       return null;
     }
     return text.toLowerCase();
   };

   let result = [];
   if (Array.isArray(tags)) {
     result = tags.map(clean).filter(Boolean);
   } else if (typeof tags === "string" && tags.trim()) {
     try {
       const parsed = JSON.parse(tags);
       result = Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [clean(tags)];
     } catch {
       result = tags.split(",").map(clean).filter(Boolean);
     }
   }
   
   // Deduplicate
   return [...new Set(result)];
 };

const emotionOptions = ["neutral", "sadness", "joy", "anger", "fear", "surprise", "disgust"];

const formatEmotionLabel = (value) => {
  if (!value) {
    return "Neutral";
  }
  return value
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function EntryDetailModal({ entryId, isOpen, onClose, onDelete, onEntryUpdated }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [formValues, setFormValues] = useState({
    title: "",
    content: "",
    emotion: "neutral",
    tagsText: "",
  });
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !entryId) {
      setEntry(null);
      setError(null);
      setLoading(false);
      setIsEditing(false);
      return;
    }

    let isCancelled = false;
    const loadEntry = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await journalService.getEntry(entryId);
        if (!isCancelled) {
          setEntry(data);
          setFormValues({
            title: data?.title || "",
            content: data?.content || "",
            emotion: data?.emotion || data?.mood || "neutral",
            tagsText: normalizeTags(data?.tags).join(", "),
          });
          setIsEditing(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError("Failed to load entry details");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadEntry();
    return () => {
      isCancelled = true;
    };
  }, [entryId, isOpen]);

  useEffect(() => {
     const handleKeyDown = (e) => {
       if (!isEditing) return;
       if (e.ctrlKey && e.key === 's') {
         e.preventDefault();
         handleSave();
       }
       if (e.key === 'Escape') {
         handleCancelEditing();
       }
     };
     if (isOpen && isEditing) {
       document.addEventListener('keydown', handleKeyDown);
       return () => document.removeEventListener('keydown', handleKeyDown);
     }
   }, [isEditing, isOpen, formValues]);

   useEffect(() => {
     if (isEditing && titleRef.current) {
       titleRef.current.focus();
       titleRef.current.setSelectionRange(
        titleRef.current.value.length,
        titleRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setFormValues({
      title: entry?.title || "",
      content: entry?.content || "",
      emotion: entry?.emotion || entry?.mood || "neutral",
      tagsText: normalizeTags(entry?.tags).join(", "),
    });
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!formValues.title.trim() || !formValues.content.trim()) {
      setSaveError("Title and content are required.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title: formValues.title.trim(),
        content: formValues.content.trim(),
        emotion: formValues.emotion,
        tags: formValues.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      const updated = await journalService.updateEntry(entryId, payload);
      setEntry(updated);
      setIsEditing(false);
      if (onEntryUpdated) {
        onEntryUpdated(updated);
      }
    } catch (saveErr) {
      setSaveError("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const tags = normalizeTags(entry?.tags);
  const createdDate = entry?.created_at ? new Date(entry.created_at) : null;

  const renderActions = () => {
     if (!entry || !isEditing) return null;
     return (
       <div className={styles.editActions}>
         <button
           type="button"
           className={`${styles.inlineIconBtn} ${styles.inlineIconBtnSave}`}
           onClick={handleSave}
           disabled={isSaving}
           aria-label="Save changes (Ctrl+S)"
           title="Save (Ctrl+S)"
         >
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
             <path
               d="M5 13l4 4L19 7"
               stroke="currentColor"
               strokeWidth="2"
               strokeLinecap="round"
               strokeLinejoin="round"
             />
           </svg>
         </button>
         <button
           type="button"
           className={`${styles.inlineIconBtn} ${styles.inlineIconBtnCancel}`}
           onClick={handleCancelEditing}
           disabled={isSaving}
           aria-label="Cancel editing (Esc)"
           title="Cancel (Esc)"
         >
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
             <path
               d="M6 6l12 12M18 6l-12 12"
               stroke="currentColor"
               strokeWidth="2"
               strokeLinecap="round"
             />
           </svg>
         </button>
       </div>
     );
   };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className={styles.closeModal} onClick={onClose} aria-label="Close">
          ?
        </button>
        <div className={styles.modalHeader}>
          {createdDate && (
            <p className={styles.modalDate}>
              {createdDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {isEditing ? (
            <textarea
              ref={titleRef}
              className={styles.editTitleArea}
              value={formValues.title}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, title: e.target.value }))
              }
              rows={2}
            />
          ) : (
             <h2 
               className={styles.modalTitle}
               onClick={handleStartEditing}
               role="button"
               tabIndex={0}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                   handleStartEditing();
                 }
               }}
             >
               {entry?.title || "Journal Entry"}
             </h2>
           )}
        </div>

        <div className={styles.modalBody}>
          {loading && <p>Loading entry...</p>}
          {error && <p className={styles.errorText}>{error}</p>}

          {!loading && !error && entry && (
            <>
              <div className={styles.entryMetadata}>
                <div className={styles.metadataBadges}>
                  {(entry.emotion || entry.mood) && (
                    <span className={styles.modalBadge}>
                      {entry.emotion || entry.mood}
                    </span>
                  )}
                  {entry.auto_extract && (
                    <span className={styles.modalBadge}>
                      Auto Extract
                    </span>
                  )}
                  {entry.extraction_method && (
                    <span className={styles.modalBadge}>
                      {entry.extraction_method.replace(/_/g, " ")}
                    </span>
                  )}
                  {typeof entry.ai_confidence === "number" && (
                    <span className={styles.modalBadge}>
                      {`${Math.round(entry.ai_confidence * 100)}% confidence`}
                    </span>
                  )}
                </div>
                <div className={styles.metadataActions}>{renderActions()}</div>
              </div>
              {saveError && <p className={styles.errorText}>{saveError}</p>}

              {isEditing && (
                <div className={styles.editMetaRow}>
                  <div className={styles.editTagField}>
                    <span>Tags</span>
                    <input
                      className={styles.modalInput}
                      type="text"
                      value={formValues.tagsText}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, tagsText: e.target.value }))
                      }
                      placeholder="comfort, growth"
                    />
                  </div>
                  <div className={styles.editEmotionField}>
                    <span>Emotion</span>
                    <select
                      className={styles.modalInput}
                      value={formValues.emotion}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, emotion: e.target.value }))
                      }
                    >
                      {emotionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {isEditing ? (
                <div className={styles.editSurface}>
                  <textarea
                    ref={contentRef}
                    className={styles.editContentArea}
                    value={formValues.content}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, content: e.target.value }))
                    }
                    rows={10}
                  />
                </div>
              ) : (
                <div 
                  className={styles.fullContent}
                  onClick={handleStartEditing}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleStartEditing();
                    }
                  }}
                >
                  <ReactMarkdown>
                    {entry.content || ""}
                  </ReactMarkdown>
                </div>
              )}

              {entry.serenity_thought && (
                <div className={styles.serenityThoughtContainer}>
                  <div className={styles.thoughtLabel}>Serenity Thought</div>
                  <div className={styles.serenityThought}>{entry.serenity_thought}</div>
                </div>
              )}

              {tags.length > 0 && (
                <div className={styles.tagContainer}>
                  {tags.map((tag) => (
                    <span key={tag} className={styles.tagPill}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {onDelete && entry && (
          <div className={styles.modalFooter}>
            <button type="button" className={styles.deleteBtn} onClick={() => onDelete(entry.id)}>
              Delete Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
