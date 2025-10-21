import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShowcase } from '../lib/api';
import type { CreateShowcaseResponse } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const CreateShowcasePage = () => {
  const navigate = useNavigate();
  const { user, session, loading, signInWithGoogle } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateShowcaseResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Please choose a CAD file to upload.');
      return;
    }

    if (!session?.access_token) {
      setError('You must be signed in before creating a showcase.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await createShowcase(
        {
          title,
          description: description.trim() ? description.trim() : undefined,
          visibility,
          file
        },
        session.access_token
      );

      setResult(response);
      setCopied(false);
      setFile(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToShowcase = () => {
    if (!result) return;
    navigate(`/s/${result.slug}`);
  };

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to start Google sign-in', error);
      alert('Unable to start Google sign-in. Check console for details.');
    }
  }, [signInWithGoogle]);

  const shareUrl = useMemo(() => {
    if (!result || typeof window === 'undefined') return '';
    return `${window.location.origin}/s/${result.slug}`;
  }, [result]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error('Failed to copy share link', copyError);
    }
  }, [shareUrl]);

  return (
    <div className="page">
      <h1>Create Showcase</h1>
      <p className="page-subtitle">
        Upload a CAD model (STL, STEP, IGES, F3Z). Non-STL files will be converted to STL via FreeCAD/CadQuery.
      </p>

      {loading ? (
        <div className="card">
          <p>Checking authentication status...</p>
        </div>
      ) : !user ? (
        <div className="card">
          <h2>Sign in required</h2>
          <p>You need to sign in with Google to create showcases and manage visibility.</p>
          <div className="actions">
            <button type="button" onClick={handleSignIn} className="secondary-button">
              Sign in with Google
            </button>
          </div>
        </div>
      ) : (
        <form className="card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              name="title"
              value={title}
              required
              onChange={(event) => setTitle(event.target.value)}
              placeholder="3D printed bracket"
            />
          </label>

          <label className="field">
            <span>Description (optional)</span>
            <textarea
              name="description"
              value={description}
              rows={4}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Include part notes, materials, tolerances..."
            />
          </label>

          <label className="field">
            <span>Visibility</span>
            <select
              name="visibility"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
            >
              <option value="public">Public (anyone with the link)</option>
              <option value="private">Private (only you)</option>
            </select>
          </label>

          <label className="field">
            <span>CAD file</span>
            <input
              type="file"
              name="file"
              accept=".stl,.step,.stp,.iges,.igs,.f3z"
              required
              onChange={(event) => {
                const selectedFile = event.target.files?.item(0) ?? null;
                setFile(selectedFile);
              }}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : 'Create Showcase'}
            </button>
          </div>
        </form>
      )}

      {result ? (
        <div className="card success">
          <h2>Showcase created!</h2>
          <p>
            Slug: <code>{result.slug}</code>
          </p>
          <p>
            Visibility: <strong>{result.visibility ?? visibility}</strong>
          </p>
          <p>
            {result.conversionSkipped
              ? 'Conversion skipped (STL provided).'
              : 'Conversion completed via configured pipeline.'}
          </p>
          {shareUrl ? (
            <div className="share-row">
              <code>{shareUrl}</code>
              <button type="button" className="secondary-button" onClick={handleCopyShareLink}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          ) : null}
          <div className="actions">
            <button type="button" onClick={handleGoToShowcase}>
              View Showcase
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
