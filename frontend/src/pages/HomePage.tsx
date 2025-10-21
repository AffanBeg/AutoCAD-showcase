import { Link } from 'react-router-dom';

export const HomePage = () => (
  <div className="page">
    <h1>CAD Showcase Platform</h1>
    <p className="page-subtitle">
      Upload CAD models, convert non-STL formats automatically, and publish interactive three.js viewers you can share with teammates or hiring managers.
    </p>
    <div className="card">
      <h2>How it works</h2>
      <ul className="file-list">
        <li>Sign in with Google to manage your showcases.</li>
        <li>Upload STL, STEP, IGES, or F3Z files—non-STL formats convert to STL automatically.</li>
        <li>Choose public or private visibility, then share the /s/&lt;slug&gt; link.</li>
        <li>Visitors can orbit, pan, and download the STL straight from the viewer page.</li>
      </ul>
      <Link className="button" to="/create">
        Create Showcase
      </Link>
    </div>
  </div>
);
