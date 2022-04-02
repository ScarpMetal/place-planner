import { logEvent } from "firebase/analytics";
import { Component, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SketchProps } from "react-p5/@types";
import "./App.css";
import colors from "./colors";
import Canvas from "./components/Canvas";
import { analytics } from "./firebase";
import JSAlert from "js-alert";

function getInitialPixelDimensions() {
  const localDimensions = JSON.parse(
    localStorage.getItem("pixelDimensions") || "{}"
  ) as { width?: number; height?: number };
  if (
    typeof localDimensions.width === "number" &&
    typeof localDimensions.height === "number"
  ) {
    return localDimensions;
  }
  if (window.innerWidth < 600) {
    return { width: 15, height: 15 };
  }
  return {
    width: 25,
    height: 25,
  };
}

function App() {
  const canvasRef = useRef<Component<SketchProps, any, any>>(null);
  const errorTimeout = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastClear, setLastClear] = useState(new Date().toISOString());
  const [showGrid, setShowGrid] = useState(true);
  const [pixelDimensions, setPixelDimensions] = useState<{
    width?: number;
    height?: number;
  }>(getInitialPixelDimensions);
  const [colorIndex, setColorIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const color = useMemo(() => colors[colorIndex], [colorIndex]);

  // save dimensions to localstorage
  useLayoutEffect(() => {
    localStorage.setItem("pixelDimensions", JSON.stringify(pixelDimensions));
  }, [pixelDimensions]);

  // disable touchmove on mobile so screen doesnt move when dragging
  useLayoutEffect(() => {
    function preventBehavior(e: TouchEvent) {
      e.preventDefault();
    }

    const options: AddEventListenerOptions = { passive: false };

    document.addEventListener("touchmove", preventBehavior, options);
    return () => {
      document.removeEventListener("touchmove", preventBehavior, options);
    };
  }, []);

  // detect unmount of component
  useLayoutEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // hide error after 2.5 seconds
  useLayoutEffect(() => {
    if (errorTimeout.current) {
      clearTimeout(errorTimeout.current);
    }
    errorTimeout.current = setTimeout(() => {
      if (mounted.current) {
        setError(null);
        errorTimeout.current = null;
      }
    }, 5000);
  }, [error]);

  const clearCanvas = () => {
    localStorage.clear();
    setPixelDimensions(getInitialPixelDimensions());
    setShowGrid(true);
    setError(null);
    if (errorTimeout.current) {
      clearTimeout(errorTimeout.current);
      errorTimeout.current = null;
    }
    setLastClear(new Date().toISOString());
    logEvent(analytics, "cleared-canvas");
  };

  const initiateClearCanvas = () => {
    setModalOpen(true);

    const handleTouchUp = () => {
      if (mounted.current) {
        setModalOpen(false);
      }
      document.removeEventListener("mouseup", handleTouchUp);
    };

    document.addEventListener("mouseup", handleTouchUp);

    // Show a confirm alert
    JSAlert.confirm("Are you sure you want to clear the canvas?").then(
      function (confirmClear: boolean) {
        // if pressed no or component unmounted
        if (!confirmClear || !mounted.current) return;

        clearCanvas();
      }
    );
  };

  const getCanvasDataURL = () => {
    // @ts-ignore p5 sketch did not type this
    if (!canvasRef.current?.sketch?.canvas?.toDataURL) {
      return null;
    }

    // @ts-ignore p5 sketch did not type this
    return canvasRef.current.sketch.canvas.toDataURL();
  };

  const handleDownloadToComputer = () => {
    const dataURL = getCanvasDataURL();
    if (!dataURL) {
      setError("Could not download image, try again.");
      logEvent(analytics, "error_downloading_image_to_computer");
      return;
    }

    const dateStr = new Date().toISOString();
    const link = document.createElement("a");
    link.download = `PlacePlannerDrawing@${dateStr}.png`;
    link.href = dataURL;
    link.click();

    logEvent(analytics, "downloaded_image_to_computer", {
      pixelDimensions: localStorage.getItem("pixelDimensions"),
    });
  };

  // const handleShareToReddit = () => {
  //   const dataURL = getCanvasDataURL();
  //   if (!dataURL) {
  //     setError("Could not share image, try again.");
  //   }
  // };

  return (
    <div className="App">
      {error && (
        <div className="error" key={error}>
          {error}
        </div>
      )}
      <div className="canvas-container">
        <div className="canvas-content-container">
          <div className="options">
            <button
              type="button"
              className="clear-canvas"
              onClick={initiateClearCanvas}
            >
              Clear Canvas
            </button>

            <div className="dimensions">
              <input
                inputMode="numeric"
                type="number"
                onChange={(e) => {
                  setPixelDimensions((prev) => ({
                    ...prev,
                    width: e.target.valueAsNumber,
                  }));
                }}
                onClick={(e) => {
                  if ("select" in e.target) {
                    // @ts-ignore not recognizing select
                    e.target.select();
                  }
                }}
                value={pixelDimensions.width}
              />{" "}
              <span>x</span>{" "}
              <input
                inputMode="numeric"
                type="number"
                onChange={(e) => {
                  setPixelDimensions((prev) => ({
                    ...prev,
                    height: e.target.valueAsNumber,
                  }));
                }}
                onClick={(e) => {
                  if ("select" in e.target) {
                    // @ts-ignore not recognizing select
                    e.target.select();
                  }
                }}
                value={pixelDimensions.height}
              />
            </div>
            <button
              type="button"
              className="show-grid"
              onClick={() => setShowGrid((prev) => !prev)}
              data-show-grid={showGrid}
            >
              {showGrid ? "Hide" : "Show"} Grid
            </button>
            <button
              type="button"
              className="download"
              onClick={handleDownloadToComputer}
            >
              Download Image
            </button>
            {/* <button
              type="button"
              className="reddit-share"
              onClick={handleShareToReddit}
            >
              Reddit Share
            </button> */}
          </div>
          <Canvas
            key={lastClear}
            ref={canvasRef}
            paused={modalOpen}
            showGrid={showGrid}
            color={color}
            pixelWidth={pixelDimensions.width || 0}
            pixelHeight={pixelDimensions.height || 0}
          />
        </div>
      </div>
      <div className="colors-container">
        <div className="colors">
          {colors.map((color, index) => {
            return (
              <button
                key={index}
                type="button"
                data-selected={index === colorIndex}
                data-white={color.name === "white"}
                style={{ backgroundColor: color.hex }}
                onClick={() => {
                  setColorIndex(index);
                  logEvent(analytics, "selected_color", color);
                }}
              >
                <div className="tooltip">{color.name}</div>
              </button>
            );
          })}
        </div>
        <a
          className="feedback"
          target="_blank"
          rel="noreferrer"
          href="https://www.reddit.com/user/ScarpMetal/comments/tu478n/rplace_planner_feedback_thread/"
          onClick={() => {
            logEvent(analytics, "feedback_link_clicked");
          }}
        >
          Feedback
        </a>
      </div>
    </div>
  );
}

export default App;
