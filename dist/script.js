"use strict";
/* based on dominoes 23 */

window.addEventListener("load",function() {

  const MIN_NB_SQUARES = 50;
  const MAX_NB_SQUARES = 200;

  let canv, ctx;    // canvas and context

  let maxx, maxy;   // canvas dimensions
  let width;
  let nbx, nby;
  let squares;
  let offsx, offsy;

  let grid;
  let loops;
  let groups;

// for animation
  let events;

// shortcuts for Math.
  const mrandom = Math.random;
  const mfloor = Math.floor;
  const mround = Math.round;
  const mceil = Math.ceil;
  const mabs = Math.abs;
  const mmin = Math.min;
  const mmax = Math.max;

  const mPI = Math.PI;
  const mPIS2 = Math.PI / 2;
  const mPIS3 = Math.PI / 3;
  const m2PI = Math.PI * 2;
  const m2PIS3 = Math.PI * 2 / 3;
  const msin = Math.sin;
  const mcos = Math.cos;
  const matan2 = Math.atan2;

  const mhypot = Math.hypot;
  const msqrt = Math.sqrt;

  const rac3   = msqrt(3);
  const rac3s2 = rac3 / 2;

//------------------------------------------------------------------------

function alea (mini, maxi) {
// random number in given range

  if (typeof(maxi) == 'undefined') return mini * mrandom(); // range 0..mini

  return mini + mrandom() * (maxi - mini); // range mini..maxi
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function intAlea (mini, maxi) {
// random integer in given range (mini..maxi - 1 or 0..mini - 1)
//
  if (typeof(maxi) == 'undefined') return mfloor(mini * mrandom()); // range 0..mini - 1
  return mini + mfloor(mrandom() * (maxi - mini)); // range mini .. maxi - 1
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  function removeElement(array, element) {
    let idx = array.indexOf(element);
    if (idx == -1) throw ('Bug ! indexOf -1 in removeElement');
    array.splice(idx, 1);
  } // removeElement

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function randomElement(array) {
    return array[intAlea(0, array.length)];
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function arrayShuffle (array) {
/* randomly changes the order of items in an array
   only the order is modified, not the elements
   array given in input id modified - returned value == array
*/
  let k1, temp;
  for (let k = array.length - 1; k >= 1; --k) {
    k1 = intAlea(0, k + 1);
    temp = array[k];
    array[k] = array[k1];
    array[k1] = temp;
    } // for k
  return array
  } // arrayShuffle

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/* returns intermediate point between p0 and p1,
  alpha = 0 will return p0, alpha = 1 will return p1
  values of alpha outside [0,1] may be used to compute points outside the p0-p1 segment
*/
  function lerp2 (p0, p1, alpha) {

    return [(1 - alpha) * p0[0] + alpha * p1[0],
            (1 - alpha) * p0[1] + alpha * p1[1]];
  } // function lerp2

//------------------------------------------------------------------------

function Square (kx, ky) {
  this.kx = kx;
  this.ky = ky;
  this.getVertices();
} // Square

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Square.prototype.getVertices = function() {

  let x = this.kx * width + offsx;
  let y = this.ky * width + offsy;
  this.vertices = [];
  for (let k = 0; k < 4; ++k) {
    this.vertices.push([x + width * [0, 1, 1, 0][k],
                        y + width * [0, 0, 1, 1][k]]);
  } // for k
  
} // Square.prototype.getVertices
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Square.prototype.cross = function(sideIn, currentLoop) {

  let sideOut, neighbor;
  let returnValue;

  this.loop = currentLoop;
  this.sideIn = sideIn;

  let possib = [[1, 2, 3], [2, 3, 0], [3, 0, 1], [0, 1, 2]][sideIn];
  possib = arrayShuffle(possib); // try in random order

  for (let k = 0; k < possib.length; ++k) {
    neighbor = this.getNeighbor(possib[k]);
    if (neighbor === false) continue; // try to find actual neighbor
    if (typeof neighbor.square.loop == "undefined") {
      this.sideOut = possib[k];
      returnValue = neighbor; // found one !
      break;
    }
  }
  if (!returnValue) {
    // did not find a next square
    this.sideOut = possib[0]; // pick random end side
    returnValue =  false; // no neighbor
  }

  let rot = this.sideOut - this.sideIn;
  if (rot < 0) rot += 4; // rot can be 1 (turn left) 2 (straightforward) or 3 (turn right)
  this.rot = rot;
  return returnValue;
} // Square.prototype.cross

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

Square.prototype.getNeighbor = function(sideOut) {
/* returns false if no neighbor */
  let si;
  let kx = this.kx;
  let ky = this.ky;
  const dx = [0, 1, 0, -1][sideOut];
  const dy = [-1, 0, 1, 0][sideOut];
  kx += dx; ky += dy;
  if (kx < 0 || kx >= nbx || ky < 0 || ky >= nby) return false;
// neighbor does exist
  let neigh = grid[ky][kx];
  return {square: neigh, sideIn: sideOut ^ 2 };
} // Square.prototype.getNeighbor

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

Square.prototype.contour = function(lineWidth, color) {

  ctx.beginPath();
  ctx.moveTo (this.vertices[0][0], this.vertices[0][1])
  ctx.lineTo (this.vertices[1][0], this.vertices[1][1])
  ctx.lineTo (this.vertices[2][0], this.vertices[2][1])
  ctx.lineTo (this.vertices[3][0], this.vertices[3][1])
  ctx.closePath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
} // Square.prototype.contour

//------------------------------------------------------------------------

Square.prototype.drawArc = function(ctx) {

/* draws an arc in a Square */

  let center, angleInit, angleEnd, ccw;
  let pc = lerp2(this.vertices[this.sideOut], this.vertices[(this.sideOut + 1) % 4], 0.5);

  switch (this.rot) {
    case 1 :    // turn left
      center = this.vertices[(this.sideIn + 1) % 4];
      angleInit = (2 + this.sideIn) % 4;
      angleEnd = (1 + this.sideIn) % 4;
      ccw = true;
      break;
    case 2 :
      ctx.lineTo(pc[0], pc[1]);
      return;
    case 3 :
      center = this.vertices[this.sideIn];
      angleInit = this.sideIn;
      angleEnd = (1 + this.sideIn) % 4;
      ccw = false;
      break;
  } // switch (rot)

  ctx.arc(center[0], center[1], width / 2, angleInit * mPIS2, angleEnd * mPIS2, ccw);

} // Square.prototype.drawArc

//------------------------------------------------------------------------
function connectALoop(square, sideIn) {
/* given entry square must NOT already belong to a loop
*/
  let arc;
  const square0  = square;
  const sideIn0 = sideIn;

  let next;
  const loop = {arcs:[]}; // new loop is beginning
  do {
    loop.arcs.push(square);
    next = square.cross(sideIn, loop);
    if (next === false) break; // blocked
    square = next.square;
    sideIn = next.sideIn;
  } while (true)

// now, try to continue loop from start in opposite direction

  let neighbor = square0.getNeighbor(sideIn0);
  if (neighbor === false) return loop; // impossible
  if (typeof neighbor.square.loop !== "undefined") return loop; // already in a loop

  const loop2 = {arcs:[]}; // new loop is beginning
  square = neighbor.square;
  sideIn = neighbor.sideIn
  do {
    loop2.arcs.push(square);
    next = square.cross(sideIn, loop);
    if (next === false) break; // blocked
    square = next.square;
    sideIn = next.sideIn;
  } while (true)

// prepend elements of loop2 to the beginning of loop, in reverse order

  while (square = loop2.arcs.shift()) {
    // swap crossing direction
    [square.sideIn, square.sideOut] = [square.sideOut, square.sideIn];
    square.rot = 4 - square.rot; // exchanges values 1 <-> 3 (rotate left-right) 2 unchanged
    loop.arcs.unshift(square);
  }
  return loop;
} // connectALoop

//------------------------------------------------------------------------
function connectSquares() {

  loops = [];
  let nsquares = arrayShuffle(squares.slice()); // randomize order of squares

  nsquares.forEach( square => {
    if (square.loop) return; // already connected, continue
    const loop = connectALoop(square, intAlea(4));
    loops.push(loop); // record loop
// detect if closed loop
    const head = loop.arcs[0];
    const tail = loop.arcs[loop.arcs.length - 1];
    const afterTail = tail.getNeighbor(tail.sideOut);
    loop.closed = (afterTail.square === head && afterTail.sideIn === head.sideIn);
  });

} // connectSquares

//------------------------------------------------------------------------
function drawLoopPath (loop, ctx) {
  const sq0 = loop.arcs[0];
  const p0 = lerp2(sq0.vertices[sq0.sideIn], sq0.vertices[(sq0.sideIn + 1) % 4], 0.5);
  ctx.moveTo(p0[0], p0[1]);
  loop.arcs.forEach(sq => sq.drawArc(ctx));

} // drawLoop
//------------------------------------------------------------------------
function drawLoop (loop) {
  ctx.strokeStyle = `hsl(${intAlea(360)},100%,50%)`;
  ctx.lineWidth = 0.5 * width;
  ctx.beginPath();
  drawLoopPath(loop);
  ctx.stroke();
} // drawLoop

//------------------------------------------------------------------------

function drawLoops() {
  loops.forEach(loop => drawLoop(loop));
} // drawLoop

//------------------------------------------------------------------------
function drawGroupsPaths() {
/* calculates paths for each group, plus a few other parameters for graphic rendition */
  groups.forEach((group, k) => {
    group.path = new Path2D();
    group.loops.forEach(loop => drawLoopPath(loop, group.path));
    group.hues = [360 * k / groups.length];
    group.hues[1] = (group.hues[0] + intAlea(120, 180)) % 360;
    group.hues[2] = (group.hues[1] + intAlea(120, 180)) % 360;
    group.hues[3] = (group.hues[2] + intAlea(120, 180)) % 360;
  });
}
//------------------------------------------------------------------------
function drawGroups(beta) {

  let lwidth = 0.5 * width - 2;
  let lum, gamma;
  let khue;

  beta = beta - mfloor(beta);

  for (let alpha = 1; alpha > 0; alpha -= 3 / lwidth) {

    gamma = 2 * alpha - beta;
    khue = mmin(3,mmax(0, mfloor(gamma + 1.5)))
    gamma = (mabs(gamma - mfloor(gamma) - 0.5) - 0.25) * 4; // oscillates +/-1
    let lum = 50 + 25 * gamma;
    groups.forEach(group => {
      ctx.strokeStyle = `hsl(${group.hues[khue]},100%,${lum}%)`;
      ctx.lineWidth = alpha * lwidth;
      ctx.stroke(group.path);
    });
  } // for alpha
}

//------------------------------------------------------------------------
function oneMerge() {

  groups.sort((gra, grb) => gra.size - grb.size);

  for (let k = 0; k < groups.length; ++ k) {
    // pick group beginning by shortest
    let group = groups[k];

  // list possible connections
    let possibleConnections = [];
    group.loops.forEach(loop => {
      if (typeof loop.connectedStart == "undefined" ) {
        let neighbor = loop.arcs[0].getNeighbor(loop.arcs[0].sideIn);
        if (neighbor && neighbor.square.loop.group != group) {
          possibleConnections.push({loop: loop, ext: "start", neighbor: neighbor});
        }
      }
      if (typeof loop.connectedEnd == "undefined" ) {
        let neighbor = loop.arcs[loop.arcs.length - 1].getNeighbor(loop.arcs[loop.arcs.length - 1].sideOut);
        if (neighbor && neighbor.square.loop.group != group) {
          possibleConnections.push ({loop: loop, ext: "end", neighbor: neighbor});
        }
      }
    }); // group.forEach
    if (possibleConnections.length == 0) continue; // no connection, try other group
  // list shortest possible connection
    let shortest = [];
    let len = 9999;
    possibleConnections.forEach (connection => {
      if (connection.neighbor.square.loop.group.size < len) {
        len = connection.neighbor.square.loop.group.size;
        shortest = [connection];
      } else if (connection.neighbor.square.loop.group.size == len) {
        shortest.push(connection);
      }
    });
    if (shortest.length == 0) throw (`possibleConnections.length = ${possibleConnections.length}`);

    const connection = randomElement(shortest); // connection chosen ;
  // do the connection
    if (shortest.length == 0) throw (`2 - possibleConnections.length = ${possibleConnections.length}`);
    if (connection.ext == "start") {
      connection.loop.connectedStart = true;
    } else {
      connection.loop.connectedEnd = true;
    }
  // associate all loops of neighbor's group to present group
    let neighsgroup = connection.neighbor.square.loop.group;
    neighsgroup.loops.forEach(otherLoop => {
      otherLoop.group = group;
      group.loops.push(otherLoop); // add to group
    });
    group.size += connection.neighbor.square.loop.group.size;
    removeElement(groups,neighsgroup);
/* append segment to actually connect loop and neighbor
to do this, we shall create a new Square at the same place as neighbor, but with
a different connection. this new Square does not belong to the grid Array
*/
    let conn = new Square(connection.neighbor.square.kx, connection.neighbor.square.ky);
    if (connection.ext == "start") {
      conn.sideIn = connection.neighbor.square.sideIn; // could be sideOut...
      conn.sideOut = connection.neighbor.sideIn;
      connection.loop.arcs.unshift(conn); // inserted at beginning
    } else {
      conn.sideOut = connection.neighbor.square.sideIn; // could be sideOut...
      conn.sideIn = connection.neighbor.sideIn;
      connection.loop.arcs.push(conn); // inserted at end
    }
// update 'rot'
    conn.rot = conn.sideOut - conn.sideIn;
    if (conn.rot < 0) conn.rot += 4; // rot can be 1 (turn left) 2 (straightforward) or 3 (turn right)

    return true;
  } // for k
//  console.log(groups);
  return false;

} // oneMerge
//------------------------------------------------------------------------

function mergeLoops() {
  groups = loops.map(loop => ({loops: [loop], size: loop.arcs.length}));
// add a reference to group for every loop
  groups.forEach(group => group.loops[0].group = group);
  arrayShuffle(groups);

  let nbtries = 10;
  do {
    if (oneMerge()) nbtries = 10;
  } while(--nbtries && groups.length > 10);

} // mergeLoops

//------------------------------------------------------------------------

function createSquares() {

  grid = [];

  let choices, horiz;
  let square;

  squares = [];
  for (let ky = 0; ky < nby; ++ky) {
    grid[ky] = [];
    for (let kx = 0; kx < nbx; ++kx) {
      square = new Square(kx, ky);
      grid[ky][kx] = square;
      squares.push(square);
    } // for kx
  } // for ky

} // createSquares

//------------------------------------------------------------------------

let animate;

{ // scope for animate

let animState = 0;
let beta, prevIntBeta = 0;
animate = function(tStamp) {

  let event, tinit;

  event = events.pop();
  if (event && event.event == 'reset') animState = 0;
  if (event && event.event == 'click' && animState >= 10) animState = 0;
  window.requestAnimationFrame(animate)

  tinit = performance.now();

  switch (animState) {

    case 0:
      if (startOver()) {
        ++animState;
      }
      break;

    case 1:

      squares.forEach (square => {
//        square.contour(1,'#888');
      });

      ++animState;
      break;

    case 2:
      connectSquares();
      mergeLoops();
      drawGroupsPaths();
      ++animState;

    case 3:
      beta = tStamp / 1500;
      let intBeta = mfloor(beta); // for colors shift
      if (intBeta != prevIntBeta) {
        prevIntBeta = intBeta;
        // shift colors
        groups.forEach(group => {
          group.hues.pop();
          group.hues.unshift((group.hues[0] + intAlea(120, 180)) % 360);
        });
      }
      beta = beta - mfloor(beta);
      clearDisplay();
      drawGroups(beta);
  } // switch

} // animate
} // scope for animate

//------------------------------------------------------------------------
//------------------------------------------------------------------------

function startOver() {

// canvas dimensions

  maxx = window.innerWidth;
  maxy = window.innerHeight;

  canv.width = maxx;
  canv.height = maxy;
//  ctx.lineJoin = 'bevel';
  ctx.lineCap = 'round';

  clearDisplay();

  width = msqrt(maxx * maxy / alea(MIN_NB_SQUARES, MAX_NB_SQUARES));
  nbx = mceil(maxx / width);
  nby = mceil(maxy / width);

  nbx -= 2;
  nby -= 2;

  offsx = (maxx - nbx * width) / 2;
  offsy = (maxy - nby * width) / 2;

  if (nbx < 3 || nby < 3) return false;

  createSquares();

  return true;

} // startOver

//-----------------------------------------------------------------------------

function clearDisplay() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,maxx,maxy);
}

//------------------------------------------------------------------------

function mouseClick (event) {

  events.push({event:'reset'});

} // mouseClick
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// beginning of execution

  {
    canv = document.createElement('canvas');
    canv.style.position="absolute";
    document.body.appendChild(canv);
    ctx = canv.getContext('2d');
    canv.setAttribute ('title','click me');
  } // création CANVAS
  window.addEventListener('click',mouseClick); // just for initial position
  events = [{event:'reset'}];
  requestAnimationFrame (animate);

}); // window load listener