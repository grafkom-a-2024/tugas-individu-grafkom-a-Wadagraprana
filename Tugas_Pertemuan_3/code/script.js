"use strict";

function main() {
  // Get WebGL
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  // mencari temoat vertex data diletakkan.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var colorLocation = gl.getAttribLocation(program, "a_color");

  // mencari uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");
  var fudgeLocation = gl.getUniformLocation(program, "u_fudgeFactor");

  // Create position buffer
  var positionBuffer = gl.createBuffer();
  //bind
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // satukan geometry data ke buffer
  setGeometry(gl);

  // Create color buffer 
  var colorBuffer = gl.createBuffer();
  // Bind
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // satukan geometry data ke buffer
  setColors(gl);

  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var translation = [45, 150, 0];
  var rotation = [degToRad(40), degToRad(25), degToRad(325)];
  var scale = [1, 1, 1];
  var fudgeFactor = 1;

  drawScene();

  // Setup ui.
  webglLessonsUI.setupSlider("#fudgeFactor", {value: fudgeFactor, slide: updateFudgeFactor, max: 2, step: 0.001, precision: 3 });
  webglLessonsUI.setupSlider("#x", {value: translation[0], slide: updatePosition(0), max: gl.canvas.width });
  webglLessonsUI.setupSlider("#y", {value: translation[1], slide: updatePosition(1), max: gl.canvas.height});
  webglLessonsUI.setupSlider("#z", {value: translation[2], slide: updatePosition(2), max: gl.canvas.height, min: -gl.canvas.height});
  webglLessonsUI.setupSlider("#angleX", {value: radToDeg(rotation[0]), slide: updateRotation(0), max: 360});
  webglLessonsUI.setupSlider("#angleY", {value: radToDeg(rotation[1]), slide: updateRotation(1), max: 360});
  webglLessonsUI.setupSlider("#angleZ", {value: radToDeg(rotation[2]), slide: updateRotation(2), max: 360});
  webglLessonsUI.setupSlider("#scaleX", {value: scale[0], slide: updateScale(0), min: -5, max: 5, step: 0.01, precision: 2});
  webglLessonsUI.setupSlider("#scaleY", {value: scale[1], slide: updateScale(1), min: -5, max: 5, step: 0.01, precision: 2});
  webglLessonsUI.setupSlider("#scaleZ", {value: scale[2], slide: updateScale(2), min: -5, max: 5, step: 0.01, precision: 2});

  function updateFudgeFactor(event, ui) {
    fudgeFactor = ui.value;
    drawScene();
  }

  function updatePosition(index) {
    return function(event, ui) {
      translation[index] = ui.value;
      drawScene();
    };
  }

  function updateRotation(index) {
    return function(event, ui) {
      var angleInDegrees = ui.value;
      var angleInRadians = angleInDegrees * Math.PI / 180;
      rotation[index] = angleInRadians;
      drawScene();
    };
  }

  function updateScale(index) {
    return function(event, ui) {
      scale[index] = ui.value;
      drawScene();
    };
  }

  // Draw the scene.
  function drawScene() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Memberi tahu WebGL cara mengonversi dari ruang klip ke piksel
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear canvas dan depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Nyalakan pemusnahan (culling). Secara default, segitiga yang menghadap ke belakang
    // akan melakukan culled.
    gl.enable(gl.CULL_FACE);

    // Enable depth buffer
    gl.enable(gl.DEPTH_TEST);

    // use program (pair of shaders)
    gl.useProgram(program);

    // enable position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Memberitahu atribut posisi bagaimana mengambil data dari positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 komponen per iterasi
    var type = gl.FLOAT;   // datanya berupa float 32 bit
    var normalize = false; // jangan normalisasi data
    var stride = 0;        // 0 = maju sebesar size * sizeof(type) setiap iterasi untuk mendapatkan posisi berikutnya
    var offset = 0;        // mulai dari awal buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);

    // Aktifkan atribut warna
    gl.enableVertexAttribArray(colorLocation);

    // Bind buffer warna.
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    // Memberitahu atribut bagaimana mengambil data dari colorBuffer (ARRAY_BUFFER)
    var size = 3;                 // 3 komponen per iterasi
    var type = gl.UNSIGNED_BYTE;  // datanya berupa nilai 8 bit unsigned
    var normalize = true;         // normalisasi data (konversi dari 0-255 menjadi 0-1)
    var stride = 0;               // 0 = maju sebesar size * sizeof(type) setiap iterasi untuk mendapatkan posisi berikutnya
    var offset = 0;               // mulai dari awal buffer
    gl.vertexAttribPointer(
        colorLocation, size, type, normalize, stride, offset);

    // Compute matrix
    var matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 400);
    matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
    matrix = m4.xRotate(matrix, rotation[0]);
    matrix = m4.yRotate(matrix, rotation[1]);
    matrix = m4.zRotate(matrix, rotation[2]);
    matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);

    // Set matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Set fudgeFactor
    gl.uniform1f(fudgeLocation, fudgeFactor);

    // Draw geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 16 * 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

