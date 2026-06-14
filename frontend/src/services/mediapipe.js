/**
 * ExamGuard Pro - MediaPipe Integration Service
 * ================================================
 * Sets up @mediapipe/tasks-vision for:
 *   1. Face Landmark Detection (presence, count)
 *   2. Pose Landmark Detection (phone holding detection)
 *   3. Object Detection (phone/book detection)
 *
 * Processes video frame by frame and returns detected anomalies.
 *
 * Detection logic:
 *   - NO face landmarks → face_absent
 *   - >1 face detected  → multiple_faces
 *   - Specific hand/arm pose → phone_detected (wrist raised, elbow bent)
 *   - Face not centered → looking_away
 */

import {
  FaceLandmarker,
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

let faceLandmarker = null;
let poseLandmarker = null;
let initialized = false;
let initializing = false;

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

/**
 * Initialize MediaPipe models (called once).
 * Models are loaded from CDN.
 */
export const initMediaPipe = async (onProgress) => {
  if (initialized || initializing) return;
  initializing = true;

  try {
    onProgress?.('Loading MediaPipe runtime...');

    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);

    onProgress?.('Loading Face Landmarker model...');
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      outputFaceBlendshapes: false,
      runningMode: 'VIDEO',
      numFaces: 3,  // detect up to 3 faces (to catch multiple people)
    });

    onProgress?.('Loading Pose Landmarker model...');
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });

    initialized = true;
    onProgress?.('MediaPipe ready ✓');
    console.log('[MediaPipe] All models loaded successfully.');
  } catch (err) {
    console.error('[MediaPipe] Failed to load models:', err);
    initialized = false;
    throw err;
  } finally {
    initializing = false;
  }
};

export const isMediaPipeReady = () => initialized;

/**
 * Analyze a single video frame.
 * @param {HTMLVideoElement} videoEl
 * @param {number} frameNumber
 * @returns {Array} List of detected anomalies: [{type, confidence, details}]
 */
export const analyzeFrame = (videoEl, frameNumber) => {
  if (!initialized || !faceLandmarker || !poseLandmarker) return [];
  if (videoEl.readyState < 2) return [];

  const now = performance.now();
  const anomalies = [];

  try {
    // ── Face Detection ──────────────────────────────────────────────────────
    const faceResult = faceLandmarker.detectForVideo(videoEl, now);
    const faceCount = faceResult.faceLandmarks?.length ?? 0;

    if (faceCount === 0) {
      anomalies.push({
        type: 'face_absent',
        confidence: 0.92,
        details: { frame: frameNumber, faceCount: 0 },
      });
    } else if (faceCount > 1) {
      anomalies.push({
        type: 'multiple_faces',
        confidence: Math.min(0.99, 0.85 + (faceCount - 2) * 0.1),
        details: { frame: frameNumber, faceCount },
      });
    } else {
      // Check if looking away (face not centered horizontally)
      const landmarks = faceResult.faceLandmarks[0];
      if (landmarks && landmarks.length > 0) {
        const noseTip = landmarks[1]; // MediaPipe face landmark #1 = nose tip
        if (noseTip) {
          const xOffset = Math.abs(noseTip.x - 0.5);  // 0 = center, 0.5 = edge
          const yOffset = Math.abs(noseTip.y - 0.45);

          if (xOffset > 0.2 || yOffset > 0.2) {
            anomalies.push({
              type: 'looking_away',
              confidence: Math.min(0.95, 0.6 + xOffset + yOffset),
              details: {
                frame: frameNumber,
                xOffset: xOffset.toFixed(3),
                yOffset: yOffset.toFixed(3),
              },
            });
          }
        }
      }
    }

    // ── Pose Detection (Phone holding) ──────────────────────────────────────
    const poseResult = poseLandmarker.detectForVideo(videoEl, now + 1);
    if (poseResult.landmarks?.length > 0) {
      const landmarks = poseResult.landmarks[0];

      // MediaPipe Pose indices:
      // 15 = left wrist, 16 = right wrist
      // 13 = left elbow, 14 = right elbow
      // 11 = left shoulder, 12 = right shoulder

      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];

      if (leftWrist && rightWrist && leftElbow && rightElbow) {
        // Phone detected heuristic:
        // Wrist is raised above elbow AND elbow is bent (wrist near face level)
        // This catches "holding phone up to read" pose
        const leftRaised =
          leftWrist.y < leftElbow.y &&          // wrist above elbow
          leftWrist.y < (leftShoulder?.y ?? 0.5) + 0.1; // near shoulder level

        const rightRaised =
          rightWrist.y < rightElbow.y &&
          rightWrist.y < (rightShoulder?.y ?? 0.5) + 0.1;

        // Wrists close together = holding something (phone/paper)
        const wristsClose =
          Math.abs(leftWrist.x - rightWrist.x) < 0.15 &&
          Math.abs(leftWrist.y - rightWrist.y) < 0.1;

        if ((leftRaised || rightRaised) && wristsClose) {
          anomalies.push({
            type: 'phone_detected',
            confidence: 0.75,
            details: {
              frame: frameNumber,
              leftWristY: leftWrist.y.toFixed(3),
              rightWristY: rightWrist.y.toFixed(3),
            },
          });
        }
      }
    }
  } catch (err) {
    // Silently fail on individual frames
    console.warn('[MediaPipe] Frame analysis error:', err.message);
  }

  return anomalies;
};

/**
 * Draw face mesh overlay on canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} videoEl
 */
export const drawOverlay = (ctx, videoEl) => {
  if (!initialized || !faceLandmarker) return;
  if (videoEl.readyState < 2) return;

  const now = performance.now();
  try {
    const result = faceLandmarker.detectForVideo(videoEl, now);
    const drawingUtils = new DrawingUtils(ctx);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const landmarks of result.faceLandmarks ?? []) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: 'rgba(59, 130, 246, 0.15)', lineWidth: 0.5 }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: 'rgba(6, 182, 212, 0.6)', lineWidth: 1 }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: 'rgba(6, 182, 212, 0.6)', lineWidth: 1 }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: 'rgba(59, 130, 246, 0.4)', lineWidth: 1.5 }
      );
    }
  } catch (_) {}
};

export const cleanup = () => {
  faceLandmarker?.close();
  poseLandmarker?.close();
  faceLandmarker = null;
  poseLandmarker = null;
  initialized = false;
  initializing = false;
};
