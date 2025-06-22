import { useState, useEffect } from "react";

export const useMotionDetection = () => {
  const [isShaking, setIsShaking] = useState(false);
  const [deviceOrientation, setDeviceOrientation] = useState<string>("normal");
  const [motionPermission, setMotionPermission] = useState<string>("unknown");
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const shakeThreshold = 15; // Acceleration threshold for shake detection

  // Request device motion permission (iOS 13+)
  const requestMotionPermission = async () => {
    // @ts-expect-error - iOS DeviceMotionEvent.requestPermission is not in standard types
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        // @ts-expect-error - iOS DeviceMotionEvent.requestPermission is not in standard types
        const permission = await DeviceMotionEvent.requestPermission();
        setMotionPermission(permission);
        if (permission === "granted") {
          setupMotionListeners();
        }
      } catch (error) {
        console.error("Error requesting motion permission:", error);
        setMotionPermission("denied");
      }
    } else {
      // Non-iOS devices or older iOS versions
      setMotionPermission("granted");
      setupMotionListeners();
    }
  };

  // Setup motion and orientation listeners
  const setupMotionListeners = () => {
    // Shake detection
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration) {
        const totalAcceleration = Math.sqrt(
          (acceleration.x || 0) ** 2 +
            (acceleration.y || 0) ** 2 +
            (acceleration.z || 0) ** 2
        );

        if (totalAcceleration > shakeThreshold) {
          const now = Date.now();
          if (now - lastShakeTime > 1000) {
            // Debounce shakes
            setIsShaking(true);
            setLastShakeTime(now);
            console.log(
              "🎲 [MOTION] Shake detected! Acceleration:",
              totalAcceleration.toFixed(2)
            );

            // Reset shake state after animation
            setTimeout(() => setIsShaking(false), 1000);
          }
        }
      }
    };

    // Orientation detection
    const handleOrientationChange = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event; // beta: front-back tilt, gamma: left-right tilt

      if (beta !== null && gamma !== null) {
        let orientation = "normal";

        if (Math.abs(beta) > 150 || Math.abs(gamma) > 150) {
          orientation = "upside-down";
        } else if (Math.abs(gamma) > 45) {
          orientation = gamma > 0 ? "tilted-right" : "tilted-left";
        } else if (beta > 45) {
          orientation = "face-down";
        } else if (beta < -45) {
          orientation = "face-up";
        }

        if (orientation !== deviceOrientation) {
          setDeviceOrientation(orientation);
          console.log(
            "📱 [ORIENTATION] Device orientation:",
            orientation,
            `(β:${beta.toFixed(1)}°, γ:${gamma.toFixed(1)}°)`
          );
        }
      }
    };

    window.addEventListener("devicemotion", handleDeviceMotion);
    window.addEventListener("deviceorientation", handleOrientationChange);

    // Cleanup function
    return () => {
      window.removeEventListener("devicemotion", handleDeviceMotion);
      window.removeEventListener("deviceorientation", handleOrientationChange);
    };
  };

  useEffect(() => {
    // Initialize motion detection on component mount
    if (typeof window !== "undefined") {
      // For non-iOS devices, automatically enable motion detection
      // @ts-expect-error - iOS DeviceMotionEvent.requestPermission is not in standard types
      if (typeof DeviceMotionEvent.requestPermission !== "function") {
        setMotionPermission("granted");
        setupMotionListeners();
      }
    }
  }, []);

  return {
    isShaking,
    deviceOrientation,
    motionPermission,
    requestMotionPermission,
  };
};