var m4 = {

  projection: function(width, height, depth) {
    // Note: Matriks ini membalik sumbu Y sehingga 0 berada di bagian atas.
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 2 / depth, 0,
      -1, 1, 0, 1,
    ];
  },

  multiply: function(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function(tx, ty, tz) {
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
    ];
  },

  xRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },

  yRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },

  zRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },

  translate: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  xRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },

  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },

};

// Mengisi buffer dengan nilai-nilai yang mendefinisikan kubus yang lebih besar
function setGeometry(gl) {
  var scale = 40.0;  // Menggandakan ukuran kubus
  
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      // Front face
      -1.0 * scale, -1.0 * scale,  1.0 * scale,
       1.0 * scale, -1.0 * scale,  1.0 * scale,
       1.0 * scale,  1.0 * scale,  1.0 * scale,
      -1.0 * scale, -1.0 * scale,  1.0 * scale,
       1.0 * scale,  1.0 * scale,  1.0 * scale,
      -1.0 * scale,  1.0 * scale,  1.0 * scale,

      // Back face
      -1.0 * scale, -1.0 * scale, -1.0 * scale,
      -1.0 * scale,  1.0 * scale, -1.0 * scale,
       1.0 * scale,  1.0 * scale, -1.0 * scale,
      -1.0 * scale, -1.0 * scale, -1.0 * scale,
       1.0 * scale,  1.0 * scale, -1.0 * scale,
       1.0 * scale, -1.0 * scale, -1.0 * scale,

      // Top face
      -1.0 * scale,  1.0 * scale, -1.0 * scale,
      -1.0 * scale,  1.0 * scale,  1.0 * scale,
       1.0 * scale,  1.0 * scale,  1.0 * scale,
      -1.0 * scale,  1.0 * scale, -1.0 * scale,
       1.0 * scale,  1.0 * scale,  1.0 * scale,
       1.0 * scale,  1.0 * scale, -1.0 * scale,

      // Bottom face
      -1.0 * scale, -1.0 * scale, -1.0 * scale,
       1.0 * scale, -1.0 * scale, -1.0 * scale,
       1.0 * scale, -1.0 * scale,  1.0 * scale,
      -1.0 * scale, -1.0 * scale, -1.0 * scale,
       1.0 * scale, -1.0 * scale,  1.0 * scale,
      -1.0 * scale, -1.0 * scale,  1.0 * scale,

      // Right face
       1.0 * scale, -1.0 * scale, -1.0 * scale,
       1.0 * scale,  1.0 * scale, -1.0 * scale,
       1.0 * scale,  1.0 * scale,  1.0 * scale,
       1.0 * scale, -1.0 * scale, -1.0 * scale,
       1.0 * scale,  1.0 * scale,  1.0 * scale,
       1.0 * scale, -1.0 * scale,  1.0 * scale,

      // Left face
      -1.0 * scale, -1.0 * scale, -1.0 * scale,
      -1.0 * scale, -1.0 * scale,  1.0 * scale,
      -1.0 * scale,  1.0 * scale,  1.0 * scale,
      -1.0 * scale, -1.0 * scale, -1.0 * scale,
      -1.0 * scale,  1.0 * scale,  1.0 * scale,
      -1.0 * scale,  1.0 * scale, -1.0 * scale,
    ]),
    gl.STATIC_DRAW);
}


// Mengisi buffer dengan warna-warna untuk setiap vertex kubus
function setColors(gl) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Uint8Array([
      // Front face (merah)
      255, 0, 0,
      255, 0, 0,
      255, 0, 0,
      255, 0, 0,
      255, 0, 0,
      255, 0, 0,

      // Back face (hijau)
      0, 255, 0,
      0, 255, 0,
      0, 255, 0,
      0, 255, 0,
      0, 255, 0,
      0, 255, 0,

      // Top face (biru)
      0, 0, 255,
      0, 0, 255,
      0, 0, 255,
      0, 0, 255,
      0, 0, 255,
      0, 0, 255,

      // Bottom face (kuning)
      255, 255, 0,
      255, 255, 0,
      255, 255, 0,
      255, 255, 0,
      255, 255, 0,
      255, 255, 0,

      // Right face (magenta)
      255, 0, 255,
      255, 0, 255,
      255, 0, 255,
      255, 0, 255,
      255, 0, 255,
      255, 0, 255,

      // Left face (cyan)
      0, 255, 255,
      0, 255, 255,
      0, 255, 255,
      0, 255, 255,
      0, 255, 255,
      0, 255, 255,
    ]),
    gl.STATIC_DRAW);
}

main();
