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

// 内部状態
var flag_init = false; // 初期化済みの場合はtrue
var flag_load = false; // 入力ファイル読み込み済みの場合はtrue
var flag_edit = false; // 入力ファイル編集済みの場合はtrue
var flag_rot = false; // ドラッグによる回転中の場合
var flag_render = false;

// 表示領域サイズ
var window_width;
var window_height;
var viewer_width;
var viewer_height;
var viewer_unit;
var viewer_zoom = 1.00;

// 三次元レンダラ関連
var renderer; // レンダラオブジェクト
var camera; // カメラ
var scene; // シーン
var object; // オブジェクト

var atom3d; // 原子(球)
var cell3d; // 格子セル(ワイヤーフレーム)
var select3d; // セレクタ

// オブジェクト回転用クオータニオン
var quaternion;

// トレース用オブジェクト
var raycaster = new THREE.Raycaster();

// エラー警告
var errmsg = [];

var nrepx = 10;
var nrepy = 10;
var nrepz = 10;

var bohr_angstrom = 0.529177210903;


// parameters.inpファイルの展開
function parse(parameters_inp, atom_xyz) {
    natom = 0;
    xmax = 1.0;
    ymax = 1.0;
    zmax = 1.0;

    atom_line = [];
    atom_coor = [];
    atom_type = [];

    [param, errlog_nml] = parseNamelist(parameters_inp);
    if (errlog_nml.length > 0) return;

    [atom, errlog_atom] = parseAtom(atom_xyz);
    if (errlog_atom.length > 0) return;

    errlog_chk_param = checkParam(param, atom);
    if (errlog_chk_param.length > 0) return;

    errlog_chk_atom = checkAtom(param, atom);
    if (errlog_chk_atom.length > 0) return;

    natom = parseInt(param.nml_inp_prm_kukan.natom.val);
    nxmax = parseInt(param.nml_inp_prm_kukan.nxmax.val);
    nymax = parseInt(param.nml_inp_prm_kukan.nymax.val);
    nzmaz = parseInt(param.nml_inp_prm_kukan.nzmax.val);
    xmax = ffloat(param.nml_inp_prm_kukan.xmax.val);
    ymax = ffloat(param.nml_inp_prm_kukan.ymax.val);
    zmax = ffloat(param.nml_inp_prm_kukan.zmax.val);

    for (var i = 0; i < natom; i++) {
        atom_line.push(atom[i].line);
        atom_coor.push(new THREE.Vector3(atom[i].x, atom[i].y, atom[i].z));
        atom_type.push(atom[i].k);
    }

    return 0;
}

function execute() {
    // エディタのセレクタ解除
    $('#atom_xyz div.selected').removeClass('selected');
    $("#error").hide();
    // テキストの読み込み
    errmsg = []
    parse($('#parameters_inp textarea').val(), $('#atom_xyz textarea').val());
    if (errmsg.length > 0) return;
    //parseAtomXYZ($('#atom_xyz textarea').val());
    if (errmsg.length > 0) return;
    generate_cif();
    plot_structure();
    generate_element_list();
    // ダウンロードを有効化
    $('#download').removeClass('disabled');

    resize();
}

cell3d_material = new THREE.LineBasicMaterial({
    color: 0x000000
});

function plot_structure() {
    vxmax = xmax;
    vymax = ymax;
    vzmax = zmax;

    scale = Math.max(vxmax, vymax, vzmax);

    // 古いオブジェクトの消去
    while (object.children.length > 0)
        object.remove(object.children[0]);

    // 格子（直方体）の作成
    var geometry = new THREE.BoxGeometry(2 * xmax / scale, 2 * ymax / scale, 2 * zmax / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, cell3d_material);
    cell3d = line;

    // 原子（球）の作成
    atom3d = new THREE.Group();
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
                        color: parseInt(tbl_color[atom_type[i]], 16)
                    });
                    var mesh = new THREE.Mesh(geometry, material);
                    mesh.position.x = x / scale;
                    mesh.position.y = y / scale;
                    mesh.position.z = z / scale;
                    mesh.atom_index = i;
                    atom3d.add(mesh);
                }
            }
        }
    }

    // 原子セレクタ（球）の追加
    var geometry = new THREE.SphereGeometry(1.00 / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, cell3d_material);
    select3d = line;
    select3d.visible = false;

    object.add(atom3d);
    object.add(cell3d);
    object.add(select3d);

    renderer.render(scene, camera);
}


function generate_element_list() {
    var zlist = [];
    $("#element_list").empty();
    for (i = 0; i < natom; i++) {
        t = atom_type[i];
        if (zlist.indexOf(t) < 0)
            zlist.push(t);
    }
    for (i = 0; i < zlist.length; i++) {
        c = tbl_color[zlist[i]];
        s = tbl_symbol[zlist[i]];
        $("#element_list").append("<span style='margin:4px; padding:16px;background-color:#" + c + ";'>"+s+"</span>");
    }

}












