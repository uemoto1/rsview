// Web RSPACE Viewer
//  Mitsuharu UEMOTO @ Kobe University
//  Copyright(c) 2019 All rights reserved.

// グローバル変数
var natom = 0; // 全原子数
var atom_type = []; // 元素種
var atom_line = []; // 行番号(atom.xyz)
var atom_coor = []; // 原子座標
var nperi = 0; // 周期境界条件フラグ
var xmax = 0; // xmax
var ymax = 0; // ymax
var zmax = 0; // zmax
var ax = 0.0; // 格子定数(ax)
var ay = 0.0; // 格子定数(ay)
var ax = 0.0; // 格子定数(az)

// 内部状態
var flag_init = false; // 初期化済みの場合はtrue
var flag_load = false; // 入力ファイル読み込み済みの場合はtrue
var flag_edit = false; // 入力ファイル編集済みの場合はtrue

// 三次元レンダラ関連
var renderer; // レンダラオブジェクト init_rendererで初期化
var camera; // カメラ
var scene; // シーン
var object; // オブジェクト
var atom_group; // 原子(球)
var lat_group; // 格子セル(ワイヤーフレーム)

var raycaster = new THREE.Raycaster();


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
    while (atom_group.children.length > 0)
        atom_group.remove(atom_group.children[0]);
    while (lat_group.children.length > 0)
        lat_group.remove(lat_group.children[0]);
}


lattice_material = new THREE.LineBasicMaterial({
    color: 0x000000
});

function plot_atom() {
    var ks, xs, ys, zs;
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
        atom_group.add(mesh);
    }

    var geometry = new THREE.BoxGeometry(ax / scale, ay / scale, az / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, lattice_material);
    line.position.x -= cx / scale;
    line.position.y -= cy / scale;
    line.position.z -= cz / scale;
    lat_group.add(line);

    

    var geometry = new THREE.SphereGeometry(1.00 / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, lattice_material);
    selector_obj = line;
    selector_obj.visible = false;
    lat_group.add(selector_obj);




    renderer.render(scene, camera);
}


function initRender(width, height) {
    // ３次元表示画面の初期化
    // renderer = new THREE.WebGLRenderer({'canvas': $("#viewer")[0]});
    renderer = new THREE.WebGLRenderer({
        canvas: $('#viewer')[0]
    });
    renderer.setClearColor(0xffffff, 1.0);
    camera = new THREE.OrthographicCamera(-1.0, +1.0, -1.0, +1.0);
    camera.position.set(-0.1, -0.1, 1);
    camera.lookAt(0, 0, 0);


    scene = new THREE.Scene();
    scene.add(camera);

    // Start the renderer.
    renderer.setSize(width, height);
    //
    light = new THREE.DirectionalLight(0xFFFFFF, 0.40);
    light.position.set(-1, -1, -1).normalize();
    scene.add(light);
    light = new THREE.AmbientLight(0xFFFFFF, 0.60);
    scene.add(light);
    renderer.render(scene, camera);
    atom_group = new THREE.Group();
    lat_group = new THREE.Group();


    scene.add(lat_group);
    scene.add(atom_group);


}





template_atom_xyz = `! [x], [y], [z], [atom number], switch [x], [y], [z], [weight], switches [soc], [pp], [na]
-5.130 -5.130 -5.130 14 1 1 1 51408.00 11 1 1a
+0.000 +0.000 -5.130 14 1 1 1 51408.00 11 1 2a
+0.000 -5.130 +0.000 14 1 1 1 51408.00 11 1 3a
-5.130 +0.000 +0.000 14 1 1 1 51408.00 11 1 4a
-2.565 -2.565 -2.565 14 1 1 1 51408.00 11 1 5a
+2.565 +2.565 -2.565 14 1 1 1 51408.00 11 1 6a
+2.565 -2.565 +2.565 14 1 1 1 51408.00 11 1 7a
-2.565 +2.565 +2.565 14 1 1 1 51408.00 11 1 8a
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




$('#viewer').click(function (e) {

    var mouse = new THREE.Vector2(
        +(event.offsetX / $(this).width()) * 2 - 1,
        -(event.offsetY / $(this).height()) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(atom_group.children);

    if (intersects.length > 0) {
        // Remove selector
        selector_obj.visible = false;
        $('#atom_xyz div.selected').removeClass('selected');

        var i = intersects[0].object.atom_index;
        var p = intersects[0].object.position;

        selector_obj.position.copy(p);
        selector_obj.visible = true;

        label = $('#atom_xyz div.label');
        $(label[atom_line[i]]).addClass('selected');
        $('#atom_xyz textarea').scrollTop(
            $('#atom_xyz div.selected').offsetTop - $('#atom_xyz textarea')[0].offsetTop
        );

        $("#atom_info").text(
            "Element:" + atom_type[i] + ', Line:' + (atom_line[i] + 1)
        );


    }

    renderer.render(scene, camera);
});


$('#run').click(execute);


// var m0 = new THREE.Vector2();
// var cp0 = new THREE.Vector3();

var rot_state = false;

$('#viewer').mousemove(function (e) {
    if (e.buttons == 1 && rot_state) {
        ep.y = -(e.clientX - x0) / 400 * Math.PI;
        ep.x = +(e.clientY - y0) / 400 * Math.PI;
        camera.position.copy(p0);
        camera.position.applyEuler(ep);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);
        renderer.render(scene, camera);
    }
});

$('#viewer').mousedown(function (e) {
    if (e.buttons == 1) {
        x0 = e.clientX;
        y0 = e.clientY;
        p0 = camera.position.clone();
        ep = new THREE.Euler(0, 0, 0);
        rot_state = true;
    }
});




function init_editor() {
    $('div.editor').each(function (i, item) {
        div = $(item).children('div');
        textarea = $(item).children('textarea');
        for (var j = 1; j <= 1000; j++) {
            div.append("<div class='label'>" + j + "</div>");
        }
        div.outerHeight(textarea.outerHeight());

        textarea.scroll(function () {
            $(this).prev('div').scrollTop($(this).scrollTop());
        })
    });
    resize_editor();
}

function resize_editor() {
    $('div.editor').each(function (i, item) {
        div = $(item).children('div');
        textarea = $(item).children('textarea');
        textarea.outerWidth(
            $(item).innerWidth() - div.outerWidth()
        );
    });
}




$(window).resize(function () {
    resize_editor();
})

init_editor()