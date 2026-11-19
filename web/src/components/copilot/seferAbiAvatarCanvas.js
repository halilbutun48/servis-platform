const SOURCE_SIZE = 512;
const SOURCE_CENTER = SOURCE_SIZE / 2;

const FACE_REGIONS = Object.freeze({
  leftEye: { x: 175, y: 181, width: 67, height: 53 },
  rightEye: { x: 271, y: 181, width: 67, height: 53 },
  leftBrow: { x: 168, y: 149, width: 78, height: 38 },
  rightBrow: { x: 270, y: 149, width: 78, height: 38 },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const drawSkinPatch = (context, image, region) => {
  const patchY = region.y + region.height + 6;
  context.drawImage(
    image,
    region.x,
    patchY,
    region.width,
    region.height,
    region.x,
    region.y,
    region.width,
    region.height,
  );
};

const drawEyeLayer = (context, image, region, gazeX, gazeY, lid) => {
  const shiftX = clamp(gazeX, -1, 1) * 1.8;
  const shiftY = clamp(gazeY, -1, 1) * 1.2;
  const eyeIsMoving = Math.abs(shiftX) > 0.04 || Math.abs(shiftY) > 0.04;
  const eyeIsClosing = lid > 0.02;

  if (eyeIsMoving || eyeIsClosing) drawSkinPatch(context, image, region);

  if (!eyeIsClosing) {
    if (eyeIsMoving) {
      context.drawImage(
        image,
        region.x,
        region.y,
        region.width,
        region.height,
        region.x + shiftX,
        region.y + shiftY,
        region.width,
        region.height,
      );
    }
    return;
  }

  const centerY = region.y + region.height * 0.58;
  context.save();
  context.globalAlpha = 0.72 + clamp(lid, 0, 1) * 0.28;
  context.strokeStyle = "rgba(76, 35, 26, .82)";
  context.lineWidth = 2.1;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(region.x + 8, centerY);
  context.quadraticCurveTo(region.x + region.width / 2, centerY + 1.2, region.x + region.width - 8, centerY - 0.2);
  context.stroke();
  context.restore();
};

const drawBrowLayer = (context, image, region, lift, tilt) => {
  const shiftY = clamp(lift, -1, 1) * -1.5;
  const shiftX = clamp(tilt, -1, 1) * 1.2;
  if (Math.abs(shiftY) <= 0.02 && Math.abs(shiftX) <= 0.02) return;

  drawSkinPatch(context, image, region);
  context.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    region.x + shiftX,
    region.y + shiftY,
    region.width,
    region.height,
  );
};

const drawMouthLayer = (context, frame) => {
  const open = clamp(frame.mouth.open, 0, 1);
  const smile = clamp(frame.mouth.smile, -1, 1);
  if (open <= 0.01 && Math.abs(smile) <= 0.01) return;

  const mouthCenterX = 257;
  const mouthCenterY = 286;
  context.save();
  if (open > 0.01) {
    context.fillStyle = `rgba(58, 21, 25, ${0.2 + open * 0.38})`;
    context.beginPath();
    context.ellipse(mouthCenterX, mouthCenterY + open * 1.5, 19 + open * 4, 2.3 + open * 4, 0, 0, Math.PI * 2);
    context.fill();
  }
  if (Math.abs(smile) > 0.01) {
    context.strokeStyle = smile > 0 ? "rgba(75, 28, 22, .66)" : "rgba(75, 28, 22, .42)";
    context.lineWidth = 1.3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(mouthCenterX - 20, mouthCenterY);
    context.quadraticCurveTo(mouthCenterX, mouthCenterY + smile * 3.2, mouthCenterX + 20, mouthCenterY);
    context.stroke();
  }
  context.restore();
};

const drawPortraitWithFrame = (context, image, size, frame) => {
  const pixelScale = size / SOURCE_SIZE;
  context.save();
  context.scale(pixelScale * 1.06, pixelScale * 1.06);
  context.translate(SOURCE_CENTER + frame.head.x, SOURCE_CENTER + frame.head.y);
  context.rotate((frame.head.rotate * Math.PI) / 180);
  context.scale(frame.head.scale, frame.head.scale);
  context.translate(-SOURCE_CENTER, -SOURCE_CENTER);
  context.drawImage(image, 0, 0, SOURCE_SIZE, SOURCE_SIZE);

  drawEyeLayer(context, image, FACE_REGIONS.leftEye, frame.eyes.gazeX, frame.eyes.gazeY, frame.eyes.lid);
  drawEyeLayer(context, image, FACE_REGIONS.rightEye, frame.eyes.gazeX, frame.eyes.gazeY, frame.eyes.lid);
  drawBrowLayer(context, image, FACE_REGIONS.leftBrow, frame.brows.lift, frame.brows.tilt);
  drawBrowLayer(context, image, FACE_REGIONS.rightBrow, frame.brows.lift, -frame.brows.tilt);
  drawMouthLayer(context, frame);
  context.restore();
};

export function drawSeferAbiAvatarFrame(context, image, { size, frame }) {
  if (!context || !image || !frame || !Number.isFinite(size) || size <= 0) return;
  context.clearRect(0, 0, size, size);
  drawPortraitWithFrame(context, image, size, frame);
}
