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
var flag_change = true; // テキストボックスの内容が変更された場合

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
var axis; // 座標軸オブジェクト

var atom3d; // 原子(球)
var cell3d; // 格子セル(ワイヤーフレーム)
var select3d; // セレクタ

// オブジェクト回転用クオータニオン
var quaternion = new THREE.Quaternion(0.9840098829174856, 0.009242544937229168, 0.1509512203796048, 0.09408961021125717);

// トレース用オブジェクト
var raycaster = new THREE.Raycaster();

// エラー警告
var errmsg = [];

var nrepx = 10;
var nrepy = 10;
var nrepz = 10;

var bohr_angstrom = 0.529177210903;

function showErrorMsg(name, errlog) {


}

// parameters.inpファイルの展開
function parse(parameters_inp, atom_xyz) {
    natom = 0;
    xmax = 1.0;
    ymax = 1.0;
    zmax = 1.0;

    atom_line = [];
    atom_coor = [];
    atom_type = [];

    errmsg = [];

    while (true) {
        [param, errlog_nml] = parseNamelist(parameters_inp);
        if (errlog_nml.length > 0) break;

        [atom, errlog_atom] = parseAtom(atom_xyz);
        if (errlog_atom.length > 0) break;

        errlog_nml = errlog_nml.concat(checkParam(param, atom));
        if (errlog_nml.length > 0) break;

        errlog_atom = errlog_atom.concat(checkAtom(param, atom));
        if (errlog_atom.length > 0) break;

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


    for (var i = 0; i < errlog_nml.length; i++) {
        errmsg.push("<li>parameters.inp: line " + errlog_nml[i].line + ": " + errlog_nml[i].msg + "</li>");
        $('#parameters_inp div.label:eq(' + (errlog_nml[i].line - 1) + ")").addClass('error');
    }
    for (var i = 0; i < errlog_atom.length; i++) {
        errmsg.push("<li>atom.xyz: line " + errlog_atom[i].line + ": " + errlog_atom[i].msg + "</li>");
        $('#atom_xyz div.label:eq(' + (errlog_atom[i].line - 1) + ")").addClass('error');
    }

    $("#errmsg").empty();
    $("#errmsg").html(errmsg.join("\n"));
    $("#errmsgModal").modal("show");

    return 0;
}

function execute() {
    // 変更済みフラグを切る
    flag_change = false;
    // エディタのセレクタ解除
    $('#parameters_inp div').removeClass('selected');
    $('#parameters_inp div').removeClass('error');
    $('#atom_xyz div').removeClass('selected');
    $('#atom_xyz div').removeClass('error');
    $("#error").hide();
    // テキストの読み込み
    parse($('#parameters_inp textarea').val(), $('#atom_xyz textarea').val());
    plot_structure();
    generate_element_list();

    if (errmsg.length == 0) {
        generate_cif();
        // ボタン表示を変更
        $("#run").removeClass().addClass("btn btn-outline-primary");
        $('#download').removeClass('disabled');
    } else {
        $("#run").removeClass().addClass("btn btn-outline-danger");
        $('#download').addClass('disbled');
    }
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
                    // NOTE: exchange y and z to replace left handed system (data) to right handed system (display)!
                    mesh.position.x = x / scale;
                    mesh.position.y = z / scale;
                    mesh.position.z = y / scale;
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
        $("#element_list").append("<span class='rounded-pill' style='margin:4px; padding:16px;background-color:#" + c + ";'>" + s + "</span>");
    }

}


function notify_change() {
    if (flag_change == false) {
        // ボタンの説明を挿入
        $('#run').popover({
            "title": "You modified input data!",
            "content": "Click 'Plot structure' button to update.",
            "placement": "bottom",
        });
        $('#run').popover("show");
        $("#run").removeClass().addClass("btn btn-primary");
        $("#download").addClass("disabled");
        flag_change = true;
    }
}

// 半角英数の入力を検知
$('textarea').keypress(function () {
    notify_change();
});

// deleteキーとbackspaceキーの入力を検知
$('textarea').keyup(function (e) {
    if (e.keyCode == 46 || e.keyCode == 8) {
        notify_change();
    }
});

// クリップボードからの貼り付けを検知
$('textarea').on('paste', function (e) {
    notify_change();
});







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
        $(label[atom_line[i] - 1]).addClass('selected');
        $('#atom_xyz textarea').scrollTop(
            $('#atom_xyz div.selected')[0].offsetTop - $('#atom_xyz textarea')[0].offsetTop
        );

        $("#atom_info").text(
            "Element:" + atom_type[i] + ', Line:' + (atom_line[i])
        );


    }

    renderer.render(scene, camera);
});


$('#run').click(function (e) {
    $('#run').popover("dispose");
    execute();
});


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
        axis.quaternion.copy(object.quaternion);
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

$('.zoom_option').click(function (e) {
    viewer_zoom = parseFloat($(this).data("scale"));
    $("#zoom_scale").text("Zoom: " + Math.round(viewer_zoom * 100) + " %");
    resize();
});

$('#zoom_minus').click(function (e) {
    viewer_zoom = Math.max(0.5, viewer_zoom - 0.1)
    $("#zoom_scale").text("Zoom: " + Math.round(viewer_zoom * 100) + " %");
    resize();
});

$('#zoom_plus').click(function (e) {
    viewer_zoom = Math.min(2.5, viewer_zoom + 0.1)
    $("#zoom_scale").text("Zoom: " + Math.round(viewer_zoom * 100) + " %");
    resize();
});






function resize() {

    window_width = $(window).innerWidth();
    window_height = $(window).innerHeight();

    nav_height = $("nav").outerHeight();
    footer_height = $("#footer").outerHeight();

    $("#panelLeft").outerHeight(window_height - nav_height - footer_height);
    $("#panelRight").outerHeight(window_height - nav_height - footer_height);

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

    camera.top = -2 * viewer_height / (viewer_unit * viewer_zoom);
    camera.left = -2 * viewer_width / (viewer_unit * viewer_zoom);
    camera.right = +2 * viewer_width / (viewer_unit * viewer_zoom);
    camera.bottom = +2 * viewer_height / (viewer_unit * viewer_zoom);
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
    object.quaternion.copy(quaternion);
    scene.add(object);
    // 座標軸ヘルパー作成
    axis = new THREE.AxisHelper(0.50);
    axis.position.set(-1.5, -1.5, 1.5);
    axis.quaternion.copy(quaternion);
    scene.add(axis);
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
    // 計算結果を表示
    execute();
    // ボタンの説明を挿入
    $('#run').popover({
        "title": "Welcome to Web RSPACE view!",
        "content": "Write parameters.inp and atom.xyz in editor and click 'Plot structure' button.",
        "placement": "bottom",
    });
    $('#run').popover("show");
    $('#run').removeClass().addClass("btn btn-primary")
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