import { useCallback, useEffect, useRef, useState } from "react";

import premiumAvatarAsset from "../../assets/sefer-abi-premium-avatar.png";
import seferAbiExpressionSpriteSetAsset from "../../assets/sefer-abi-expression-sprite-set.png";
import spriteOpenAsset from "../../assets/sefer-abi-sprite-blink/frame-open.png";
import spriteHalfCloseAsset from "../../assets/sefer-abi-sprite-blink/frame-half-close.png";
import spriteClosedAsset from "../../assets/sefer-abi-sprite-blink/frame-closed.png";
import { normalizeSeferAbiWidgetState } from "./SeferAbiWidgetState";
import { drawSeferAbiAvatarFrame } from "./seferAbiAvatarCanvas";
import { getSeferAbiMotionFrame } from "./seferAbiAvatarMotion";
import { getSeferAbiExpressionAsset, getSeferAbiExpressionKey, getSeferAbiExpressionPreloadAssets, getSeferAbiExpressionVariant } from "./seferAbiExpressionSprite";
import { getSeferAbiExpressionFrameBackgroundPosition } from "./seferAbiExpressionFrameCatalog";
import {
  SPRITE_BLINK_EXPERIMENT_ENABLED,
  getSeferAbiSpriteFrame,
  getSeferAbiSpriteFrameBoundary,
  isSpriteBlinkTrialEnabled,
} from "./seferAbiSpriteBlink";

// The current source is a single flattened PNG. Its experimental eyelid,
// brow, and mouth overlays are not visually acceptable at product size, so
// keep the approved portrait static until clean facial layers are available.
export const FACIAL_ANIMATION_VISUAL_APPROVED = false;

const SPRITE_FRAME_ASSETS = Object.freeze({
  open: spriteOpenAsset,
  halfClose: spriteHalfCloseAsset,
  closed: spriteClosedAsset,
  halfOpen: spriteHalfCloseAsset,
});

const SPRITE_ASSET_LOAD_CACHE = new Map();
const EXPRESSION_TRANSITION_OUT_MS = 90;
const EXPRESSION_TRANSITION_IN_MS = 120;

function preloadSpriteAsset(asset) {
  if (!asset || typeof Image === "undefined") return Promise.resolve(false);
  if (SPRITE_ASSET_LOAD_CACHE.has(asset)) return SPRITE_ASSET_LOAD_CACHE.get(asset);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = asset;
  });
  SPRITE_ASSET_LOAD_CACHE.set(asset, promise);
  return promise;
}

