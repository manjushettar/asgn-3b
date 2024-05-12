var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  
  attribute vec2 a_UV;
  varying vec2 v_UV;

  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
     gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
     v_UV = a_UV;
    }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  varying vec2 v_UV;


  uniform int u_whichTexture;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  void main() {
     if(u_whichTexture == -2){
        gl_FragColor = u_FragColor;
     }
     else if(u_whichTexture == -1){
        gl_FragColor =  vec4(v_UV, 1.0, 1.0);
     }
     else if(u_whichTexture == 0){
        gl_FragColor = texture2D(u_Sampler0, v_UV);
     }
     else if(u_whichTexture == 1){
        gl_FragColor = texture2D(u_Sampler1, v_UV);
     }
     else if(u_whichTexture == 2){
        gl_FragColor = texture2D(u_Sampler2, v_UV);
     }
     else{
        gl_FragColor = vec4(1, .2, .2, 1);
     }
    }`


// globals
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let a_UV;
let u_size;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_whichTexture;
function setupWebGL() {
    canvas = document.getElementById('webgl');

    gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    gl.enable(gl.DEPTH_TEST);
}

function connectVariablestoGLSL(){
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        // ...
        console.log('Failed to initialize shaders.');
        return;
    }
    
    // Get the storage location of a_Position variable
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if(a_Position < 0){
        // ...
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if(a_UV < 0){
        console.log('Failed to get the storage location of a_UV');
        return;
    }
    // Get the storage location of u_FragColor variable
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if(!u_FragColor){
        // ...
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return;
    }

    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log('Failed to get the storage location of u_ViewMatrix');
        return;
    }

    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) {
        console.log('Failed to get the storage location of u_ProjectionMatrix');
        return;
    }

    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if(!u_Sampler0){
        console.log('Failed to get the storage location of u_Sampler0');
        return;
    }

    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    if(!u_Sampler1){
        console.log('Failed to get the storage location of u_Sampler1');
        return;
    }

    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    if(!u_Sampler2){
        console.log('Failed to get the storage location of u_Sampler2');
        return;
    }

    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if(!u_whichTexture){
        console.log('Failed to get the storage location of u_whichTexture');
        return;
    }

    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2; 
const STAR = 3;
const HEART = 4;

let g_selectedColor = [1.0,1.0,1.0,1.0];
let g_selectedSize = 5;
let g_segment = 10;
let g_selectedType = POINT;
let draw = false;

let g_globalAngle = 0;
let g_leftArmAngle = 10;
let g_rightArmAngle = -10;
let g_leftLegAngle = 160;
let g_rightLegAngle = -160;
let g_tailAngle = 100;
let g_leftEarAngle = 100;

let g_animation = false;
let g_poke = false;
let g_rotateX = 0;
let g_rotateY = 0;

function addActionsForHTMLUI(){
    
    document.getElementById('animOn').onclick = function() {g_animation=true};
    document.getElementById('animOff').onclick = function() {g_animation=false};

    document.getElementById('angle').addEventListener('mousemove', function(){g_globalAngle = this.value; renderScene();});
}

function initTextures(){
    var sky = new Image();
    if(!sky){
        console.log('Failed to create the image object');
        return false;
    }   

    sky.onload = function(){ sendSkyToGLSL(sky); };
    sky.src = 'sky.jpg';

    var grass = new Image();
    if(!grass){
        console.log('Failed to create the image object');
        return false;
    }

    grass.onload = function(){ sendGrassToGLSL(grass); };
    grass.src = 'grass.jpg';



    var wall = new Image();
    if(!wall){
        console.log('Failed to create the image object');
        return false;
    }

    wall.onload = function(){ sendWallToGLSL(wall); };
    wall.src = 'wall.jpg';

    return true;
}

function sendSkyToGLSL(image){

    var texture = gl.createTexture();
    if(!texture){
        console.log('Failed to create the texture object');
        return false;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.uniform1i(u_Sampler0, 0);
}

function sendGrassToGLSL(image){

    var texture = gl.createTexture();
    if(!texture){
        console.log('Failed to create the texture object');
        return false;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.uniform1i(u_Sampler1, 1);
}

function sendWallToGLSL(image){

    var texture = gl.createTexture();
    if(!texture){
        console.log('Failed to create the texture object');
        return false;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.uniform1i(u_Sampler2, 2);
}

var camera;

function main() {
    // ...
    // Initialize shaders
    setupWebGL() 
    
    connectVariablestoGLSL()

    addActionsForHTMLUI()
   // canvas.onmousedown = click;
   // canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev)}};

    camera = new Camera(100, canvas.width/canvas.height, 0.1, 1000);
    document.addEventListener('mousemove', camera.onMove.bind(camera));
    document.onkeydown = keydown;

    initTextures()
   

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.clear(gl.COLOR_BUFFER_BIT);
    // ...
    requestAnimationFrame(tick)
}

var g_shapesList = [];
var g_startAnim = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 - g_startAnim;
function tick(){
    g_seconds=performance.now()/1000.0-g_startAnim;

    updateAnimationAngles();
    //console.log("Animation done")
    renderScene();
    drawMap();
    //console.log("Render done")
    requestAnimationFrame(tick);
}

function updateAnimationAngles(){
    if(g_animation){
        g_leftLegAngle = -(20*Math.sin(g_seconds));
        g_rightLegAngle = 20*Math.sin(g_seconds);
    }
}

function keydown(ev){
    // w = 87, a = 65, s = 83, d = 68
    // q = 81, e = 69

    if(ev.keyCode == 87){
        camera.moveForward();
        camera.updateView();
    }
    else if(ev.keyCode == 83){
        camera.moveBackward();
        camera.updateView();
    }
    else if(ev.keyCode == 65){
        camera.moveLeft();
        camera.updateView();
    }
    else if(ev.keyCode == 68){
        camera.moveRight();
        camera.updateView();
    }
    else if(ev.keyCode == 81){
        camera.panLeft();
        camera.updateView();
    }
    else if(ev.keyCode == 69){
        camera.panRight();
        camera.updateView();
    }

    renderScene();
    console.log(ev.keyCode)
}


function click(ev) {
    let [x,y] = convertCoordinatesEventToGL(ev)

    let point;
    if(g_selectedType == POINT){
        point = new Point();
    }
    else if(g_selectedType == TRIANGLE){
        point = new Triangle();
    }
    else if(g_selectedType == CIRCLE){
        point = new Circle();
    }
    else if(g_selectedType == STAR){
        point = new Star();
    }
    else if(g_selectedType == HEART){
        point = new Heart();
    }
    point.position = [x, y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    g_shapesList.push(point)

}

function convertCoordinatesEventToGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

   return ([x,y])
}

var g_eye = [0, 0, 2];
var g_at = [0, 0, -100];
var g_up = [0, 1, 0];


var g_map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
];

function drawMap(){
    for(var i = 0; i < g_map.length; i++){
        for(var j = 0; j < g_map[i].length; j++){
            if(g_map[i][j] == 1){
                var cube = new Cube();
                cube.color = [0, 0, 1, 1];
                cube.textureNum = 2;
                cube.matrix.translate(i-4, -.75, j-2);
                cube.renderfast();
            }
        }
    }
}

function renderScene(){
    var startTime = performance.now()
    // Clear <canvas>

    //var projMat = new Matrix4();
    //projMat.setPerspective(60, canvas.width/canvas.height, 1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

    //var viewMat = new Matrix4();
    //viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2]);
    gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);

    var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //drawTriangle3D([-1.0, 0.0, 0.0,  -0.5, -1.0, 0.0,  0.0, 0.0, 0.0]);
    // (239, 207, 227);, 1
    var head = new Cube();
    head.color = [0.937,0.811,0.890,1.0];
    head.textureNum = -1;
    head.matrix.translate(-0.125,0.2,-0.05);
    head.matrix.scale(0.35,0.3,0.2);
    head.render();

    var sky = new Cube();
    sky.color = [0.5, 0.5, 0.5, 1]
    sky.textureNum = 0;
    sky.matrix.scale(50, 50, 50);
    sky.matrix.translate(-0.5, -0.5, -0.5);
    sky.render();

    var floor = new Cube();
    floor.color = [1.0, 0.0, 0.0, 1.0];
    floor.matrix.translate(0, -.75, 0);
    floor.matrix.scale(10, 0, 10);
    floor.matrix.translate(-0.5, 0, -0.5);
    floor.textureNum = 1;
    floor.render();

    var duration = performance.now() - startTime;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps " + Math.floor(1000/duration), "numdot");

}

function sendTextToHTML(text, htmlID){
    var htmlElm = document.getElementById(htmlID);
    if(!htmlElm){
      console.log("Failed to get " + htmlID + " from HTML");
      return;
    }
    htmlElm.innerHTML = text;
}

function drawCube(m, color){
    var rgba = color;

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);
    //front
    drawTriangle3D([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0]);
    drawTriangle3D([0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    //right
    drawTriangle3D([0,1,1,0,0,1,0,0,0]);
    drawTriangle3D([0,1,1,0,0,0,0,1,0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.85, rgba[1]*0.85, rgba[2]*0.85, rgba[3]);
    //back
    drawTriangle3D([0,1,1,1,1,1,1,0,1]);
    drawTriangle3D([0,1,1,1,0,1,0,0,1]);
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    //left
    drawTriangle3D([1,1,1,1,1,0,1,0,0]);
    drawTriangle3D([1,1,1,1,0,0,1,0,1]);
    gl.uniform4f(u_FragColor, rgba[0]*0.75, rgba[1]*0.75, rgba[2]*0.75, rgba[3]);
    //bottom
    drawTriangle3D([0,0,1,1,0,1,1,0,0]);
    drawTriangle3D([0,0,1,1,0,0,0,0,0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    //top
    drawTriangle3D([1,1,1,0,1,1,0,1,0]);
    drawTriangle3D([1,1,1,0,1,0,1,1,0]);
}

