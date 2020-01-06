// rsview

// グローバル変数
var natom = 0;
var atom_type = [];
var atom_line = [];
var atom_coor = [];
var nperi = 0;
var ax = 0.0;
var ay = 0.0;
var ax = 0.0;


// parameters.inpファイルの展開
function parseParameterInp(code) {
    // グローバル変数の初期化
    natom = 0;
    xmax = 0;
    ymax = 0;
    zmax = 0;
    natom = 0;
    ax = 0.0;
    ay = 0.0;
    az = 0.0;
    // parameters.inpを一行ごとに読み込み
    line = code.split(/\r?\n/);
    for (var i = 0; i < line.length; i++) {
        // コメントを削除
        tmp = line[i].split(/!/)[0].trim();
        if (tmp == '') continue;
        if (tmp == '&nml_inp_prm_kukan') continue;
        if (tmp == '/') continue;
        // 代入文とマッチ
        result = tmp.match(/(\S+)\s*=\s*(\S+)/);
        if (result) {
            switch (result[1]) {
                case 'xmax':
                    xmax = parseFloat(result[2].replace(/dD/, 'e'));
                    break;
                case 'ymax':
                    ymax = parseFloat(result[2].replace(/dD/, 'e'));
                    break;
                case 'zmax':
                    zmax = parseFloat(result[2].replace(/dD/, 'e'));
                    break;
                case 'nperi':
                    nperi = parseInt(result[2]);
                    break;
                case 'natom':
                    natom = parseInt(result[2]);
                    break;
            }
            continue;
        }
        // いずれの文法にもマッチしないケース
        show_error_msg("Syntax error in parameter.inp:" + (i + 1) + ":", line[i]);
        return -1
    }

    if (!natom > 0) {
        show_error_msg('Error! parameter.inp', 'natom (>0) must required..');
        return -1;
    }
    if (!xmax > 0.0) {
        show_error_msg('Error! parameter.inp', 'xmax  (>0) must required.');
        return -1;
    }
    if (!ymax > 0.0) {
        show_error_msg('Error! parameter.inp', 'ymax  (>0) must required.');
        return -1;
    }
    if (!zmax > 0.0) {
        show_error_msg('Error! parameter.inp', 'zmax  (>0) must required.');
        return -1;
    }

    ax = xmax * 2;
    ay = ymax * 2;
    az = zmax * 2;

    return 0;
}

// 入力ファイルの展開
function parseAtomXYZ(code) {
    // グローバル変数の初期化
    atom_line = [];
    atom_coor = [];
    atom_type = [];

    // 一行ごとに読み込む
    line = code.split(/\r?\n/);
    for (var i = 0; i < line.length; i++) {
        // Bravais matrixまで来たら終了
        if (line[i].match(/Bravais matrix/)) break;
        // コメントを無視
        tmp = line[i].split(/!/)[0].trim()
        // 空行を無視
        if (tmp.length == 0) continue;
        // 空白で分割
        buf = tmp.split(/\s+/);
        if (buf.length < 4) {
            show_error_msg("Syntax error in line " + (i + 1) + ":", line[i]);
            return -1;
        } else { // tmp.length >= 4
            x = parseFloat(buf[0].replace(/d|D/, 'e'));
            y = parseFloat(buf[1].replace(/d|D/, 'e'));
            z = parseFloat(buf[2].replace(/d|D/, 'e'));
            t = parseInt(buf[3]);

            if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(t))
                show_error_msg("Invalid value in line " + (i + 1) + ":", line[i]);

            atom_coor.push(new THREE.Vector3(x, y, z));
            atom_line.push(i);
            atom_type.push(t);
        }
    }
    return 0;
}


// 周期性を考慮し、プッロット用原子座標のレプリカを作成する。
// 原子座標がプロット範囲を超過する場合は表示対象から除外する。
function calc_point(flg_pbc) {
    // 格納用変数の初期化
    var xs = [],
        ys = [],
        zs = [],
        ks = [];

    if (flg_pbc) {
        var nrx1 = -1;
        var nrx2 = 1;
        var nry1 = -1;
        var nry2 = 1;
        var nrz1 = -1;
        var nrz2 = 1;
        var bx1 = (nrx1 + 0.49) * ax;
        var by1 = (nry1 + 0.49) * ay;
        var bz1 = (nrz1 + 0.49) * az;
        var bx2 = (nrx2 - 0.49) * ax;
        var by2 = (nry2 - 0.49) * ay;
        var bz2 = (nrz2 - 0.49) * az;
    } else {
        var nrx1 = 0;
        var nrx2 = 0;
        var nry1 = 0;
        var nry2 = 0;
        var nrz1 = 0;
        var nrz2 = 0;
    }

    for (i = 0; i < natom; i++) {
        for (irx = nrx1; irx <= nrx2; irx++) {
            x = atom_coor[i].x + ax * irx
            if (flg_pbc && (x < bx1 || bx2 < x)) continue;

            for (iry = nry1; iry <= nry2; iry++) {
                y = atom_coor[i].y + ay * iry
                if (flg_pbc && (y < by1 || by2 < y)) continue;

                for (irz = nrz1; irz <= nrz2; irz++) {
                    z = atom_coor[i].z + az * irz
                    if (flg_pbc && (z < bz1 || bz2 < z)) continue;

                    // 座標を追加
                    ks.push(i);
                    xs.push(x);
                    ys.push(y);
                    zs.push(z);
                }
            }
        }
    }
    return [ks, xs, ys, zs];
}

