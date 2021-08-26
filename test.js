console.log("Hello World");
canvas = document.getElementById("target");

plotter = new AtomPlot(canvas);
plotter.vec_a1.x = 10.26;
plotter.vec_a2.y = 10.26;
plotter.vec_a3.z = 10.26;
plotter.n1 = 3;
plotter.n2 = 3;
plotter.n3 = 3;

plotter.atom_data = [
    {t1: 0.0, t2: 0.0, t3: 0.0, iz: 14, tag: {line: 1}},
    {t1: 0.5, t2: 0.5, t3: 0.0, iz: 14, tag: {line: 1}},
    {t1: 0.0, t2: 0.5, t3: 0.5, iz: 14, tag: {line: 1}},
    {t1: 0.5, t2: 0.0, t3: 0.5, iz: 14, tag: {line: 1}},
    {t1: 0.25, t2: 0.25, t3: 0.25, iz: 14, tag: {line: 1}},
    {t1: 0.75, t2: 0.75, t3: 0.25, iz: 14, tag: {line: 1}},
    {t1: 0.25, t2: 0.75, t3: 0.75, iz: 14, tag: {line: 1}},
    {t1: 0.75, t2: 0.25, t3: 0.75, iz: 14, tag: {line: 1}},
]


plotter.plot();

function resize() {
    plotter.redraw();
}
window.onresize = resize;

canvas.onmousedown = function(e) {
    plotter.drag_start(e.clientX, e.clientY);
}

canvas.onmousemove = function(e) {
    if (e.buttons > 0) {
        plotter.drag(e.clientX, e.clientY);
    }
}

canvas.onmouseup = function(e) {
    plotter.drag_end();
}
