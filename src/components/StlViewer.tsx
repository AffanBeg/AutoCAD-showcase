import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

type StlViewerProps = {
  src: string;
};

export const StlViewer = ({ src }: StlViewerProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !src) {
      return;
    }

    let isMounted = true;
    let animationId: number;

    setLoading(true);
    setError(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f6fb);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.01,
      5000
    );
    camera.position.set(6, 6, 6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(6, 8, 10);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(200, 50, 0x94a3b8, 0xe2e8f0);
    grid.position.y = -1;
    scene.add(grid);

    const loader = new STLLoader();

    loader.load(
      src,
      (geometry) => {
        if (!isMounted) {
          return;
        }

        const material = new THREE.MeshStandardMaterial({
          color: 0x4f46e5,
          metalness: 0.2,
          roughness: 0.4
        });

        const mesh = new THREE.Mesh(geometry, material);
        geometry.computeBoundingBox();

        const box = geometry.boundingBox;
        if (box) {
          const center = box.getCenter(new THREE.Vector3());
          mesh.position.sub(center);

          const size = box.getSize(new THREE.Vector3());
          const maxDimension = Math.max(size.x, size.y, size.z);
          const fitDistance =
            maxDimension / (2 * Math.tan((Math.PI * camera.fov) / 360));
          const distance = fitDistance * 2;

          camera.near = Math.max(fitDistance / 1000, 0.01);
          camera.far = Math.max(distance * 100, 500);
          camera.updateProjectionMatrix();

          camera.position.set(distance, distance, distance);
          controls.target.set(0, 0, 0);
          controls.maxDistance = distance * 5;
          controls.minDistance = Math.max(distance / 100, 0.01);
          controls.update();
        }

        scene.add(mesh);
        setLoading(false);
      },
      undefined,
      (loadError) => {
        if (!isMounted) {
          return;
        }        console.error('Failed to load STL', loadError);
        setError('Unable to load STL file.');
        setLoading(false);
      }
    );

    const handleResize = () => {
      if (!mount) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [src]);

  return (
    <div className="viewer-wrapper">
      <div className="viewer-canvas" ref={mountRef} />
      {loading ? <p className="viewer-status">Loading STL...</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
};

