import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchShowcase } from '../lib/api';
import type { Showcase } from '../types/showcase';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../lib/supabaseClient';
import { StlViewer } from '../components/StlViewer';

const uploadsBucket = import.meta.env.VITE_SUPABASE_BUCKET_UPLOADS as string | undefined;
const convertedBucket = import.meta.env.VITE_SUPABASE_BUCKET_CONVERTED as string | undefined;

export const ShowcasePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { session, user } = useAuth();
  const token = session?.access_token;
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setError('Missing showcase slug');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchShowcase(slug, token);
        setShowcase(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug, token]);

  const createdAt = useMemo(() => {
    if (!showcase?.createdAt) return null;
    const date = new Date(showcase.createdAt);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
  }, [showcase]);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    const resolveUrls = async () => {
      if (!showcase) {
        setStlUrl(null);
        setOriginalUrl(null);
        return;
      }

      const [stl, original] = await Promise.all([
        convertedBucket ? getFileUrl(convertedBucket, showcase.stlPath) : Promise.resolve(null),
        uploadsBucket ? getFileUrl(uploadsBucket, showcase.originalPath) : Promise.resolve(null)
      ]);

      setStlUrl(stl);
      setOriginalUrl(original);
    };

    void resolveUrls();
  }, [showcase]);

  const isOwner = useMemo(() => {
    if (!showcase || !user) return false;
    return showcase.ownerId === user.id;
  }, [showcase, user]);

  const visibilityLabel = showcase?.visibility ?? 'public';

  const shareUrl = useMemo(() => {
    if (!slug || typeof window === 'undefined') return '';
    return `${window.location.origin}/s/${slug}`;
  }, [slug]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error('Failed to copy link', copyError);
    }
  }, [shareUrl]);

  if (loading) {
    return (
      <div className="page">
        <p>Loading showcase...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  if (!showcase) {
    return (
      <div className="page">
        <p>No showcase found.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{showcase.title}</h1>
          <p className="page-subtitle">
            Visibility: <strong>{visibilityLabel}</strong>
            {isOwner ? ' (you)' : null}
          </p>
          {createdAt ? <p className="page-subtitle">Created {createdAt}</p> : null}
        </div>
      </div>

      {showcase.description ? (
        <div className="card">
          <h2>Description</h2>
          <p>{showcase.description}</p>
        </div>
      ) : null}

      <div className="card viewer-card">
        <h2>3D Viewer</h2>
        {stlUrl ? (
          <StlViewer src={stlUrl} />
        ) : (
          <p className="note">Converted STL not available yet.</p>
        )}
      </div>

      <div className="card">
        <h2>Files</h2>
        <ul className="file-list">
          <li>
            <span>Original CAD</span>
            <code>{showcase.originalPath}</code>
            {originalUrl ? (
              <a className="button" href={originalUrl} target="_blank" rel="noreferrer">
                Download original
              </a>
            ) : null}
          </li>
          <li>
            <span>Converted STL</span>
            <code>{showcase.stlPath}</code>
            {stlUrl ? (
              <a className="button" href={stlUrl} target="_blank" rel="noreferrer">
                Download STL
              </a>
            ) : null}
          </li>
        </ul>
        {shareUrl ? (
          <div className="share-row">
            <code>{shareUrl}</code>
            <button type="button" className="secondary-button" onClick={handleCopyShareLink}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};





