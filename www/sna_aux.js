// main container where the rendering takes place
var canvas;

// important three.js globals
// wee need two cameras - one for each eye
var camera, scene, renderer;
var cameraLeft, cameraRight;

// TODO: find out where these values come from

var winRenderWidth = 640; // window.innerWidth;
var winRenderHeight = winRenderWidth * (1080/1920); // window.innerHeight;

var renderWidth = winRenderWidth;
var renderHeight = winRenderHeight;

// status output
var statusHeadline = document.querySelector("#info h1");
var leftTranslationOutput = document.getElementById("leftTranslation");
var rightTranslationOutput = document.getElementById("rightTranslation");
var orientationOutput = document.getElementById("orientation");
var positionOutput = document.getElementById("position");
var angularVelocityOutput = document.getElementById("angularVelocity");
var linearVelocityOutput = document.getElementById("linearVelocity");
var angularAccelerationOutput = document.getElementById("angularAcceleration");
var linearAccelerationOutput = document.getElementById("linearAcceleration");

// globals related to VR devices
var vrHMD = null, vrPosDev = null, vrEnabled = false;
var focus;



function FovToNDCScaleOffset(fov)
{
  var pxscale = 2.0 / (fov.leftTan + fov.rightTan);
  var pxoffset = (fov.leftTan - fov.rightTan) * pxscale * 0.5;
  var pyscale = 2.0 / (fov.upTan + fov.downTan);
  var pyoffset = (fov.upTan - fov.downTan) * pyscale * 0.5;

  return { scale: [pxscale, pyscale], offset: [pxoffset, pyoffset] };
}

function FovPortToProjection(fov, rightHanded /* = true */, zNear /* = 0.01 */, zFar /* = 10000.0 */)
{
  rightHanded = rightHanded === undefined ? true : rightHanded;
  zNear = zNear === undefined ? 0.01 : zNear;
  zFar = zFar === undefined ? 10000.0 : zFar;

  var handednessScale = rightHanded ? -1.0 : 1.0;

  // start with an identity matrix
  var mobj = new THREE.Matrix4();
  var m = mobj.elements;

  // and with scale/offset info for normalized device coords
  var scaleAndOffset = FovToNDCScaleOffset(fov);

  // X result, map clip edges to [-w,+w]
  m[0*4+0] = scaleAndOffset.scale[0];
  m[0*4+1] = 0.0;
  m[0*4+2] = scaleAndOffset.offset[0] * handednessScale;
  m[0*4+3] = 0.0;

  // Y result, map clip edges to [-w,+w]
  // Y offset is negated because this proj matrix transforms from world coords with Y=up,
  // but the NDC scaling has Y=down (thanks D3D?)
  m[1*4+0] = 0.0;
  m[1*4+1] = scaleAndOffset.scale[1];
  m[1*4+2] = -scaleAndOffset.offset[1] * handednessScale;
  m[1*4+3] = 0.0;

  // Z result (up to the app)
  m[2*4+0] = 0.0;
  m[2*4+1] = 0.0;
  m[2*4+2] = zFar / (zNear - zFar) * -handednessScale;
  m[2*4+3] = (zFar * zNear) / (zNear - zFar);

  // W result (= Z in)
  m[3*4+0] = 0.0;
  m[3*4+1] = 0.0;
  m[3*4+2] = handednessScale;
  m[3*4+3] = 0.0;

  mobj.transpose();

  return mobj;
}

function FovToProjection(fov, rightHanded /* = true */, zNear /* = 0.01 */, zFar /* = 10000.0 */)
{
  var fovPort = { upTan: Math.tan(fov.upDegrees * Math.PI / 180.0),
                  downTan: Math.tan(fov.downDegrees * Math.PI / 180.0),
                  leftTan: Math.tan(fov.leftDegrees * Math.PI / 180.0),
                  rightTan: Math.tan(fov.rightDegrees * Math.PI / 180.0) };
  return FovPortToProjection(fovPort, rightHanded, zNear, zFar);
}


/*
 * Entry point when DOM has finished loading.
 * Init scene, add event listeners and search for VR devices.
 */