$('#viewer').click(function (e) {

    if (flag_rotate) return;

    var mouse = new THREE.Vector2(
        +(e.offsetX / $(this).width()) * 2 - 1,
        -(e.offsetY / $(this).height()) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(atom3d.children);

    if (intersects.length > 0) {
        $('#atom_xyz div.selected').removeClass('selected');

        var i = intersects[0].object.atom_index;
        var p = intersects[0].object.position;

        select3d.position.copy(p);
        select3d.visible = true;

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

var flag_rotate = false;

$('#viewer').mousemove(function (e) {
    if (e.buttons == 1 && flag_rotate) {
        x1 = e.clientX;
        y1 = e.clientY;

        q = new THREE.Quaternion();
        v1 = new THREE.Vector3(0, 0, 1);
        v2 = new THREE.Vector3((x1 - x0) / viewer_unit, (y1 - y0) / viewer_unit, 0.25);

        q.setFromUnitVectors(v1, v2.normalize());
        object.quaternion.copy(q.multiply(quaternion));
        renderer.render(scene, camera);
    }
});

$('#viewer').mousedown(function (e) {
    if (e.buttons == 1) {
        x0 = e.clientX;
        y0 = e.clientY;
        quaternion = new THREE.Quaternion();
        quaternion.copy(object.quaternion);
        flag_rotate = true;
    }
});

$('#viewer').mouseup(function (e) {
    flag_rotate = false;
});



function resize() {

    window_width = $(window).innerWidth();
    window_height = $(window).innerHeight();

    $(".fillscreen").each(function (i) {
        h = window_height;
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

    viewer_width = $("#viewer").innerWidth();
    viewer_height = $("#viewer").innerHeight();
    viewer_unit = Math.min(viewer_width, viewer_height);

    camera.top = - 2 * viewer_height / (viewer_unit * viewer_zoom);
    camera.left = - 2 * viewer_width / (viewer_unit * viewer_zoom);
    camera.right = + 2 * viewer_width / (viewer_unit * viewer_zoom);
    camera.bottom = + 2 * viewer_height / (viewer_unit * viewer_zoom);
    camera.updateProjectionMatrix();

    renderer.setSize(viewer_width, viewer_height);
    renderer.render(scene, camera);
}


function init() {
    // ３次元表示画面の初期化
    renderer = new THREE.WebGLRenderer({
        canvas: $('#viewer')[0]
    });
    renderer.setClearColor(0xffffff, 1.0);
    // カメラ作成
    camera = new THREE.OrthographicCamera(-2.0, +2.0, -2.0, +2.0);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);
    // シーン作成
    scene = new THREE.Scene();
    scene.add(camera);
    // オブジェクト作成
    object = new THREE.Group();
    scene.add(object)
    // ライト作成
    light1 = new THREE.DirectionalLight(0xFFFFFF, 0.40);
    light1.position.set(-2, -2, -2).normalize();
    light2 = new THREE.AmbientLight(0xFFFFFF, 0.60);
    scene.add(light1);
    scene.add(light2);
    // フォッグを有効化
    scene.fog = new THREE.Fog(0xFFFFFF, 0, 7);
    // エディタ画面作成
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
    // テンプレート挿入
    $("#parameters_inp textarea").text(template_parameters_inp);
    $("#atom_xyz textarea").text(template_atom_xyz);

    // リサイズ
    execute();
}

$(function () {
    init();
});

$(window).resize(function () {
    resize();
});


function generate_cif() {
    tmp = []
    tmp.push("# generated using wsviewer");
    tmp.push("# data_");
    tmp.push("_symmetry_space_group_name_H-M   'P 1'");
    tmp.push("_cell_length_a " + String(xmax * 2 * bohr_angstrom));
    tmp.push("_cell_length_b " + String(ymax * 2 * bohr_angstrom));
    tmp.push("_cell_length_c " + String(zmax * 2 * bohr_angstrom));
    tmp.push("_cell_angle_alpha 90.0");
    tmp.push("_cell_angle_beta  90.0");
    tmp.push("_cell_angle_gamma 90.0");
    tmp.push("loop_");
    tmp.push("_atom_site_type_symbol");
    tmp.push("_atom_site_fract_x");
    tmp.push("_atom_site_fract_y");
    tmp.push("_atom_site_fract_z");
    for (i = 0; i < natom; i++) {
        r = atom_coor[i];
        x = String(r.x / xmax * 0.5 + 0.5);
        y = String(r.y / ymax * 0.5 + 0.5);
        z = String(r.z / zmax * 0.5 + 0.5);
        t = tbl_symbol[atom_type[i]];
        tmp.push([t, x, y, z].join(" "));
    }

    var content = tmp.join("\n");
    var blob = new Blob([content], {
        "type": "text/plain"
    });
    if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, "test.cif");
        window.navigator.msSaveOrOpenBlob(blob, "test.cif");
    } else {
        document.getElementById("download").href = window.URL.createObjectURL(blob);
    }
}