export default function SeferAbiAvatar({ state = "idle", size = 52, decorative = true, frameless = false }) {
  const normalizedState = normalizeSeferAbiWidgetState(state);
  const dimension = Number.isFinite(Number(size)) ? Number(size) : 52;
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const expressionTransitionTimerRef = useRef(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [spriteTrialEnabled] = useState(() => isSpriteBlinkTrialEnabled());
  const [spriteStatus, setSpriteStatus] = useState({ key: "", ready: false, failed: false });
  const [spriteFrame, setSpriteFrame] = useState("open");
  const [visibleExpressionAsset, setVisibleExpressionAsset] = useState(null);
  const [pendingExpressionAsset, setPendingExpressionAsset] = useState(null);
  const visibleExpressionAssetRef = useRef(null);
  const pendingExpressionAssetRef = useRef(null);
  const [expressionTransition, setExpressionTransition] = useState("stable");
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event) => setReducedMotion(event.matches);
    mediaQuery.addEventListener?.("change", handleChange);
    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, []);

  const expressionVariant = getSeferAbiExpressionVariant(normalizedState);
  const expressionAsset = expressionVariant.kind === "frame" ? seferAbiExpressionSpriteSetAsset : expressionVariant.asset || getSeferAbiExpressionAsset(normalizedState);
  const expressionKey = getSeferAbiExpressionKey(normalizedState);
  const expressionVariantKey = expressionVariant.kind === "frame" ? expressionVariant.frameId : expressionKey;
  const isIdleSprite = normalizedState === "idle";
  const spriteLoadKey = isIdleSprite ? "idle" : expressionVariantKey || expressionAsset || "";
  const shouldLoadSprite = SPRITE_BLINK_EXPERIMENT_ENABLED
    && spriteTrialEnabled
    && !reducedMotion
    && (isIdleSprite || Boolean(expressionAsset));

  const handleExpressionLoad = useCallback((loadedAsset) => {
    const loadedKey = loadedAsset?.key || loadedAsset;
    const pendingKey = pendingExpressionAssetRef.current?.key || pendingExpressionAssetRef.current;
    if (!loadedAsset || loadedKey !== pendingKey) return;

    if (expressionTransitionTimerRef.current) window.clearTimeout(expressionTransitionTimerRef.current);
    const hasCurrentExpression = Boolean(visibleExpressionAssetRef.current);
    setExpressionTransition(hasCurrentExpression ? "out" : "in");

    const commitExpression = () => {
      visibleExpressionAssetRef.current = loadedAsset;
      pendingExpressionAssetRef.current = null;
      setVisibleExpressionAsset(loadedAsset);
      setPendingExpressionAsset(null);
      setExpressionTransition("in");
      expressionTransitionTimerRef.current = window.setTimeout(() => {
        setExpressionTransition("stable");
        expressionTransitionTimerRef.current = 0;
      }, EXPRESSION_TRANSITION_IN_MS);
    };

    if (!hasCurrentExpression) {
      commitExpression();
      return;
    }

    expressionTransitionTimerRef.current = window.setTimeout(commitExpression, EXPRESSION_TRANSITION_OUT_MS);
  }, [setExpressionTransition, setPendingExpressionAsset, setVisibleExpressionAsset]);

  useEffect(() => {
    visibleExpressionAssetRef.current = visibleExpressionAsset;
    pendingExpressionAssetRef.current = pendingExpressionAsset;
  }, [pendingExpressionAsset, visibleExpressionAsset]);

  useEffect(() => {
    if (!shouldLoadSprite || typeof Image === "undefined") {
      return undefined;
    }

    let disposed = false;
    const nextExpressionDescriptor = {
      key: expressionVariantKey,
      kind: expressionVariant.kind,
      asset: expressionAsset,
      frameId: expressionVariant.frameId || null,
    };
    const requiredAssets = (isIdleSprite ? Object.values(SPRITE_FRAME_ASSETS) : [expressionAsset]).filter(Boolean);
    const allExpressionAssets = isIdleSprite ? [] : getSeferAbiExpressionPreloadAssets();
    const assetsToWarm = [...new Set([...requiredAssets, ...allExpressionAssets])];
    Promise.all(assetsToWarm.map((asset) => preloadSpriteAsset(asset))).then((results) => {
      if (disposed) return;
      const loaded = new Map(assetsToWarm.map((asset, index) => [asset, results[index]]));
      const requiredReady = requiredAssets.every((asset) => loaded.get(asset));
      setSpriteStatus({ key: spriteLoadKey, ready: requiredReady, failed: !requiredReady });
      if (!isIdleSprite && nextExpressionDescriptor.asset && requiredReady) {
        setExpressionTransition(visibleExpressionAssetRef.current ? "stable" : "loading");
        pendingExpressionAssetRef.current = nextExpressionDescriptor;
        setPendingExpressionAsset(nextExpressionDescriptor);
        if (nextExpressionDescriptor.kind === "frame") {
          window.setTimeout(() => handleExpressionLoad(nextExpressionDescriptor), 0);
        }
      }
    });

    return () => {
      disposed = true;
    };
  }, [expressionAsset, expressionKey, expressionVariantKey, expressionVariant.kind, expressionVariant.frameId, handleExpressionLoad, isIdleSprite, shouldLoadSprite, spriteLoadKey]);

  const spriteReady = spriteStatus.key === spriteLoadKey && spriteStatus.ready;
  const spriteFailed = spriteStatus.key === spriteLoadKey && spriteStatus.failed;

  useEffect(() => () => {
    if (expressionTransitionTimerRef.current) window.clearTimeout(expressionTransitionTimerRef.current);
  }, []);

  function handleExpressionError(failedAsset) {
    const failedKey = failedAsset?.key || failedAsset;
    pendingExpressionAssetRef.current = null;
    setPendingExpressionAsset((current) => (current?.key || current) === failedKey ? null : current);
    setExpressionTransition("stable");
    setSpriteStatus({ key: spriteLoadKey, ready: false, failed: true });
  }

  useEffect(() => {
    if (!shouldLoadSprite || !spriteReady || spriteFailed || typeof window === "undefined") {
      return undefined;
    }

    let disposed = false;
    let timeoutId = 0;
    const startedAt = performance.now();
    const tick = () => {
      if (disposed) return;
      const elapsedMs = performance.now() - startedAt;
      const frame = getSeferAbiSpriteFrame({ elapsedMs, state: normalizedState, reducedMotion });
      setSpriteFrame((current) => (current === frame.key ? current : frame.key));
      const nextBoundary = getSeferAbiSpriteFrameBoundary(elapsedMs);
      timeoutId = window.setTimeout(tick, Math.max(24, nextBoundary - elapsedMs));
    };

    tick();
    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedState, reducedMotion, shouldLoadSprite, spriteFailed, spriteReady]);

  useEffect(() => {
    if (!FACIAL_ANIMATION_VISUAL_APPROVED) return undefined;

    const canvas = canvasRef.current;
    if (!canvas || typeof Image === "undefined") return undefined;

    let disposed = false;
    imageRef.current = null;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      imageRef.current = image;
      setCanvasReady(true);
    };
    image.onerror = () => {
      if (!disposed) setCanvasReady(false);
    };
    image.src = premiumAvatarAsset;

    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
    };
  }, [dimension]);

  useEffect(() => {
    if (!FACIAL_ANIMATION_VISUAL_APPROVED) return undefined;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvasReady || !canvas || !image) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(dimension * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(dimension * devicePixelRatio));
    canvas.style.width = `${dimension}px`;
    canvas.style.height = `${dimension}px`;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    let animationFrameId = 0;
    const startedAt = performance.now();
    const render = (timestamp) => {
      const frame = getSeferAbiMotionFrame({
        state: normalizedState,
        elapsedMs: timestamp - startedAt,
        reducedMotion,
      });
      canvas.dataset.faceLid = frame.eyes.lid.toFixed(3);
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      drawSeferAbiAvatarFrame(context, image, {
        size: dimension,
        frame,
      });
      if (!reducedMotion) animationFrameId = requestAnimationFrame(render);
    };

    render(startedAt);
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasReady, dimension, normalizedState, reducedMotion]);

  const expressionVisible = shouldLoadSprite
    && !isIdleSprite
    && Boolean(visibleExpressionAsset || pendingExpressionAsset);
  const idleSpriteVisible = shouldLoadSprite && isIdleSprite && spriteReady && !spriteFailed;
  const spriteVisible = expressionVisible || idleSpriteVisible;
  const currentExpressionOpacity = expressionTransition === "out" ? 0 : 1;
  const pendingExpressionOpacity = expressionTransition === "in" ? 1 : 0;

  function renderExpressionLayer(descriptor, className, opacity, pending = false) {
    if (!descriptor) return null;
    const key = descriptor.key || descriptor.asset;
    if (descriptor.kind === "frame") {
      const backgroundPosition = getSeferAbiExpressionFrameBackgroundPosition(descriptor.frameId);
      return (
        <span
          key={key}
          className={`seferAbiAvatar__image seferAbiAvatar__expression seferAbiAvatar__expressionFrame ${className}`}
          data-frame-id={descriptor.frameId}
          aria-hidden="true"
          style={{
            ...backgroundPosition,
            backgroundImage: `url(${descriptor.asset})`,
            opacity,
          }}
        />
      );
    }
    return (
      <img
        key={key}
        className={`seferAbiAvatar__image seferAbiAvatar__expression ${className}`}
        src={descriptor.asset}
        alt=""
        draggable="false"
        style={{ opacity }}
        onLoad={pending ? () => handleExpressionLoad(descriptor) : undefined}
        onError={pending ? () => handleExpressionError(descriptor) : undefined}
      />
    );
  }

  return (
    <span
      className={`seferAbiAvatar seferAbiAvatar--${normalizedState}${frameless ? " seferAbiAvatar--frameless" : ""}${FACIAL_ANIMATION_VISUAL_APPROVED ? "" : " seferAbiAvatar--static-portrait"}`}
      data-mascot-persona="mature-human"
      data-sefer-abi-state={normalizedState}
      data-character-motion={normalizedState}
      data-facial-animation={FACIAL_ANIMATION_VISUAL_APPROVED ? "canvas" : "static"}
      data-sprite-animation={expressionVisible ? "expression" : spriteVisible ? "trial" : "static"}
      data-sprite-frame={expressionVisible ? expressionKey : spriteVisible ? spriteFrame : "open"}
      data-expression-transition={expressionVisible ? expressionTransition : "stable"}
      data-sprite-error={shouldLoadSprite && spriteFailed ? "true" : "false"}
      data-canvas-ready={canvasReady ? "true" : "false"}
      style={{ width: dimension, height: dimension }}
      aria-hidden={decorative ? "true" : undefined}
    >
      <img className="seferAbiAvatar__image seferAbiAvatar__fallback" src={premiumAvatarAsset} alt="" draggable="false" />
      {expressionVisible ? (
        <>
          {renderExpressionLayer(visibleExpressionAsset, "seferAbiAvatar__expression--current", currentExpressionOpacity)}
          {renderExpressionLayer(pendingExpressionAsset, "seferAbiAvatar__expression--pending", pendingExpressionOpacity, true)}
        </>
      ) : idleSpriteVisible ? (
        <img
          className="seferAbiAvatar__image seferAbiAvatar__sprite"
          src={SPRITE_FRAME_ASSETS[spriteFrame] || SPRITE_FRAME_ASSETS.open}
          alt=""
          draggable="false"
          onError={() => setSpriteStatus({ key: spriteLoadKey, ready: false, failed: true })}
        />
      ) : null}
      <canvas ref={canvasRef} className="seferAbiAvatar__canvas" aria-hidden="true" />
      <span className="seferAbiAvatar__stateMark" aria-hidden="true" />
    </span>
  );
}