function start() {
  document.addEventListener("mozfullscreenchange", onFullscreenChanged, false);
  document.addEventListener("webkitfullscreenchange", onFullscreenChanged, false);
  initScene();

  if (navigator.getVRDevices) {
    // chromium or similar
    navigator.getVRDevices().then(vrDeviceCallback);
  } else if (navigator.mozGetVRDevices) {
    // firefox
    navigator.mozGetVRDevices(vrDeviceCallback);
  } else {
    // no vr support
    statusHeadline.innerHTML = "No support for webVR";
    setRenderSize(renderWidth, renderHeight, false);
    animate();
  }
}


function vrDeviceCallback(vrdevs) {
  console.log(vrdevs.length, " VR Devices");

  // First, find a HMD -- just use the first one we find
  for (var i = 0; i < vrdevs.length; ++i) {
    if (vrdevs[i] instanceof HMDVRDevice) {
      vrHMD = vrdevs[i];
      break;
    }
  }

  if (!vrHMD) {
   statusHeadline.innerHTML = "No VR device detected!";
   return;
  }

  // Then, find that HMD's position sensor
  for (var i = 0; i < vrdevs.length; ++i) {
    if (vrdevs[i] instanceof PositionSensorVRDevice &&
        vrdevs[i].hardwareUnitId == vrHMD.hardwareUnitId)
    {
      vrPosDev = vrdevs[i];
      break;
    }
  }

  if (!vrPosDev) {
    alert("Found a HMD, but didn't find its orientation sensor?");
  }

  statusHeadline.innerHTML = "VR device detected: " + vrHMD.deviceName;

  // kick off rendering
  setRenderSize(renderWidth, renderHeight, false);
  animate();
}

/*
 * Call this to toggle fullscreen mode.
 * Will warn when there is no vr device available.
 */
function toggleFullscreen() {
  if (!vrHMD) {
    alert("no HMD found");
    return;
  }

  if (canvas.webkitRequestFullscreen) {
    // chromium
    canvas.webkitRequestFullscreen({ vrDisplay: vrHMD });
  } else if (canvas.mozRequestFullScreen) {
    // firefox
    canvas.mozRequestFullScreen({ vrDisplay: vrHMD });
  }
}

/*
 * User toggled fullscreen - switch from normal to
 * vr mode or back.
 */
function onFullscreenChanged() {
  if (document.mozFullScreenElement || document.webkitFullscreenElement) {
    renderWidth = (window.innerWidth / 2);
    renderHeight = (window.innerHeight);
    vrEnabled = true;
  } else {
    renderWidth = winRenderWidth;
    renderHeight = winRenderHeight;
    vrEnabled = false;
  }

  setRenderSize(renderWidth, renderHeight, vrEnabled);
}

function numObjectToString(obj) {
  var str = "";
  var num;
  for (attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      num = obj[attr].toFixed(5);
      if (num[0] != "-") num = "+" + num;
      str += attr + ": " + num + "  ";
    }
  }
  return str;
}

/*
 *  Called when the size of the container changed, e.g. when
 *  user toggled fullscreen mode.
 */
function setRenderSize(width, height, vrEnabled) {
  if (vrHMD) {
    cameraLeft.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("left"));
    cameraRight.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("right"));

    var leftTx = vrHMD.getEyeTranslation("left");
    var rightTx = vrHMD.getEyeTranslation("right");

    leftTranslationOutput.innerHTML = numObjectToString(leftTx);
    rightTranslationOutput.innerHTML = numObjectToString(rightTx);

    cameraLeft.position.add(new THREE.Vector3(leftTx.x, leftTx.y, leftTx.z));
    cameraRight.position.add(new THREE.Vector3(rightTx.x, rightTx.y, rightTx.z));

    renderer.setSize(width * 2, height, true, 2);
    canvas.style.width = (width * 2) + "px";
    canvas.style.height = height + "px";
  } else {
    camera.aspect = renderWidth / renderHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  renderWidth = width;
  renderHeight = height;
}

