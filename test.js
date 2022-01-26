console.log("Hello World");
canvas = document.getElementById("target");

cv = new CrystalViewer(canvas);
cv.vec_a1.x = 3.2162899971 / 0.529;
cv.vec_a1.y = 0.0000000000 / 0.529;
cv.vec_a1.z = 0.0000000000 / 0.529;
cv.vec_a2.x =-1.6081449986 / 0.529;
cv.vec_a2.y = 2.7853888434 / 0.529;
cv.vec_a2.z = 0.0000000000 / 0.529;
cv.vec_a3.x = 0.0000000000 / 0.529;
cv.vec_a3.y = 0.0000000000 / 0.529;
cv.vec_a3.z = 5.2399621010 / 0.529;


cv.ncell1 = 1;
cv.ncell2 = 1;
cv.ncell3 = 1;

cv.atom_data = [
    {t1:0.333333343, t2:0.666666687, t3:0.999119997, iz:31},
    {t1:0.666666687, t2:0.333333343, t3:0.499119997, iz:31},
    {t1:0.333333343, t2:0.666666687, t3:0.375880003, iz:7},
    {t1:0.666666687, t2:0.333333343, t3:0.875880003, iz:7},
]

// cv.atom_data = [
//     {t1: 0.0, t2: 0.0, t3: 0.0, iz: 14, tag: {line: 1}},
//     {t1: 0.5, t2: 0.5, t3: 0.0, iz: 14, tag: {line: 1}},
//     {t1: 0.0, t2: 0.5, t3: 0.5, iz: 14, tag: {line: 1}},
//     {t1: 0.5, t2: 0.0, t3: 0.5, iz: 14, tag: {line: 1}},
//     {t1: 0.25, t2: 0.25, t3: 0.25, iz: 14, tag: {line: 1}},
//     {t1: 0.75, t2: 0.75, t3: 0.25, iz: 14, tag: {line: 1}},
//     {t1: 0.25, t2: 0.75, t3: 0.75, iz: 14, tag: {line: 1}},
//     {t1: 0.75, t2: 0.25, t3: 0.75, iz: 14, tag: {line: 1}},
// ]


cv.plot();

function resize() {
    cv.redraw();
}
window.onresize = resize;

// canvas.onmousedown = function(e) {
//     tmpX = e.offsetX;
//     tmpY = e.offsetY;
//     cv.drag_start(e.offsetX, e.offsetY);
// }

// canvas.onmousemove = function(e) {
//     if (e.buttons > 0) {
//         cv.drag(e.offsetX, e.offsetY);
//     }
// }

// canvas.onmouseup = function(e) {
//     if (tmpX == e.offsetX && tmpY == e.offsetY) {
//         cv.select(tmpX, tmpY);
//     }
// }

