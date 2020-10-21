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

var nrepx = 10;
var nrepy = 10;
var nrepz = 10;

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
var lattice; // 格子セル(ワイヤーフレーム)
var selector; // セレクタ

// トレース用オブジェクト
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

}


lattice_material = new THREE.LineBasicMaterial({
    color: 0x000000
});

function plot_atom() {
    vxmax = xmax;
    vymax = ymax;
    vzmax = zmax;
    
    scale = Math.max(vxmax, vymax, vzmax);

    // 古いオブジェクトの消去
    while(object.children.length > 0)
        object.remove(object.children[0]);

    // 格子（直方体）の作成
    var geometry = new THREE.BoxGeometry(2 * xmax / scale, 2 * ymax / scale, 2 * zmax / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, lattice_material);
    lattice = line;

    // 原子（球）の作成
    atom_group = new THREE.Group();
    for (i = 0; i < natom; i++) {
        // 周期境界条件によるレプリカの配置
        for (ix = -nrepx; ix <= nrepx; ix++) {
            x = atom_coor[i].x + 2 * xmax * ix;
            if ((x < -vxmax) || (vxmax < x)) continue;

            for (iy = -nrepy; iy <= nrepy; iy++) {
                y = atom_coor[i].y + 2 * ymax * iy;
                if ((y < -vymax) || (vymax < y)) continue;

                for (iz = -nrepz; iz <= nrepz; iz++) {
                    z = atom_coor[i].z + 2 * zmax * iz;
                    if ((z < -vzmax) || (vzmax < z)) continue;

                    // 球のメッシュを作成 
                    var geometry = new THREE.SphereGeometry(1.0 / scale);
                    var material = new THREE.MeshLambertMaterial({
                        color: colortable[atom_type[i]]
                    });
                    var mesh = new THREE.Mesh(geometry, material);
                    mesh.position.x = x / scale;
                    mesh.position.y = y / scale;
                    mesh.position.z = z / scale;
                    mesh.atom_index = i;
                    atom_group.add(mesh);
                }
            }
        }
    }

    // 原子セレクタ（球）の追加
    var geometry = new THREE.SphereGeometry(1.00 / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, lattice_material);
    selector = line;
    selector.visible = false;

    object.add(atom_group);
    object.add(lattice);
    object.add(selector);

    renderer.render(scene, camera);
}


function initRender(width, height) {
    // ３次元表示画面の初期化
    // renderer = new THREE.WebGLRenderer({'canvas': $("#viewer")[0]});
    renderer = new THREE.WebGLRenderer({
        canvas: $('#viewer')[0]
    });
    renderer.setClearColor(0xffffff, 1.0);
    camera = new THREE.OrthographicCamera(-2.0, +2.0, -2.0, +2.0);
    camera.position.set(-2.0, -2.0, 2.0);
    camera.lookAt(0, 0, 0);


    scene = new THREE.Scene();
    scene.add(camera);

    object = new THREE.Group();
    scene.add(object)

    renderer.setSize(width, height);
    
    light1 = new THREE.DirectionalLight(0xFFFFFF, 0.40);
    light1.position.set(-2, -2, -2).normalize();
    scene.add(light1);
    light2 = new THREE.AmbientLight(0xFFFFFF, 0.60);
    scene.add(light2);
    renderer.render(scene, camera);

    
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

    // Remove selector
    selector.visible = false;


    var mouse = new THREE.Vector2(
        +(event.offsetX / $(this).width()) * 2 - 1,
        -(event.offsetY / $(this).height()) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(atom_group.children);

    if (intersects.length > 0) {
        $('#atom_xyz div.selected').removeClass('selected');

        var i = intersects[0].object.atom_index;
        var p = intersects[0].object.position;

        selector.position.copy(p);
        selector.visible = true;

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



function resize() {

    $(".fillscreen").each(function (i) {
        h = $(window).innerHeight();
        t = $(this).offset().top;
        $(this).outerHeight(h - t);
    });

    $(".fillbottom").each(function (i) {
        h = $(this).parent().innerHeight();
        t = $(this).position().top;
        $(this).outerHeight(h - t);
    });

    $("div.editor").each(function (i) {
        w = $(this).innerWidth();
        h = $(this).innerHeight();
        d = $(this).children("div");
        t = $(this).children("textarea");
        d.outerHeight(h);
        t.outerHeight(h);
        t.outerWidth(w - d.outerWidth());
    });




    width = $("#viewer").innerWidth();
    height = $("#viewer").innerHeight();
    scale = Math.min(width, height);
    camera.top = -height / scale * 2.0;
    camera.left = -width / scale * 2.0;
    camera.right = width / scale * 2.0;
    camera.bottom = height / scale * 2.0;
    camera.updateProjectionMatrix();

}


$(function () {

    $('div.editor').each(function (i, item) {
        div = $(item).children('div');
        textarea = $(item).children('textarea');
        for (var j = 1; j <= 1000; j++) {
            div.append("<div class='label'>" + j + "</div>");
        }
        textarea.scroll(function () {
            $(this).prev('div').scrollTop($(this).scrollTop());
        })
    });

    resize();
});


$(window).resize(function () {
    resize(); // Resize Objects
});