function show_error_msg(title, msg) {
    $("#error_title").text(title);
    $("#error_msg").text(msg);
    $("#error").show();
}



function execute() {
    $("#error").hide();
    clear_viewer();

    // テキストの読み込み
    r = parseParameterInp($('#parameters').val());
    if (0 <= r) r = parseAtomXYZ($('#atom').val());
    if (0 <= r) plot_atom();
}

function clear_viewer() {
    while (atom_model.children.length > 0)
        atom_model.remove(atom_model.children[0]);
    while (lattice_model.children.length > 0)
        lattice_model.remove(lattice_model.children[0]);
}


lattice_material =  new THREE.LineBasicMaterial({ color: 0x000000 });

function plot_atom() {
    var ks, xs, ys, zs
    [ks, xs, ys, zs] = calc_point(nperi == 3);

    // バウンディングボックスの計算
    x_min = Math.min(...xs);
    x_max = Math.max(...xs);
    y_min = Math.min(...ys);
    y_max = Math.max(...ys);
    z_min = Math.min(...zs);
    z_max = Math.max(...zs);
    cx = (x_min + x_max) * 0.5;
    sx = (x_max - x_min);
    cy = (y_min + y_max) * 0.5;
    sy = (y_max - y_min);
    cz = (z_min + z_max) * 0.5;
    sz = (z_max - z_min);
    scale = Math.max(sx, sy, sz);

    for (var i = 0; i < xs.length; i++) {
        var geometry = new THREE.SphereGeometry(1.0 / scale);
        var material = new THREE.MeshLambertMaterial({
            color: colortable[atom_type[ks[i]]]
        });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = (xs[i] - cx) / scale;
        mesh.position.y = (ys[i] - cy) / scale;
        mesh.position.z = (zs[i] - cz) / scale;
        mesh.atom_index = ks[i];
        atom_model.add(mesh);
    }

    var v = []
    for (var i = 0; i <= 1; i++)
        for (var j = 0; j <= 1; j++)
            for (var k = 0; k <= 1; k++)
                v = v.concat((new THREE.Vector3(
                    ((i - 0.5) * ax - cx) / scale,
                    ((j - 0.5) * ay - cy) / scale,
                    ((k - 0.5) * az - cz) / scale
                )));



    var geometry = new THREE.BoxGeometry(ax / scale, ay / scale, az / scale);
    var edges = new THREE.EdgesGeometry( geometry );
    var line = new THREE.LineSegments(edges, lattice_material );
    line.position.x -= cx / scale;
    line.position.y -= cy / scale;
    line.position.z -= cz / scale;

    
    scene.add( line );




    renderer.render(scene, camera);
}


function initRender(width, height) {
    // ３次元表示画面の初期化
    // renderer = new THREE.WebGLRenderer({'canvas': $("#viewer")[0]});
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#viewer')
    });
    renderer.setClearColor(0xeeeeee, 1.0);
    camera = new THREE.OrthographicCamera(-1.0, +1.0, -1.0, +1.0);
    camera.position.set(-10, -10, 50);
    scene = new THREE.Scene();
    scene.add(camera);
    scene.background = 0xffffff;
    // Start the renderer.
    renderer.setSize(width, height);
    //
    light = new THREE.DirectionalLight(0xFFFFFF, 0.40);
    light.position.set(-1, -1, -1).normalize();
    scene.add(light);
    light = new THREE.AmbientLight(0xFFFFFF, 0.60);
    scene.add(light);
    renderer.render(scene, camera);
    atom_model = new THREE.Group();
    lattice_model = new THREE.Group();

    scene.add(lattice_model);
    scene.add(atom_model);


    // arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
    //scene.add( arrowHelper );

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    tick();

    // 毎フレーム時に実行されるループイベントです
    function tick() {
        // レンダリング
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }

}





template_atom_xyz = `! [x], [y], [z], [atom number]
-5.130000 -5.130000 -5.130000 14
+0.000000 +0.000000 -5.130000 14
+0.000000 -5.130000 +0.000000 14
-5.130000 +0.000000 +0.000000 14
-2.565000 -2.565000 -2.565000 14
+2.565000 +2.565000 -2.565000 14
+2.565000 -2.565000 +2.565000 14
-2.565000 +2.565000 +2.565000 14
`;

template_parameters_inp = `&nml_inp_prm_kukan
    xmax=5.13
    ymax=5.13
    zmax=5.13
    nperi=3
    natom=8
    nxmax=16
    nymax=16
    nzmax=16
    neigmx=32
/
`;




$("#parameters").text(template_parameters_inp);
$("#atom").text(template_atom_xyz);


initRender(400, 400);

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

$('#viewer').click(function(e){

   mouse.x = ( event.offsetX / 400 ) * 2 - 1;
    mouse.y = - ( event.offsetY / 400 ) * 2 + 1;
    

    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( atom_model.children );

    
    if(intersects.length > 0){
        var i = intersects[0].object.atom_index;
        var tmp = '';

        tmp += "Site: #" + (i+1) + "\n";
        tmp += "Element: " + (atom_type[i]) + "\n";
        tmp += "Line no: " + (atom_line[i] + 1) + " (atom.xyz)\n";

        $("#atom_info").text(tmp);
    }
});


$('#run').click(execute);


// var m0 = new THREE.Vector2();
// var cp0 = new THREE.Vector3();

// $('#viewer').mousemove(function(e){
//     if(e.button >= 0) {
//         sx = 
//     }
// });

// $('#viewer').mousedown(function(e){
//     m0.x = e.clientX;
//     m0.y = e.clientY;
//     cp0 = 
// });

