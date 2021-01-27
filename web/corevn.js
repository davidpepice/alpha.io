(function($) {
    var _WebSocket = window._WebSocket = window.WebSocket;
    var $ = window.jQuery;
    var options = {
        enableMultiCells: true,
        enablePosition: true,
        enableCross: false
    };

    // game states

    var map_server = null;
    var player_name = [];
    var players = [];
    var id_players = [];
    var cells = [];
    var current_cell_ids = [];
    var start_x = -7000,
        start_y = -7000,
        end_x = 7000,
        end_y = 7000,
        length_x = 14000,
        length_y = 14000;
    var render_timer = null;



    function miniMapSendRawData(data) {
        if (map_server !== null && map_server.readyState === window._WebSocket.OPEN) {
            var array = new Uint8Array(data);
            map_server.send(array.buffer);
        }
    }

    function miniMapConnectToServer(address, onOpen, onClose) {
        try {
            var ws = new window._WebSocket(address);
        } catch (ex) {
            onClose();
            console.error(ex);
            return false;
        }
        ws.binaryType = "arraybuffer";

        ws.onopen = function() {
            onOpen();
            //console.log(address + ' connected');
        }

        ws.onmessage = function(event) {
            var buffer = new Uint8Array(event.data);
            var packet = msgpack.unpack(buffer);
            switch (packet.type) {
                case 128:
                    for (var i = 0; i < packet.data.addition.length; ++i) {
                        var cell = packet.data.addition[i];
                        if (!miniMapIsRegisteredToken(cell.id)) {
                            miniMapRegisterToken(
                                cell.id,
                                miniMapCreateToken(cell.id, cell.color)
                            );
                        }

                        var size_n = cell.size / length_x;
                        miniMapUpdateToken(cell.id, (cell.x - start_x) / length_x, (cell.y - start_y) / length_y, size_n);
                    }

                    for (var i = 0; i < packet.data.deletion.length; ++i) {
                        var id = packet.data.deletion[i];
                        miniMapUnregisterToken(id);
                    }
                    break;

            }
        }

        ws.onerror = function() {
            onClose();
            console.error('failed to connect to map server');
        }

        ws.onclose = function() {
            onClose();
            map_server = null;
            //console.log('map server disconnected');
        }

        map_server = ws;
    }

    function miniMapRender() {
        var canvas = window.mini_map;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var id in window.mini_map_tokens) {
            var token = window.mini_map_tokens[id];
            var x = token.x * canvas.width;
            var y = token.y * canvas.height;
            var size = token.size * canvas.width;
            var name = token.name;


            ctx.beginPath();
            ctx.arc(
                x,
                y,
                size,
                0,
                2 * Math.PI,
                false
            );

            ctx.closePath();
            ctx.fillStyle = token.color;
            ctx.fill();


            if (id_players[id] !== undefined) {
                ctx.font = size * 2 + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.fillText(id_players[id] + 1, x, y);
            }
        };
    }

    function miniMapDrawCross(x, y) {
        var canvas = window.mini_map;
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y * canvas.height);
        ctx.lineTo(canvas.width, y * canvas.height);
        ctx.moveTo(x * canvas.width, 0);
        ctx.lineTo(x * canvas.width, canvas.height);
        ctx.closePath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
    }

    function miniMapCreateToken(id, color) {
        var mini_map_token = {
            id: id,
            color: color,
            x: 0,
            y: 0,
            size: 0
        };
        return mini_map_token;
    }

    function miniMapRegisterToken(id, token) {
        if (window.mini_map_tokens[id] === undefined) {
            // window.mini_map.append(token);
            window.mini_map_tokens[id] = token;
        }
    }

    function miniMapUnregisterToken(id) {
        if (window.mini_map_tokens[id] !== undefined) {
            // window.mini_map_tokens[id].detach();
            delete window.mini_map_tokens[id];
        }
    }

    function miniMapIsRegisteredToken(id) {
        return window.mini_map_tokens[id] !== undefined;
    }

    function miniMapUpdateToken(id, x, y, size) {
        if (window.mini_map_tokens[id] !== undefined) {

            window.mini_map_tokens[id].x = x;
            window.mini_map_tokens[id].y = y;
            window.mini_map_tokens[id].size = size + 0.015;


            return true;
        } else {
            return false;
        }
    }

    function miniMapUpdatePos(x, y) {
        window.mini_map_pos.text('x: ' + x.toFixed(0) + ', y: ' + y.toFixed(0));
    }

    function miniMapReset() {
        cells = [];
        window.mini_map_tokens = [];
    }

    function miniMapInit() {
        window.mini_map_tokens = [];

        cells = [];
        current_cell_ids = [];
        start_x = -7000;
        start_y = -7000;
        end_x = 7000;
        end_y = 7000;
        length_x = 14000;
        length_y = 14000;

        // minimap dom
        if ($('#mini-map-wrapper').length === 0) {
            var wrapper = $('<div>').attr('id', 'mini-map-wrapper').css({
                position: 'fixed',
                bottom: 10,
                right: 10,
                width: 150,
                height: 150,
                //              background: 'rgba(128, 128, 128, 0.58)'
                background: "url('img/mini_map.png')"
            });

            var mini_map = $('<canvas>').attr({
                id: 'mini-map',
                width: 150,
                height: 150
            }).css({
                width: '100%',
                height: '100%',
                position: 'relative'
            });

            wrapper.append(mini_map).appendTo(document.body);

            window.mini_map = mini_map[0];
        }

        // minimap renderer
        if (render_timer === null)
            render_timer = setInterval(miniMapRender, 1000 / 30);

        // minimap location
        if ($('#mini-map-pos').length === 0) {
            window.mini_map_pos = $('<div>').attr('id', 'mini-map-pos').css({
                bottom: 10,
                right: 10,
                color: 'white',
                fontSize: 15,
                fontWeight: 800,
                position: 'fixed'
            }).appendTo(document.body);
        }



        // minimap party
    }

    // cell constructor
    function Cell(id, x, y, size, color, name, extras) {
        cells[id] = this;
        this.id = id;
        this.color = color;
        this.points = [];
        this.pointsAcc = [];
        this.setName(name);
        this.extras = extras;
    }

    Cell.prototype = {
        id: 0,
        points: null,
        pointsAcc: null,
        name: null,
        nameCache: null,
        sizeCache: null,
        x: 0,
        y: 0,
        size: 0,
        ox: 0,
        oy: 0,
        oSize: 0,
        nx: 0,
        ny: 0,
        nSize: 0,
        updateTime: 0,
        updateCode: 0,
        drawTime: 0,
        destroyed: false,
        isVirus: false,
        isAgitated: false,
        wasSimpleDrawing: true,

        destroy: function() {
            delete cells[this.id];
            id = current_cell_ids.indexOf(this.id); -
            1 != id && current_cell_ids.splice(id, 1);
            this.destroyed = true;
            if (map_server === null || map_server.readyState !== window._WebSocket.OPEN) {
                miniMapUnregisterToken(this.id);
            }
        },
        setName: function(name) {
            this.name = name;
        },
        updatePos: function() {
            if (map_server === null || map_server.readyState !== window._WebSocket.OPEN) {
                if (options.enableMultiCells || -1 != current_cell_ids.indexOf(this.id)) {
                    if (!miniMapIsRegisteredToken(this.id) && !this.isVirus) {
                        miniMapRegisterToken(
                            this.id,
                            miniMapCreateToken(this.id, this.color)
                        );
                    }

                    var size_n = this.nSize / length_x;
                    miniMapUpdateToken(this.id, (this.nx - start_x) / length_x, (this.ny - start_y) / length_y, size_n);
                }
            }


        }
    };

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    function camel2cap(str) {
        return str.replace(/([A-Z])/g, function(s) {
            return ' ' + s.toLowerCase();
        }).capitalize();
    };

    // create a linked property from slave object
    // whenever master[prop] update, slave[prop] update
    function refer(master, slave, prop) {
        Object.defineProperty(master, prop, {
            get: function() {
                return slave[prop];
            },
            set: function(val) {
                slave[prop] = val;
            },
            enumerable: true,
            configurable: true
        });
    };

    // extract a websocket packet which contains the information of cells
    function extractCellPacket(data, offset) {
        ////
        var dataToSend = {
            destroyQueue: [],
            nodes: [],
            nonVisibleNodes: []
        };
        ////

        var I = +new Date;
        var qa = false;
        var b = Math.random(),
            c = offset;
        var size = data.getUint16(c, true);
        c = c + 2;

        // Nodes to be destroyed (killed)
        for (var e = 0; e < size; ++e) {
            var p = cells[data.getUint32(c, true)],
                f = cells[data.getUint32(c + 4, true)],
                c = c + 8;
            p && f && (
                f.destroy(),
                f.ox = f.x,
                f.oy = f.y,
                f.oSize = f.size,
                f.nx = p.x,
                f.ny = p.y,
                f.nSize = f.size,
                f.updateTime = I,
                dataToSend.destroyQueue.push(f.id));
        }

        // Nodes to be updated
        for (e = 0;;) {
            var d = data.getUint32(c, true);
            c += 4;
            if (0 == d) {
                break;
            }
            ++e;
            var p = data.getInt32(c, true),
                c = c + 4,
                f = data.getInt32(c, true),
                c = c + 4;
            g = data.getInt16(c, true);
            c = c + 2;
            for (var h = data.getUint8(c++), m = data.getUint8(c++), q = data.getUint8(c++), h = (h << 16 | m << 8 | q).toString(16); 6 > h.length;)
                h = "0" + h;

            var h = "#" + h,
                k = data.getUint8(c++),
                m = !!(k & 1),
                q = !!(k & 16);

            k & 2 && (c += 4);
            k & 4 && (c += 8);
            k & 8 && (c += 16);

            for (var n, k = "";;) {
                n = data.getUint16(c, true);
                c += 2;
                if (0 == n)
                    break;
                k += String.fromCharCode(n)
            }

            n = k;
            k = null;

            var updated = false;
            // if d in cells then modify it, otherwise create a new cell
            cells.hasOwnProperty(d) ?
                (k = cells[d],
                    k.updatePos(),
                    k.ox = k.x,
                    k.oy = k.y,
                    k.oSize = k.size,
                    k.color = h,
                    updated = true) :
                (k = new Cell(d, p, f, g, h, n),
                    k.pX = p,
                    k.pY = f);

            k.isVirus = m;
            k.isAgitated = q;
            k.nx = p;
            k.ny = f;
            k.nSize = g;
            k.updateCode = b;
            k.updateTime = I;
            n && k.setName(n);

            // ignore food creation

        }

        // Destroy queue + nonvisible nodes
        b = data.getUint32(c, true);
        c += 4;
        for (e = 0; e < b; e++) {
            d = data.getUint32(c, true);
            c += 4, k = cells[d];
            null != k && k.destroy();
            dataToSend.nonVisibleNodes.push(d);
        }

        var packet = {
            type: 16,
            data: dataToSend
        }


    }

    // extract the type of packet and dispatch it to a corresponding extractor
    function extractPacket(event) {
        var c = 0;
        var data = new DataView(event.data);
        240 == data.getUint8(c) && (c += 5);
        var opcode = data.getUint8(c);
        c++;
        switch (opcode) {
            case 16: // cells data
                extractCellPacket(data, c);
                break;
            case 20: // cleanup ids
                current_cell_ids = [];
                break;
            case 32: // cell id belongs me
                var id = data.getUint32(c, true);

                if (current_cell_ids.indexOf(id) === -1)
                    current_cell_ids.push(id);


                break;
            case 64: // get borders
                start_x = data.getFloat64(c, !0), c += 8,
                    start_y = data.getFloat64(c, !0), c += 8,
                    end_x = data.getFloat64(c, !0), c += 8,
                    end_y = data.getFloat64(c, !0), c += 8,
                    center_x = (start_x + end_x) / 2,
                    center_y = (start_y + end_y) / 2,
                    length_x = Math.abs(start_x - end_x),
                    length_y = Math.abs(start_y - end_y);
        }
    };

    // function extractSendPacket(data) {
    //     var view = new DataView(data);
    //     switch (view.getUint8(0, true)) {
    //         case 0:
    //             player_name = [];
    //             for (var i = 1; i < data.byteLength; i += 2) {
    //                 player_name.push(view.getUint16(i, true));
    //             }


    //             break;
    //     }
    // }

    // the injected point, overwriting the WebSocket constructor
    window.WebSocket = function(url, protocols) {
        //console.log('Listen');

        if (protocols === undefined) {
            protocols = [];
        }

        var ws = new _WebSocket(url, protocols);

        refer(this, ws, 'binaryType');
        refer(this, ws, 'bufferedAmount');
        refer(this, ws, 'extensions');
        refer(this, ws, 'protocol');
        refer(this, ws, 'readyState');
        refer(this, ws, 'url');

        this.send = function(data) {
            //extractSendPacket(data);
            return ws.send.call(ws, data);
        };

        this.close = function() {
            return ws.close.call(ws);
        };

        this.onopen = function(event) {};
        this.onclose = function(event) {};
        this.onerror = function(event) {};
        this.onmessage = function(event) {};

        ws.onopen = function(event) {
            miniMapInit();
            agar_server = url;

            if (this.onopen)
                return this.onopen.call(ws, event);
        }.bind(this);

        ws.onmessage = function(event) {
            extractPacket(event);
            if (this.onmessage)
                return this.onmessage.call(ws, event);
        }.bind(this);

        ws.onclose = function(event) {
            if (this.onclose)
                return this.onclose.call(ws, event);
        }.bind(this);

        ws.onerror = function(event) {
            if (this.onerror)
                return this.onerror.call(ws, event);
        }.bind(this);



    };

    window.WebSocket.prototype = _WebSocket;

    $(window.document).ready(function() {
        miniMapInit();
    });

    $(window).load(function() {
        var main_canvas = document.getElementById('canvas');
        if (main_canvas && main_canvas.onmousemove) {
            document.onmousemove = main_canvas.onmousemove;
            main_canvas.onmousemove = null;
        }
    });
})();
$(function() {
    $('[data-itr]').each(function() {
        var $this = $(this);
        var itr = $this.attr('data-itr');
        $this.html(i18n[itr] || i18n_dict['en'][itr] || itr);
        //		$this.html('');
    });




});
var blobImage = new Image();
blobImage.src = './img/gum.png';
var arrow = new Image;
arrow.src = "./img/arrow.png";

function rollin() {

    $('#mainPanel').animateCss('flipOutY', function() {
        $("#mainPanel").hide();
        $('#mainPanel').removeClass("animated flipOutY");
        $("#mainPanel2").show();
        $('#mainPanel2').animateCss('flipInY', function() {
            $('#mainPanel').removeClass("animated flipInY");
        });

    });
}

function rollout() {
    $('#mainPanel2').animateCss('flipOutY', function() {
        $("#mainPanel2").hide();
        $('#mainPanel2').removeClass("animated flipOutY");
        $("#mainPanel").show();
        $('#mainPanel').animateCss('flipInY', function() {
            $('#mainPanel2').removeClass("animated flipInY");
        });

    });
};

function show() {
    $('#sidepreview').show();
    $('#skinspreview').show();
    $('#levelbar').show();
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function validatePicture(picture) {
    var re = /\.(gif|jpg|jpeg|tiff|png)$/;
    return re.test(String(picture).toLowerCase());
}

function validateUsername(user) {
    var re = /^\S+$/;
    return re.test(String(user).toLowerCase());
}

function signup_form() {
	$("#register_spinner").fadeIn();
    $(".alert").hide();
    var email = $("#Email2").val();
    var user = $("#username1").val();
    if (validateEmail(email)) {
        $("#filter_user").hide();
    } else {
        $("#filter_user").show();
		$("#register_spinner").fadeOut();
        return;
    }
    if (validateUsername(user)) {
        $("#filter_user").hide();
    } else {
        $("#filter_user").show();
		$("#register_spinner").fadeOut();
        console.log('ff')
        return;
    }


    var datastring = $("#signup_form").serialize();
setTimeout(function(){
    $.ajax({
        type: 'POST',
        url: './cowhb.php',
        data: datastring
    }).done(function(data) {
        var js = JSON.parse(data);
        game(js.stats, js.username, js.email);
		$("#register_spinner").fadeOut();
    });
	}, 2000);
}

function game(stats, username, email) {
    if (stats === "0") {
        if (typeof username == "undefined") {

            console.log(username);

        } else {
            $("#username_error").show();
			$("#register_spinner").fadeOut();
        }
        if (typeof email == "undefined") {

            console.log(email);
        } else {
            $("#email_error").show();
			$("#register_spinner").fadeOut();
        }
    } else if (stats === "1") {
        $("#signup_success").show();
		$("#register_spinner").fadeOut();
    } else {
        $("#db_error").show();
		$("#register_spinner").fadeOut();
    }
}
var pic  = './img/guest.png';
function login_form() {
	$("#login_spinner").fadeIn();
    $(".alert").hide();
    var datastring = $("#login_form").serialize();
setTimeout(function(){
    $.ajax({
        type: 'POST',
        url: './cowhb.php',
        data: datastring
    }).done(function(data) {
		
        var js = JSON.parse(data);

        $("#update_username").val(js.username)
		if (js.picture == pic) {
			setTimeout(function(){
			$('#profile').modal('show');
			}, 2000);
		}
        if (js.stats === "1") {
            $("#login_success").show();

            $(".avatar").css({
                "background-image": "url('" + js.picture + "')"
            });
            $('.bs-modal-sm').modal('toggle');
            show();
            src(js.username, js.email, js.xp, js.level, js.xpneed, js.coins, js.picture);
			$("#login_spinner").fadeOut();
			$("#fbLink").prop("disabled",true);
        } else {
            $("#login_error").show();
			$("#login_spinner").fadeOut();
        }
    });
	}, 2000);
}
function logincheck() {
	
        datas = {
        'logincheck': "cowhb"
    }
setTimeout(function(){
    $.ajax({
        type: 'POST',
        url: './cowhb.php',
        data: datas
    }).done(function(data) {
        var js = JSON.parse(data);

        $("#update_username").val(js.username)
        if (js.stats === "1") {
            

            $(".avatar").css({
                "background-image": "url('" + js.picture + "')"
            });
            show();
            src(js.username, js.email, js.xp, js.level, js.xpneed, js.coins, js.picture);
			$("#fbLink").prop("disabled",true);
			$('.modal').modal('hide');
			
        } else {
			 $('.bs-modal-sm').modal('show');
		}
    });
	}, 2000);
}
$('.modal').on('hide.bs.modal', function (e) {
  $( "#overlays" ).removeClass( "blurpanel" );
})
$('.modal').on('show.bs.modal', function (e) {
  $( "#overlays" ).addClass( "blurpanel" );
})

function src(username, email, xp, level, xpneed, coins, picture) {
    var c = $("#progress-bar-star");
    var b = $("#progress-bar-text");
    var k = $("#agario-wallet-label");
    var p = $("#agario-profile-picture");
    var n = $("#agario-profile-name");

    var cal = xp / xpneed * 100;
			if (picture == pic) {
			setTimeout(function(){
			$('#profile').modal('show');
			}, 2000);
		}

    p.css({
        "background-image": "url(" + picture + ")"
    });
    n.text(username);
    k.text(coins);
    c.text(level);
    b.text(xp + "/" + xpneed + " XP");
    //$(".agario-wallet-label").text(js.coins);
    k.animateNumber({
        number: coins
    });
    $("#1").animate({
        width: cal + "%"
    });
    $("#bestplayer").click();
	shop("skin","free");

};

function save() {
    $(".alert").hide();
	$("#save_spinner").fadeIn();
    var p = $(".agario-profile-picture");
    var z = $(".avatar");
    var image = $("#picture_url").val();
    if (validatePicture(image)) {
        $("#filter_picture").hide();
    } else {
        $("#filter_picture").show();
        return;
    }
    var datastring = $("#update").serialize();
setTimeout(function(){	
    $.ajax({
        type: 'POST',
        url: './cowhb.php',
        data: datastring
    }).done(function(data) {
        var js = JSON.parse(data);
        if (js.stats === "1") {
            $("#update_success").show();
            p.css({
                "background-image": "url(" + js.picture + ")"
            });
            z.css({
                "background-image": "url(" + js.picture + ")"
            });


        $("#save_spinner").fadeOut();
        } else {
            $("#update_db_error").show();
			$("#save_spinner").fadeOut();
        }


    });
	}, 2000);




}

function scoreList(times) {




    datas = {
        'highscore': times
    }
    jQuery.ajax({
        type: "POST",
        url: "./cowhb.php",
        data: datas,
        success: function(data) {

            $('#conten').html(data)


        }
    });

}

var hat = "";
var hats = {
    penguin: new Image(),
    irish: new Image(),
    crown: new Image(),
    santa: new Image(),
    cat: new Image(),
    fancy: new Image(),
    poke: new Image(),
    r2d2: new Image(),
    poop: new Image(),
    crown2: new Image(),
    viking2: new Image(),
    blue: new Image()
}
hats.penguin.src = "http://i.imgur.com/L0dCOQb.png";
hats.irish.src = "http://i.imgur.com/5kTy39Y.png";
hats.crown.src = "http://i.imgur.com/fx0KFMS.png";
hats.santa.src = "http://i.imgur.com/lw85cSt.png";
hats.cat.src = "http://i.imgur.com/GQbxegB.png";
hats.fancy.src = "http://i.imgur.com/kqJIvT0.png";
hats.poke.src = "http://i.imgur.com/DwlJBPt.png";
hats.r2d2.src = "http://i.imgur.com/XOVjliJ.png";
hats.poop.src = "http://i.imgur.com/96uASUI.png";
hats.crown2.src = "http://i.imgur.com/ADozPZ6.png";
hats.viking2.src = "http://i.imgur.com/JIjWf21.png";
hats.blue.src = "http://i.imgur.com/nqo8nHf.png";


(function(d, e) {
    //	

    //alert();

    var isTyping = false;
    var chattxt;


    function Ib() {
        Ca = !0;
        ab();
        e("#mini-map-wrapper").hide();
        setInterval(ab, 18E4);
        J = Da = document.getElementById("canvas");
        f = J.getContext("2d");
        J.onmousedown = function(a) {
            if (bb) {
                var b = a.clientX - (5 + m / 5 / 2),
                    c = a.clientY - (5 + m / 5 / 2);
                if (Math.sqrt(b * b + c * c) <= m / 5 / 2) {
                    aa();
                    K(17);
                    return
                }
            }
            ja = a.clientX;
            ka = a.clientY;
            Ea();
            aa()
        };
        J.onmousemove = function(a) {
            ja = a.clientX;
            ka = a.clientY;
            Ea()
        };
        J.onmouseup = function() {};
        /firefox/i.test(navigator.userAgent) ? document.addEventListener("DOMMouseScroll", cb, !1) : document.body.onmousewheel = cb;



        J.onfocus = function() {
            isTyping = false;
        };

        document.getElementById("chat_textbox").onblur = function() {
            isTyping = false;
        };


        document.getElementById("chat_textbox").onfocus = function() {
            isTyping = true;
        };

        var spacePressed = false,
            qPressed = false,
            wPressed = false;


        function spltt() {
            //alert(isTyping);
            if (isTyping != true) {
                (aa(), K(17), a = !0);
            }
        }

        function fedvir() {
            if (isTyping != true) {
                (aa(), K(21), c = !0);
            }
        }

        var a = !0,
            b = !1,
            c = !1;
        d.onkeydown = function(k) {
            32 != k.keyCode || a || spltt();
            81 != k.keyCode || b || (K(18), b = !0);
            87 != k.keyCode || c || fedvir();
            27 == k.keyCode && Fa(300)
            //65 != boost();
            13 == k.keyCode && cht();
        };

        function cht() {
            if (isTyping) {
                isTyping = false;
                document.getElementById("chat_textbox").blur();
                chattxt = document.getElementById("chat_textbox").value;
                /////advertising protection/////
                chattxt = chattxt.replace("www", "***");
                chattxt = chattxt.replace(".com", "***");
                chattxt = chattxt.replace(".biz", "***");
                chattxt = chattxt.replace(".net", "***");
                chattxt = chattxt.replace("agar.io", "agarioplay.org");
                chattxt = chattxt.replace(".org", "***");
                chattxt = chattxt.replace("AGAR", "***");
                chattxt = chattxt.replace("AGAR.İO", "***");
                chattxt = chattxt.replace("AGARİO", "***");
                chattxt = chattxt.replace(".co", "***");
                chattxt = chattxt.replace("xyz", "***");
                chattxt = chattxt.replace(".warball", "***");
                chattxt = chattxt.replace(".gen.tr", "***");
                chattxt = chattxt.replace(".com.tr", "***");
                chattxt = chattxt.replace("agario", "***");
                chattxt = chattxt.replace("pvp", "***");
                chattxt = chattxt.replace("agar.yt", "***");
                chattxt = chattxt.replace("Agar.yt!", "***");
                chattxt = chattxt.replace("AGAR.YT", "***");
                chattxt = chattxt.replace("AGAR.", "***");
                chattxt = chattxt.replace("agar.", "***");
                chattxt = chattxt.replace("agar", "***");
                chattxt = chattxt.replace("Agar.", "***");
                chattxt = chattxt.replace("Agar", "***");
                chattxt = chattxt.replace(".YT", "***");
                chattxt = chattxt.replace(".yt", "***");
                chattxt = chattxt.replace(".Yt", "***");
                chattxt = chattxt.replace("Agario.", "***");
                chattxt = chattxt.replace("AGAR.YT", "***");
                chattxt = chattxt.replace("AGAR.YT!", "***");
                /////bad words filter/////
                chattxt = chattxt.replace("piç", "***");
                chattxt = chattxt.replace("yarak", "***");
                chattxt = chattxt.replace("amcık", "***");
                chattxt = chattxt.replace("sikerim", "***");
                chattxt = chattxt.replace("sikerler", "***");
                chattxt = chattxt.replace("orospu", "***");
                chattxt = chattxt.replace("çocuğu", "***");
                chattxt = chattxt.replace("göt", "***");
                chattxt = chattxt.replace("fuck", "***");
                chattxt = chattxt.replace("FUCK", "***");
                chattxt = chattxt.replace("FUCK", "***");
                chattxt = chattxt.replace("MOTHER", "***");
                chattxt = chattxt.replace("SİSTER", "***");
                chattxt = chattxt.replace("sister", "***");
                chattxt = chattxt.replace("Dick", "***");
                chattxt = chattxt.replace("Ass", "***");
                chattxt = chattxt.replace("Vagina", "***");
                chattxt = chattxt.replace("Bitch", "***");
                chattxt = chattxt.replace("Sucker", "***");
                chattxt = chattxt.replace("meme", "***");
                chattxt = chattxt.replace("yarak", "***");
                chattxt = chattxt.replace("yarağı", "***");
                chattxt = chattxt.replace("sokam", "***");
                chattxt = chattxt.replace("sikem", "***");
                chattxt = chattxt.replace("sik", "***");
                chattxt = chattxt.replace("oç", "***");
                chattxt = chattxt.replace("o.ç", "***");
                chattxt = chattxt.replace("o.çocuğu", "***");
                chattxt = chattxt.replace("kaşar", "***");
                chattxt = chattxt.replace("anne", "***");
                chattxt = chattxt.replace("baba", "***");
                chattxt = chattxt.replace("kız", "***");
                chattxt = chattxt.replace("ezik", "***");
                chattxt = chattxt.replace("salak", "***");
                chattxt = chattxt.replace("aptal", "***");
                chattxt = chattxt.replace("sıç", "***");
                chattxt = chattxt.replace("penis", "***");
                chattxt = chattxt.replace("vagina", "***");
                if (chattxt.length > 0) sendChat(chattxt);
                document.getElementById("chat_textbox").value = "";

            } else {
                if (!hasOverlay) {
                    document.getElementById("chat_textbox").focus();
                    isTyping = true;
                }
            }
        }

        d.onkeyup = function(k) {
            32 == k.keyCode && (a = !1);
            87 == k.keyCode && (c = !1);
            81 == k.keyCode && b && (K(19), b = !1)
        };
        d.onblur = function() {
            K(19);
            c = b = a = !1
        };
        d.onresize = db;
        d.requestAnimationFrame(eb);
        setInterval(aa, 40);
        t && e("#region").val(t);
        fb();
        la(e("#region").val());
        0 == Ga && t && L();
        S = !0;
        e("#overlays").show();
        db();
        d.location.hash && 6 <= d.location.hash.length && gb(d.location.hash);



    }


    function sendChat(str) {
        if (Y() && (str.length < 200) && (str.length > 0)) {
            var msg = P(2 + 2 * str.length);
            var offset = 0;
            msg.setUint8(offset++, 99);
            msg.setUint8(offset++, 0); // flags (0 for now)
            for (var i = 0; i < str.length; ++i) {
                msg.setUint16(offset, str.charCodeAt(i), !0);
                offset += 2;
            }
            Q(msg);

        }
    }

    function cb(a) {
        M *= Math.pow(.9, a.wheelDelta / -120 || a.detail || 0);
        
         1 > M && (M = 1);
         M > 4 / g && (M = 4 / g)
        
    }

    function Jb() {
        if (.4 > g) ba = null;
        else {
            for (var a = Number.POSITIVE_INFINITY, b = Number.POSITIVE_INFINITY, c = Number.NEGATIVE_INFINITY, k = Number.NEGATIVE_INFINITY, d = 0, n = 0; n < y.length; n++) {
                var e = y[n];
                !e.N() || e.R || 20 >= e.size * g || (d = Math.max(e.size, d), a = Math.min(e.x, a), b = Math.min(e.y, b), c = Math.max(e.x, c), k = Math.max(e.y, k))
            }
            ba = Kb.la({
                ca: a - (d + 100),
                da: b - (d + 100),
                oa: c + (d + 100),
                pa: k + (d + 100),
                ma: 2,
                na: 4
            });
            for (n = 0; n < y.length; n++)
                if (e = y[n],
                    e.N() && !(20 >= e.size * g))
                    for (a = 0; a < e.a.length; ++a) b = e.a[a].x, c = e.a[a].y, b < u - m / 2 / g || c < v - q / 2 / g || b > u + m / 2 / g || c > v + q / 2 / g || ba.m(e.a[
                        a])
        }
    }

    function Ea() {
        ma = (ja - m / 2) / g + u;
        na = (ka - q / 2) / g + v
    }

    function ab() {
        null == oa && (oa = {}, e("#region").children().each(function() {
            var a = e(this),
                b = a.val();
            b && (oa[b] = a.text())
        }));
        e.get("info.php", function(a) {
                var b = {},
                    c;
                for (c in a.regions) {
                    var k = c.split(":")[0];
                    b[k] = b[k] || 0;
                    b[k] += a.regions[c].numPlayers
                }
                for (c in b) e('#region option[value="' + c + '"]').text(oa[c] + " (" + b[c] + " players)")
            },
            "json")
    }

    function hb() {
        hasOverlay = false;
        e("#adsBottom").hide();
        e("#overlays").hide();
        e("#stats").hide();
        e("#mainPanel").hide();
        e("#mini-map-wrapper").show();
        T = S = !1;
        fb();
        d.googletag && d.googletag.pubads && d.googletag.pubads().clear && d.googletag.pubads().clear(d.aa.concat(d.ab))
    }

    function skorkaydet() {
        var sro = ~~(O / 100);
    var c = e("#progress-bar-star");
    var b = e("#progress-bar-text");
    var k = e("#agario-wallet-label");
    var p = e("#agario-profile-picture");
    var n = e("#agario-profile-name");
        e.post('./cowhb.php', {
            id: e("#update_username").val(),
            mass: sro
        }, function(data) {
            var js = JSON.parse(data);
            if (js.stats !== "0") {
                var cal = parseInt("" + js.xp + "") / js.xpneed * 100;
                k.text(js.coins);
                c.text(js.level)
                b.text(js.xp + "/" + js.xpneed + " XP");
                e("#1").animate({
                    width: cal + "%"
                });
				e("#bestplayer").click();
				shop("skin","free");
            } else {
                e('.bs-modal-sm').modal('show');
            }
        });
    }

    function closeStats() {

        hasOverlay = true;
        e("#adsBottom").show();
        e("#overlays").show();
        e("#stats").show();
        e("#mainPanel").fadeIn("slow");
        e("#mini-map-wrapper").hide();
    }
    e(document).on("click", "#statsContinue", function() {
        skorkaydet();
    });

    function la(a) {
        a && a != t && (e("#region").val() != a && e("#region").val(a), t = d.localStorage.location = a, e(".region-message").hide(), e(".region-message." + a).show(),
            e(".btn-needs-server").prop("disabled", !1), Ca && L())
    }

    function Fa(a) {
        S || T || (H = null, ib(d.aa), 1E3 > a && (x = 1), S = !0, e("#mainPanel").show(),
            0 < a ? e("#overlays").fadeIn(a) : e("#overlays").show())
    }

    function ca(a) {
        if (a == ":rainbow") {
            host = [""];

        } else if (a == ":ffa") {
            host = ["51.254.21.134:1111"];

        } else if (a == ":ffa2") {
            host = ["51.254.21.134:2222"];

        } else if (a == ":ffagiant") {
            host = ["51.254.21.134:1117"];

        } else if (a == ":ffagiant2") {
            host = ["51.254.21.134:1177"];

        } else if (a == ":ffagiant3") {
            host = ["51.254.21.134:1178"];

        } else if (a == ":ffaeasy") {
            host = ["51.254.21.134:1015"];

        } else if (a == ":ffaeasy2") {
            host = ["51.254.21.134:1066"];

        } else if (a == ":ffaeasy3") {
            host = ["51.254.21.134:1061"];

        } else if (a == ":speedyffa") {
            host = ["51.254.21.134:1201"];

        } else if (a == ":speedyrainbow") {
            host = ["51.254.21.134:1202"];

        } else if (a == ":strike") {
            host = ["51.254.21.134:10044"];

        } else if (a == ":prosplit") {
            host = ["51.254.21.134:1204"];

        } else if (a == ":prosplit2") {
            host = ["51.254.21.134:1205"];

        } else if (a == ":prosplit3") {
            host = ["51.254.21.134:1206"];

        } else if (a == ":teams") {
            host = ["51.254.21.134:1203"];

        } else if (a == ":strike3") {

            host = ["46.4.17.166:450"];

        } else if (a == ":supereasy") {
            host = [""];

        } else if (a == ":hunger") {
            host = [""];

        } else {
            a = ":ffa"
            host = ["51.254.21.134:1001", "51.254.21.134:1001"];
        }
        e("#helloContainer").attr("data-gamemode", a);
        U = a;
        e("#gamemode").val(a);
    }

    function fb() {
        e("#region").val() ? d.localStorage.location = e("#region").val() : d.localStorage.location && e("#region").val(d.localStorage.location);
        e("#region").val() ? e("#locationKnown").append(e("#region")) : e("#locationUnknown").append(e("#region"))
    }

    function ib(a) {
        pa && (pa = !1, setTimeout(function() {
            pa = !0
        }, 6E4 * jb), d.googletag && d.googletag.pubads && d.googletag.pubads().refresh && d.googletag.pubads().refresh(a))
    }

    function da(a) {
        return d.i18n[a] || d.i18n_dict.en[a] || a
    }

    function kb() {
        Ha("ws://" + host);
    }

    function L() {
        Ca && t && (e("#overlays").show(), kb())
    }

    function Ha(a, b) {
        if (s) {
            s.onopen = null;
            s.onmessage = null;
            s.onclose = null;
            try {
                s.close()
            } catch (c) {}
            s = null
        }
        var c = a;
        a = c;
        A = [];
        h = [];
        I = {};
        y = [];
        V = [];
        w = [];
        B = C = null;
        O = 0;
        ea = !1;
        //console.log("Connecting to " + a);
        s = new WebSocket(a);
        s.binaryType = "arraybuffer";
        s.onopen = function() {
            var a;
            //console.log("socket open");
            a = P(5);
            a.setUint8(0, 254);
            a.setUint32(1, 5, !0);
            Q(a);
            a = P(5);
            a.setUint8(0, 255);
            a.setUint32(1, 154669603, !0);
            Q(a);
            mb()
        };
        s.onmessage = Lb;
        s.onclose = Mb;
        s.onerror = function() {
            //console.log("socket error")
        }
    }

    function P(a) {
        return new DataView(new ArrayBuffer(a))
    }

    function Q(a) {
        s.send(a.buffer)
    }

    function Mb() {
        ea && (qa = 500);
        //console.log("socket close");
        setTimeout(L, qa);
        qa *= 2
    }

    function Lb(a) {
        Nb(new DataView(a.data))
    }

    function Nb(a) {
        function b() {
            for (var b = "";;) {
                var d = a.getUint16(c, !0);
                c += 2;
                if (0 == d) break;
                b += String.fromCharCode(d)
            }
            return b
        }
        var c = 0;
        240 == a.getUint8(c) && (c += 5);
        switch (a.getUint8(c++)) {
            case 16:
                Ob(a, c);
                break;
            case 17:
                fa = a.getFloat32(c, !0);
                c += 4;
                ga = a.getFloat32(c, !0);
                c += 4;
                ha = a.getFloat32(c, !0);
                c += 4;
                break;
            case 20:
                h = [];
                A = [];
                break;
            case 21:
                Ka = a.getInt16(c, !0);
                c += 2;
                La = a.getInt16(c, !0);
                c += 2;
                Ma || (Ma = !0, ra = Ka, sa = La);
                break;
            case 32:
                A.push(a.getUint32(c, !0));
                c += 4;
                break;
            case 49:
                if (null != C) break;
                var k = a.getUint32(c, !0),
                    c = c + 4;
                w = [];
                for (var d = 0; d < k; ++d) {
                    var e = a.getUint32(c, !0),
                        c = c + 4;
                    w.push({
                        id: e,
                        name: b()
                    })
                }
                nb();
                break;
            case 50:
                C = [];
                k = a.getUint32(c, !0);
                c += 4;
                for (d = 0; d < k; ++d) C.push(a.getFloat32(c, !0)), c += 4;
                nb();
                break;
            case 64:
                ta = a.getFloat64(c, !0);
                c += 8;
                ua = a.getFloat64(c, !0);
                c += 8;
                va = a.getFloat64(c, !0);
                c += 8;
                wa = a.getFloat64(c, !0);
                c += 8;
                fa = (va + ta) / 2;
                ga = (wa + ua) / 2;
                ha = 1;
                0 == h.length && (u = fa, v = ga, g = ha);
                break;
            case 81:
                var r = a.getUint32(c, !0),
                    c = c + 4,
                    p = a.getUint32(c, !0),
                    c = c + 4,
                    f = a.getUint32(c, !0),
                    c = c + 4;
                setTimeout(function() {
                    W({
                        e: r,
                        f: p,
                        d: f
                    })
                }, 1200)
                break;
            case 90:
                // Server Info / ping
                var Uping = (new Date) - latency;
                jQuery('#latency').html('Latency ' + Uping + ' ms;');

                var Uuptime = a.getFloat64(c, !0);
                c += 8;
                jQuery('#uptime').html('Uptime ' + Uuptime + ' sec;');
                // Do something with the info 

                var Uplayers = a.getFloat64(c, !0);
                c += 8;
                jQuery('#onlineplayers').html('Players ' + Uplayers + ';');
                // Do something with the info, example >> jQuery('#onlineplayers').html('Players ' + Uplayers );

                var Umapsize = a.getFloat64(c, !0);
                c += 8;
                jQuery('#mapsize').html('Mapsize ' + Umapsize + ';');
				
                // Do something with the info, example >> jQuery('#mapsize').html('Mapsize ' + Umapsize );

                var Umapfood = a.getFloat64(c, !0);
                c += 8;
                jQuery('#mapfood').html('Mapfood ' + Umapfood);
                // Do something with the info, example >> jQuery('#mapsize').html('Mapfood ' + Umapfood );
                console.log(Uping,Uuptime,Uplayers,Umapsize,Umapfood)
                if (a.byteLength > 36) {
                    var Ugamemode = a.getFloat64(c, !0);
                    // Game mode is the number, so 0 for FFA etc...
                }
                break;
            case 99:
                addChat(a, c);
                break;
        }
    }

    function addChat(view, offset) {
        function getString() {
            var text = '',
                char;
            while ((char = view.getUint16(offset, true)) != 0) {
                offset += 2;
                text += String.fromCharCode(char);
            }
            offset += 2;
            return text;
        }

        var flags = view.getUint8(offset++);
        // for future expansions
        if (flags & 2) {
            offset += 4;
        }
        if (flags & 4) {
            offset += 8;
        }
        if (flags & 8) {
            offset += 16;
        }

        var r = view.getUint8(offset++),
            g = view.getUint8(offset++),
            b = view.getUint8(offset++),
            color = (r << 16 | g << 8 | b).toString(16);
        while (color.length > 6) {
            color = '0' + color;
        }
        _hat = "";
        color = '#' + color;
        chatBoard.push({
            "name": getString(),
            "color": color,
            "message": getString(),
            "time": Date.now()
        });

        drawChatBoard();

    }



    function drawChatBoard() {
        chatCanvas = null;
        chatCanvas = document.createElement("canvas");

        var ctx = chatCanvas.getContext("2d");
        var scaleFactor = Math.min(Math.max(m / 1200, 0.75), 1); //scale factor = 0.75 to 1
        chatCanvas.width = 1000 * scaleFactor;
        chatCanvas.height = 550 * scaleFactor;
        ctx.scale(scaleFactor, scaleFactor);
        var nowtime = Date.now();
        var lasttime = 0;
        if (chatBoard.length >= 1)
            lasttime = chatBoard[chatBoard.length - 1].time;
        else return;
        var deltat = nowtime - lasttime;

        ctx.globalAlpha = 0.8 * Math.exp(-deltat / 25000);



        var len = chatBoard.length;
        var from = len - 1;
        if (from < 0) from = 0;
        for (var i = 0; i < (len - from); i++) {
            var chatName = new za(18, chatBoard[i + from].color);
            chatName.C(chatBoard[i + from].name.split("*")[0]);
            var a = ctx.measureText(chatBoard[i + from].name.split("*")[0]);
            var width = chatName.getWidth();
            var a = chatName.L();

            //ctx.drawImage(a, 18, chatCanvas.height / scaleFactor - 24 * (len - i - from));
            var chatText = new za(18, '#666666');
            chatText.C(': ' + chatBoard[i + from].message);
            e.toast({
                text: chatBoard[i + from].name.split("*")[0] + ' :' + chatBoard[i + from].message,
                hideAfter: 25000,
                bgColor: "rgba(10, 10, 10, 0.8)",
                textColor: "#F2FBFF",
                position: {
                    left: 5,
                    bottom: 30
                },
                stack: 5
            })

            a = chatText.L();
            //ctx.drawImage(a, 20 + width * 1.8, chatCanvas.height / scaleFactor - 24 * (len - from - i));
        }
        //ctx.restore();
    }




    function Ob(a, b) {
        function c() {
            for (var c = "";;) {
                var d = a.getUint16(b, !0);
                b += 2;
                if (0 == d) break;
                c += String.fromCharCode(d)
            }
            return c
        }

        function k() {
            for (var c = "";;) {
                var d = a.getUint8(b++);
                if (0 == d) break;
                c += String.fromCharCode(d)
            }
            return c
        }
        ob = E = Date.now();
        ea || (ea = !0, Pb());
        var G = Math.random();
        Na = !1;
        var n = a.getUint16(b, !0);
        b += 2;
        for (var r = 0; r < n; ++r) {
            var p = I[a.getUint32(b, !0)],
                f = I[a.getUint32(b + 4, !0)];
            b += 8;
            p && f && (f.X(), f.s = f.x, f.t = f.y, f.r = f.size, f.J = p.x, f.K = p.y, f.q = f.size, f.Q = E, Qb(p, f))
        }
        for (r = 0;;) {
            n = a.getUint32(b, !0);
            b += 4;
            if (0 == n) break;
            ++r;
            var g, p = a.getInt32(b, !0);
            b += 4;
            f = a.getInt32(b, !0);
            b += 4;
            g = a.getInt16(b, !0);
            b += 2;
            var l = a.getUint8(b++),
                m = a.getUint8(b++),
                q = a.getUint8(b++),
                m = Rb(l << 16 | m << 8 | q),
                q = a.getUint8(b++),
                s = !!(q & 1),
                x = !!(q & 16),
                w = null;
            q & 2 && (b += 4 + a.getUint32(b, !0));
            q & 4 && (w = k());
            var t = c(),
                l = null;
            I.hasOwnProperty(n) ? (l = I[n], l.P(), l.s = l.x, l.t = l.y, l.r = l.size, l.color = m) : (l = new X(n, p, f, g, m, t), y.push(l), I[n] = l, l.ua = p, l.va =
                f);
            l.h = s;
            l.n = x;
            l.J = p;
            l.K = f;
            l.q = g;
            l.sa = G;
            l.Q = E;
            l.ba = q;
            l.fa = w;
            t && l.B(t); - 1 != A.indexOf(n) && -1 == h.indexOf(l) && (h.push(l), 1 == h.length && (u = l.x, v = l.y, document.getElementById("overlays").style.display =
                "none", z = [], Oa = 0, Pa = h[0].color, Qa = !0, qb = Date.now(), R = Ra = Sa = 0))
        }
        G = a.getUint32(b, !0);
        b += 4;
        for (r = 0; r < G; r++) n = a.getUint32(b, !0), b += 4, l = I[n], null != l && l.X();
        Na && 0 == h.length && (rb = Date.now(), Qa = !1, S || T || (sb ? (ib(d.ab), Sb(), T = !0, e("#overlays").fadeIn(3E3), e("#mini-map-wrapper").hide(), e(
            "#stats").show()) : Fa(3E3)))
    }

    function Pb() {
        e("#connecting").hide();
        tb();
        N && (N(), N = null);
        null != Ta && clearTimeout(Ta);
        Ta = setTimeout(function() {
            d.ga && (++ub, d.ga("set", "dimension2", ub))
        }, 1E4)
    }

    function aa() {
        if (Y()) {
            var a = ja - m / 2,
                b = ka - q / 2;
            64 > a * a + b * b || .01 > Math.abs(vb - ma) && .01 > Math.abs(wb - na) || (vb = ma, wb = na, a = P(21), a.setUint8(0, 16), a.setFloat64(1,
                ma, !0), a.setFloat64(9, na, !0), a.setUint32(17, 0, !0), Q(a))
        }
    }

    function tb() {
        if (Y() && ea && null != H) {
            var a = P(1 + 2 * H.length);
            a.setUint8(0, 0);
            for (var b = 0; b < H.length; ++b) a.setUint16(1 + 2 * b, H.charCodeAt(b), !0);
            Q(a);
            H = null
        }
    }

    function Y() {
        return null != s && s.readyState == s.OPEN
    }

    function K(a) {
        if (Y()) {
            var b = P(1);
            b.setUint8(0, a);
            Q(b)
        }
    }

    function mb() {
        if (Y() && null != D) {
            var a = P(1 + D.length);
            a.setUint8(0, 81);
            for (var b = 0; b < D.length; ++b) a.setUint8(b + 1, D.charCodeAt(b));
            Q(a)
        }
    }

    function db() {
        m = d.innerWidth;
        q = d.innerHeight;
        Da.width = J.width = m;
        Da.height = J.height = q;
        var a = e("#helloContainer");
        a.css("transform", "none");
        var b = a.height(),
            c = d.innerHeight;
        b > c / 1.1 ? a.css("transform", "translate(-50%, -50%) scale(" + c / b / 1.1 + ")") : a.css("transform", "translate(-50%, -50%)");
        xb()
    }

    function yb() {
        var a;
        a = 1 * Math.max(q / 1080, m / 1920);
        return a *= M
    }

    function Tb() {
        if (0 != h.length) {
            for (var a = 0, b = 0; b < h.length; b++) a += h[b].size;
            a = Math.pow(Math.min(64 / a, 1), .4) * yb();
            g = (9 * g + a) / 10
        }
    }

    function xb() {
        var a, b = Date.now();
        ++Ub;
        E = b;
        if (0 < h.length) {
            Tb();
            for (var c = a = 0, d = 0; d < h.length; d++) h[d].P(),
                a += h[d].x / h.length, c += h[d].y / h.length;
            fa = a;
            ga = c;
            ha = g;
            u = (u + a) / 2;
            v = (v + c) / 2
        } else u = (29 * u + fa) / 30, v = (29 * v + ga) / 30, g = (9 * g + ha * yb()) / 10;
        Jb();
        Ea();
        Ua || f.clearRect(0, 0, m, q);
        Ua ? (f.fillStyle = xa ? "#111111" : "#F2FBFF", f.globalAlpha = .05, f.fillRect(0, 0, m, q), f.globalAlpha = 1) : Vb();
        y.sort(function(a, b) {
            return a.size == b.size ? a.id - b.id : a.size - b.size
        });
        f.save();
        f.translate(m / 2, q / 2);
        f.scale(g, g);
        f.translate(-u, -v);
        for (d = 0; d < V.length; d++) V[d].w(f);
        for (d = 0; d < y.length; d++) y[d].w(f);
        if (Ma) {
            ra = (3 * ra + Ka) / 4;
            sa = (3 * sa + La) / 4;
            f.save();
            f.strokeStyle = "#FFAAAA";
            f.lineWidth = 10;
            f.lineCap = "round";
            f.lineJoin = "round";
            f.globalAlpha = .5;
            f.beginPath();
            for (d = 0; d < h.length; d++) f.moveTo(h[d].x, h[d].y), f.lineTo(ra, sa);
            f.stroke();
            f.restore()
        }
        f.restore();
        B && B.width && f.drawImage(B, m - B.width - 10, 10);
        if (!hideChat) {
            if ((chatCanvas != null) && (chatCanvas.width > 0)) f.drawImage(chatCanvas, 0, q - chatCanvas.height - 50); // draw Chat Board
        }
        O = Math.max(O, zb());
        0 != O && (null == ya && (ya = new za(24, "#FFFFFF")), ya.C(da("score") + ": " + ~~(O / 100)), c = ya.L(), a = c.width, f.globalAlpha = .2, f.fillStyle =
            "#000000", f.fillRect(10, 10, a + 10, 34), f.globalAlpha = 1, f.drawImage(c, 15, 15));
        Wb();
        b = Date.now() - b;
        b > 1E3 / 60 ? F -= .01 : b < 1E3 / 65 && (F += .01);
        .4 > F && (F = .4);
        1 < F && (F = 1);
        b = E - Ab;
        !Y() || S || T ? (x += b / 2E3, 1 < x && (x = 1)) : (x -= b / 300, 0 > x && (x = 0));
        0 < x && (f.fillStyle = "#000000", f.globalAlpha = .5 * x, f.fillRect(0, 0, m, q), f.globalAlpha = 1);
        Ab = E
    }

    function Vb() {
        f.fillStyle = xa ? "#111111" : "#F2FBFF";
        f.fillRect(0, 0, m, q);
        f.save();
        f.strokeStyle = xa ? "#AAAAAA" : "#000000";
        f.globalAlpha = .2 * g;
        for (var a = m / g, b = q / g, c = (-u + a / 2) % 100; c < a; c += 100) f.beginPath(), f.moveTo(c * g - .5, 0), f.lineTo(c * g - .5, b * g), f.stroke();
        for (c = (-v + b / 2) % 100; c < b; c += 100) f.beginPath(), f.moveTo(0,
            c * g - .5), f.lineTo(a * g, c * g - .5), f.stroke();
        f.restore()
    }

    function Wb() {
        if (bb && Va.width) {
            var a = m / 5;
            f.drawImage(Va, 5, 5, a, a)
        }
    }

    function zb() {
        for (var a = 0, b = 0; b < h.length; b++) a += h[b].q * h[b].q;
        return a
    }

    function nb() {
        B = null;
        if (null != C || 0 != w.length)
            if (null != C || Aa) {
                B = document.createElement("canvas");
                var a = B.getContext("2d"),
                    b = 60,
                    b = null == C ? b + 24 * w.length : b + 180,
                    c = Math.min(200, .3 * m) / 200;
                B.width = 200 * c;
                B.height = b * c;
                a.scale(c, c);
                a.globalAlpha = .4;
                a.fillStyle = "#000000";
                a.fillRect(0, 0, 200, b);
                a.globalAlpha = 1;
                a.fillStyle = "#FFFFFF";
                c = null;
                c = da("leaderboard");
                a.font = "30px Ubuntu";
                a.fillText(c, 100 - a.measureText(c).width / 2, 40);

                var leaderColors = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF",
                    "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"
                ];

                if (null == C)
                    for (a.font = "20px Ubuntu", b = 0; b < w.length; ++b) c = w[b].name.split("*")[0] || da("unnamed_cell"),
                        Aa || (c = da("unnamed_cell")), -1 != A.indexOf(w[b].id) ? (h[0].name.split("*")[0] && (c = h[0].name.split("*")[0]),
                            a.fillStyle = "#FFAAAA") :
                        a.fillStyle = leaderColors[b],
                        c = b + 1 + ". " + c, a.fillText(c, 100 - a.measureText(c).width / 2, 70 + 24 * b);
                else
                    for (b = c = 0; b < C.length; ++b) {
                        var d = c + C[b] * Math.PI * 2;
                        a.fillStyle = Xb[b + 1];
                        a.beginPath();
                        a.moveTo(100, 140);
                        a.arc(100, 140, 80, c, d, !1);
                        a.fill();
                        c = d
                    }
            }
    }

    function Wa(a, b, c, d, e) {
        this.V = a;
        this.x = b;
        this.y = c;
        this.i = d;
        this.b = e
    }

    function X(a, b, c, d, e, n) {
        this.id = a;
        this.s = this.x = b;
        this.t = this.y = c;
        this.r = this.size = d;
        this.color = e;
        this.a = [];
        this.W();
        this.B(n)
    }

    function Rb(a) {
        for (a = a.toString(16); 6 > a.length;) a = "0" + a;
        return "#" + a
    }

    function za(a, b, c, d) {
        a && (this.u = a);
        b && (this.S = b);
        this.U = !!c;
        d && (this.v = d)
    }

    function Yb(a) {
        for (var b = a.length, c, d; 0 < b;) d = Math.floor(Math.random() * b), b--, c = a[b], a[b] = a[d], a[d] = c
    }

    function Zb(a) {
        a = a.split("\n");
        Bb({
            name: a[0],
            ta: a[1],
            ha: a[2],
            ka: 1E3 * +a[3],
            e: +a[4],
            f: +a[5],
            d: +a[6]
        })
    }

    function Ya(a) {
        d.history && d.history.replaceState && d.history.replaceState({}, d.document.title, a)
    }

    function Qb(a, b) {
        var c = -1 != A.indexOf(a.id),
            d = -1 != A.indexOf(b.id),
            e = 60 > b.size;
        c && e && ++Oa;
        e || !c || d || ++Ra
    }

    function Cb(a) {
        a = ~~a;
        var b = (a % 60).toString();
        a = (~~(a / 60)).toString();
        2 > b.length && (b = "0" + b);
        return a + ":" + b
    }

    function $b() {
        if (null == w) return 0;
        for (var a = 0; a < w.length; ++a)
            if (-1 != A.indexOf(w[a].id)) return a + 1;
        return 0
    }

    function Sb() {



        e(".stats-food-eaten").text(Oa);
        e(".stats-time-alive").text(Cb((rb - qb) / 1E3));
        e(".stats-leaderboard-time").text(Cb(Sa));
        e(".stats-highest-mass").text(~~(O / 100));
        e(".stats-cells-eaten").text(Ra);
        e(".stats-top-position").text(0 == R ? ":(" : R);
        var a = document.getElementById("statsGraph");
        if (a) {
            var b = a.getContext("2d"),
                c = a.width,
                a = a.height;
            b.clearRect(0, 0, c, a);
            if (2 < z.length) {
                for (var d = 200, f = 0; f < z.length; f++) d = Math.max(z[f], d);
                b.lineWidth = 3;
                b.lineCap = "round";
                b.lineJoin = "round";
                b.strokeStyle = Pa;
                b.fillStyle = Pa;
                b.beginPath();
                b.moveTo(0, a - z[0] / d * (a - 10) + 10);
                for (f = 1; f < z.length; f += Math.max(~~(z.length / c), 1)) {
                    for (var n = f / (z.length - 1) * c, r = [], p = -20; 20 >= p; ++p) 0 > f + p || f + p >= z.length || r.push(z[f + p]);
                    r = r.reduce(function(a, b) {
                        return a + b
                    }) / r.length / d;
                    b.lineTo(n, a - r * (a - 10) + 10)
                }
                b.stroke();
                b.globalAlpha = .5;
                b.lineTo(c, a);
                b.lineTo(0, a);
                b.fill();
                b.globalAlpha = 1
            }
        }
    }
    if (!d.agarioNoInit) {

        var Za = d.location.protocol,
            lb = "https:" == Za;
        var Da, f, J, m, q, ba, chatCanvas = null,
            s = null,
            chatBoard = [],
            u = 0,
            v = 0,
            A = [],
            h = [],
            I = {},
            y = [],
            V = [],
            w = [],
            ja = 0,
            ka = 0,
            ma = -1,
            na = -1,
            Ub = 0,
            E = 0,
            Ab = 0,
            H = null,
            ta = 0,
            ua = 0,
            va = 1E4,
            wa = 1E4,
            hideChat = false,
            g = 1,

            t = null,
            Db = !0,
            Aa = !0,
            $a = !1,
            Na = !1,
            O = 0,
            xa = !1,
            hasOverlay = true,
            Eb = !1,
            fa = u = ~~((ta + va) / 2),
            ga = v = ~~((ua + wa) / 2),
            ha = 1,
            U = "",
            C = null,
            Ca = !1,
            Ma = !1,
            Ka = 0,
            La = 0,
            ra = 0,
            sa = 0,
            Fb = 0,
            Xb = ["#333333",
                "#FF3333", "#33FF33", "#3333FF"
            ],
            Ua = !1,
            ea = !1,
            ob = 0,
            D = null,
            M = 1,
            x = 1,
            S = !0,
            Ga = 0,
            Ia = {};
        (function() {
            var a = d.location.search;
            "?" == a.charAt(0) && (a = a.slice(1));
            for (var a = a.split("&"), b = 0; b < a.length; b++) {
                var c = a[b].split("=");
                Ia[c[0]] = c[1]
            }
        })();
        var bb = "ontouchstart" in d && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(d.navigator.userAgent),
            Va = new Image;
        Va.src = "img/split.png";
        var Gb = document.createElement("canvas");
        if ("undefined" == typeof console || "undefined" == typeof DataView || "undefined" == typeof WebSocket || null == Gb || null == Gb.getContext || null == d.localStorage)
            alert("You browser does not support this game, we recommend you to use Firefox to play this");
        else {
            var oa = null;
            d.setNick = function(a, mySkin, hatsa) {

                if (mySkin == "") {
                    mySkin = "0";
                }
                /*if (mySkin.includes('i.imgur.com') == false) {
                	alert("wow");
                	mySkin = "http://i.imgur.com/QsFAQso.jpg";
                }*/
                //a  = a.toLowerCase();
                a = a + "*" + mySkin + "*" + hatsa;
                kesikNick = a.split("*");




                a = a.split('Admin').join('fake_admin'); // boÅŸluk karakterini temizleme...
                a = a.split('ADMIN').join('fake_admin'); // boÅŸluk karakterini temizleme...
                a = a.split('admin').join('fake_admin'); // boÅŸluk karakterini temizleme...

                // kÃ¶tÃ¼ nick listesi
                var z = ['fuck', '', ' ', 'realadmin', 'therealadmin', 'admin', 'moderator', 'agario', 'agarioplay.org', 'agarioplay', 'server message', 'servermessage',
                    'agar.io', 'administrator', 'server', 'f u c k'
                ];
                var T = kesikNick[0];
                a = a.split(' ').join(''); // boÅŸluk karakterini temizleme...
                a = a.split('|').join('-'); // | karakterini temizleme...
                a = a.split('<').join('-'); // < karakterini temizleme...
                a = a.split('>').join('-'); // > karakterini temizleme...
                a = a.split('\'').join('-'); // ' karakterini temizleme...
                a = a.split('"').join('-'); // " karakterini temizleme...
                a = a.split('{').join(''); // " karakterini temizleme...
                a = a.split('}').join(''); // " karakterini temizleme...
                a = a.split('Admin').join('fake_admin');
                a = a.split('admın').join('fake_admin');
                a = a.split('ADMIN').join('fake_admin');
                a = a.split('admin').join('fake_admin');
                a = a.split('Admin').join('fake_admin');
                a = a.split('ADmin').join('fake_admin');
                a = a.split('ADMin').join('fake_admin');
                a = a.split('ADMIn').join('fake_admin');
                a = a.split('ADMIN').join('fake_admin');
                a = a.split('AdMiN').join('fake_admin');
                //a = a.split('agario.').join('bad nick');
                //a = a.split('www.').join('bad nick');
                //a = a.split('.cafe').join('bad nick');
                //a = a.split('.org').join('bad nick');
                //a = a.split('.biz').join('bad nick');
                //a = a.split('.ca').join('bad nick');
                //a = a.split('.net').join('bad nick');



                if (!a) {
                    alert("Please Select Nickname!");
                    return false;
                }
                hb();
                H = a;

                oyuncu_adi = H.split("*")[0];
                tb();
                O = 0


            };
            d.setHideChat = function(arg) {
                hideChat = arg;
                if (arg) {
                    e("#chat_textbox").hide();
                } else {
                    e("#chat_textbox").show();
                }
            };
            d.setHideMap = function(arg) {
                hideMap = arg;
                if (arg) {
                    e("#mini-map-wrapper").hide();
                } else {
                    e("#mini-map-wrapper").show();
                }
            };
            d.setRegion = la;
            d.setSkins = function(a) {
                Db = a
            };
            d.setNames = function(a) {
                Aa = a
            };
            d.setDarkTheme = function(a) {
                xa = a
            };
            d.setColors = function(a) {
                $a = a
            };
            d.setShowMass = function(a) {
                Eb = a
            };
            d.spectate = function() {

                H = null;
                K(1);
                hb()
                e("#mini-map-wrapper").hide();
            };
            d.setAcid = function(a) {
                Ua = a
            };
            null != d.localStorage && (null == d.localStorage.AB9 && (d.localStorage.AB9 = 0 + ~~(100 * Math.random())), Fb = +d.localStorage.AB9, d.ABGroup = Fb);
            var pa = !1,
                jb = 0;
            setTimeout(function() {
                pa = !0
            }, Math.max(6E4 * jb, 3E3));
            N = null;
            d.connect = Ha;
            var qa = 500,
                Ta = null,
                ub = 0,
                vb = -1,
                wb = -1,
                B = null,
                F = 1,
                ya = null,
                eb = function() {
                    var a = Date.now(),
                        b = 1E3 / 60;
                    return function() {
                        d.requestAnimationFrame(eb);
                        var c = Date.now(),
                            e = c - a;
                        e > b && (a = c - e % b, !Y() || 290 > Date.now() - ob ? xb() : ac())
                    }
                }(),
                Z = {},
                Hb = "".split(";"),
                bc = "".split(";"),
                $ = {};
            Wa.prototype = {
                V: null,
                x: 0,
                y: 0,
                i: 0,
                b: 0
            };
            X.prototype = {
                id: 0,
                x: 0,
                y: 0,
                size: 0,
                s: 0,
                t: 0,
                r: 0,
                J: 0,
                K: 0,
                q: 0,
                ba: 0,
                Q: 0,
                sa: 0,
                ja: 0,
                G: !1,
                h: !1,
                n: !1,
                R: !0,
                Y: 0,
                fa: null,
                X: function() {
                    var a;
                    for (a = 0; a < y.length; a++)
                        if (y[a] == this) {
                            y.splice(a, 1);
                            break
                        }
                    delete I[this.id];
                    a = h.indexOf(this); - 1 != a && (Na = !0, h.splice(a, 1));
                    a = A.indexOf(this.id); - 1 != a && A.splice(a, 1);
                    this.G = !0;
                    0 < this.Y && V.push(this)
                },
                l: function() {
                    return Math.max(~~(.3 * this.size), 24)
                },
                B: function(a) {
                    if (this.name = a) null == this.o ? this.o = new za(this.l(), "#FFFFFF", !0, "#000000") : this.o.M(this.l()), this.o.C(this.name)
                },
                W: function() {
                    for (var a = this.I(); this.a.length > a;) {
                        var b = ~~(Math.random() * this.a.length);
                        this.a.splice(b, 1)
                    }
                    for (0 == this.a.length && 0 < a && this.a.push(new Wa(this, this.x, this.y, this.size, Math.random() - .5)); this.a.length < a;) b = ~~(Math.random() *
                        this.a.length), b = this.a[b], this.a.push(new Wa(this, b.x, b.y, b.i, b.b))
                },
                I: function() {
                    var a = 10;
                    20 > this.size && (a = 0);
                    this.h && (a = 30);
                    var b = this.size;
                    this.h || (b *= g);
                    b *= F;
                    this.ba & 32 && (b *= .25);
                    return ~~Math.max(b, a)
                },
                qa: function() {
                    this.W();
                    for (var a = this.a, b = a.length, c = 0; c < b; ++c) {
                        var d = a[(c - 1 + b) % b].b,
                            e = a[(c + 1) % b].b;
                        a[c].b += (Math.random() - .5) * (this.n ? 3 : 1);
                        a[c].b *= .7;
                        10 < a[c].b && (a[c].b = 10); - 10 > a[c].b && (a[c].b = -10);
                        a[c].b = (d + e + 8 * a[c].b) / 10
                    }
                    for (var n = this, f = this.h ? 0 : (this.id / 1E3 + E / 1E4) % (2 * Math.PI), c = 0; c < b; ++c) {
                        var p = a[c].i,
                            d = a[(c - 1 + b) % b].i,
                            e = a[(c + 1) % b].i;
                        if (15 < this.size && null != ba && 20 < this.size * g && 0 < this.id) {
                            var h = !1,
                                Ja = a[c].x,
                                l = a[c].y;
                            ba.ra(Ja - 5, l - 5, 10, 10, function(a) {
                                a.V != n && 25 > (Ja - a.x) * (Ja - a.x) + (l - a.y) * (l - a.y) && (h = !0)
                            });
                            !h && (a[c].x < ta || a[c].y < ua || a[c].x > va || a[c].y > wa) && (h = !0);
                            h && (0 < a[c].b && (a[c].b = 0), a[c].b -= 1)
                        }
                        p += a[c].b;
                        0 > p && (p = 0);
                        p = this.n ? (19 * p + this.size) / 20 : (12 * p + this.size) / 13;
                        a[c].i = (d + e + 8 * p) / 10;
                        d = 2 * Math.PI / b;
                        e = this.a[c].i;
                        this.h && 0 == c % 2 && (e += 5);
                        a[c].x = this.x + Math.cos(d * c + f) * e;
                        a[c].y = this.y + Math.sin(d * c + f) * e
                    }
                },
                P: function() {
                    if (0 >= this.id) return 1;
                    var a;
                    a = (E - this.Q) / 200;
                    a = 0 > a ? 0 : 1 < a ? 1 : a;
                    var b = 0 > a ? 0 : 1 < a ? 1 : a;
                    this.l();
                    if (this.G && 1 <= b) {
                        var c = V.indexOf(this); - 1 != c && V.splice(c, 1)
                    }
                    this.x = a * (this.J - this.s) + this.s;
                    this.y = a * (this.K - this.t) + this.t;
                    this.size = a * (this.q - this.r) + this.r;
                    //this.size = b * (this.q - this.r) + this.r;
                    return b
                },
                N: function() {
                    return 0 >= this.id ? !0 : this.x + this.size + 40 < u - m / 2 / g || this.y + this.size + 40 < v - q / 2 / g || this.x - this.size - 40 > u + m / 2 /
                        g || this.y - this.size - 40 > v + q / 2 / g ? !1 : !0
                },
                w: function(a) {
                    if (this.N()) {
                        ++this.Y;
                        var b = 0 < this.id && !this.h && !this.n && .4 > g;
                        5 > this.I() && 0 < this.id && (b = !0);
                        if (this.R && !b)
                            for (var c = 0; c < this.a.length; c++) this.a[c].i = this.size;
                        this.R = b;
                        a.save();
                        this.ja = E;
                        c = this.P();
                        this.G && (a.globalAlpha *= 1 - c);
                        a.lineWidth = 10;
                        a.lineCap = "round";
                        a.lineJoin = this.h ? "miter" : "round";

                        $a ? (a.fillStyle = "#FFFFFF", a.strokeStyle = "#AAAAAA") : (a.fillStyle = this.color, a.strokeStyle = this.color);
                        if (b) a.beginPath(), a.arc(this.x, this.y, this.size + 5, 0, 2 * Math.PI, !1);
                        else {
                            this.qa();
                            a.beginPath();
                            var d = this.I();
                            a.moveTo(this.a[0].x, this.a[0].y);
                            for (c = 1; c <= d; ++c) {
                                var e = c % d;
                                a.lineTo(this.a[e].x, this.a[e].y)
                            }
                        }
                        a.closePath();

                        c = this.name.split("*");

                        if (c[1] == "") {
                            c = "";
                        } else {
                            c = c[1];
                        }

                        var rsyr = Math.floor(Math.random() * (100000000000 - 1) + 1);
                        //alert(c);
                        !this.n && Db && ":team" != U ? (d = this.fa, null == d ? d = null : ":" == d[0] ? ($.hasOwnProperty(d) || ($[d] = new Image,
                                    $[d].src = d.slice(1)),
                                d = 0 != $[d].width && $[d].complete ? $[d] : null) : d = null,
                            d || (1 != Hb.indexOf(c) ? (Z.hasOwnProperty(c) ||
                                (Z[c] = new Image,
                                    Z[c].src = "skins/" + c + ".png"),

                                d = 0 != Z[c].width && Z[c].complete ? Z[c] : null) : d = null)) : d = null;
                        e = d;
                        b || a.stroke();
                        a.fill();
                        null != e && (a.save(), a.clip(), a.drawImage(e, this.x - this.size, this.y - this.size, 2 * this.size, 2 * this.size), a.restore());
                        ($a || 15 < this.size) && !b && (a.strokeStyle = "#000000", a.globalAlpha *= .1, a.stroke());
                        a.globalAlpha = .9;
                        d = -1 != h.indexOf(this);
                        b = ~~this.y;
                        c = this.name.split("*");
                        pid = this.name.split("*")[3];
                        if (typeof h[0] !== 'undefined') {
                            if (this.id == h[0].id && (~~(this.size * this.size / 100)) < 50000 && h.length == 1) {
                                a.save();
                                var carpan = m / 2,
                                    carpan2 = q / 2;
                                    
                                var dx = ja - carpan,
                                    dy = ka - carpan2,
                                    rot = Math.atan2(dy, dx);
                                a.translate(this.x, this.y);
                                a.rotate(rot);
                                a.translate(-this.x, -this.y);
                                a.drawImage(arrow, this.x - this.size * 1.4, this.y - this.size * 1.4, 2.8 * this.size, 2.8 * this.size);
                                a.restore();
                            }
                        }
                        if (O && this.h) {
                            Va = new Image;
                         //   Va.src = 'http://agar.one/img/virus/6.png?18096891006';
							Va.src = './img/viruscow.png?';
                        }


                        if (O && this.h) {
                            a.save();
                            a.clip();
                            a.globalAlpha = .66;
                            a.drawImage(Va, this.x - this.size, this.y - this.size, 2 * this.size, 2 * this.size);
                            a.restore()
                        }

                        if (typeof this.name.split("*")[2] === "undefined") {

                        } else {

                            if (!this.extras && this.name.split("*")[2].indexOf("penguin") > -1) this.extras = "penguin";
                            if (!this.extras && this.name.split("*")[2].indexOf("irish") > -1) this.extras = "irish";
                            if (!this.extras && this.name.split("*")[2].indexOf("crown") > -1) this.extras = "crown";
                            if (!this.extras && this.name.split("*")[2].indexOf("santa") > -1) this.extras = "santa";
                            if (!this.extras && this.name.split("*")[2].indexOf("cat") > -1) this.extras = "cat";
                            if (!this.extras && this.name.split("*")[2].indexOf("fancy") > -1) this.extras = "fancy";
                            if (!this.extras && this.name.split("*")[2].indexOf("poke") > -1) this.extras = "poke";
                            if (!this.extras && this.name.split("*")[2].indexOf("r2d2") > -1) this.extras = "r2d2";
                            if (!this.extras && this.name.split("*")[2].indexOf("poop") > -1) this.extras = "poop";
                            if (!this.extras && this.name.split("*")[2].indexOf("crown2") > -1) this.extras = "crown2";
                            if (!this.extras && this.name.split("*")[2].indexOf("viking2") > -1) this.extras = "viking2";
                            if (!this.extras && this.name.split("*")[2].indexOf("blue") > -1) this.extras = "blue";
                            if (this.extras && this.size > 55) {
                                if (!hats[this.extras]) return;
                                a.save();
                                a.globalAlpha = .9;
                                a.drawImage(hats[this.extras], this.x - this.size, this.y - this.size - this.size * 1.66, 2 * this.size, 2 * this.size);
                                a.restore();
                            }
                        }
						if (this.size < 55) {
						 //a.drawImage(blobImage,this.x- this.size,this.y- this.size,2*this.size,2*this.size);
						}

                        if (0 != this.id && (Aa || d) && this.name && this.o && (null == e || -1 == bc.indexOf(c))) {

                            e = this.o;
                            e.C(this.name.split("*")[0]);
                            e.M(this.l());
                            c = 0 >= this.id ? 1 : Math.ceil(10 * g) / 10;
                            e.ea(c);
                            var e = e.L(),
                                n = ~~(e.width / c),
                                f = ~~(e.height / c);
                            a.drawImage(e, ~~this.x - ~~(n / 2), b - ~~(f / 2), n, f);
                            b += e.height / 2 / c + 4
                        }
                        0 < this.id && Eb && (d || 0 == h.length && (!this.h || this.n) && 20 < this.size) && (null == this.O && (this.O = new za(this.l() / 2, "#FFFFFF", !0,
                            "#000000")), d = this.O, d.M(this.l() / 2), d.C(~~(this.size * this.size / 100)), c = Math.ceil(10 * g) / 10, d.ea(c), e = d.L(), n = ~~(e.width /
                            c), f = ~~(e.height / c), a.drawImage(e, ~~this.x - ~~(n / 2), b - ~~(f / 2), n, f));
                        a.restore()

                    }
                }
            };
            za.prototype = {
                F: "",
                S: "#000000",
                U: !1,
                v: "#000000",
                u: 16,
                p: null,
                T: null,
                k: !1,
                D: 1,
                _value: "",
                _dirty: false,
                M: function(a) {
                    this.u != a && (this.u = a, this.k = !0)
                },
                ea: function(a) {
                    this.D != a && (this.D = a, this.k = !0)
                },
                setStrokeColor: function(a) {
                    this.v != a && (this.v = a, this.k = !0)
                },
                C: function(a) {
                    a != this.F && (this.F = a, this.k = !0)
                },
                getWidth: function() {
                    return (f.measureText(this.F).width + 6);
                },
                L: function() {
                    null == this.p && (this.p = document.createElement("canvas"), this.T = this.p.getContext("2d"));
                    if (this.k) {
                        this.k = !1;
                        var a = this.p,
                            b = this.T,
                            c = this.F,
                            d = this.D,
                            e = this.u,
                            f = e + "px Ubuntu";
                        b.font = f;
                        var r = ~~(.2 * e);
                        a.width = (b.measureText(c).width + 6) * d;
                        a.height = (e + r) * d;
                        b.font = f;
                        b.scale(d, d);
                        b.globalAlpha = 1;
                        b.lineWidth = 3;
                        b.strokeStyle = this.v;
                        b.fillStyle = this.S;
                        this.U && b.strokeText(c, 3, e - r / 2);
                        b.fillText(c, 3, e - r / 2)
                    }

                    return this.p
                }
            };
            Date.now || (Date.now = function() {
                return (new Date).getTime()
            });
            (function() {
                for (var a = ["ms", "moz", "webkit", "o"], b = 0; b < a.length && !d.requestAnimationFrame; ++b) d.requestAnimationFrame = d[a[b] +
                        "RequestAnimationFrame"],
                    d.cancelAnimationFrame = d[a[b] + "CancelAnimationFrame"] || d[a[b] + "CancelRequestAnimationFrame"];
                d.requestAnimationFrame || (d.requestAnimationFrame = function(a) {
                    return setTimeout(a, 1E3 / 60)
                }, d.cancelAnimationFrame = function(a) {
                    clearTimeout(a)
                })
            })();
            var Kb = {
                la: function(a) {
                    function b(a, b, c, d, e) {
                        this.x = a;
                        this.y = b;
                        this.j = c;
                        this.g = d;
                        this.depth = e;
                        this.items = [];
                        this.c = []
                    }
                    var c = a.ma || 2,
                        d = a.na || 4;
                    b.prototype = {
                        x: 0,
                        y: 0,
                        j: 0,
                        g: 0,
                        depth: 0,
                        items: null,
                        c: null,
                        H: function(a) {
                            for (var b = 0; b < this.items.length; ++b) {
                                var c = this.items[b];
                                if (c.x >= a.x && c.y >= a.y && c.x < a.x + a.j && c.y < a.y + a.g) return !0
                            }
                            if (0 != this.c.length) {
                                var d = this;
                                return this.$(a, function(b) {
                                    return d.c[b].H(a)
                                })
                            }
                            return !1
                        },
                        A: function(a, b) {
                            for (var c = 0; c < this.items.length; ++c) b(this.items[c]);
                            if (0 != this.c.length) {
                                var d = this;
                                this.$(a, function(c) {
                                    d.c[c].A(a, b)
                                })
                            }
                        },
                        m: function(a) {
                            0 != this.c.length ? this.c[this.Z(a)].m(a) : this.items.length >= c && this.depth < d ? (this.ia(), this.c[this.Z(a)].m(a)) : this.items.push(a)
                        },
                        Z: function(a) {
                            return a.x < this.x + this.j / 2 ? a.y < this.y + this.g / 2 ? 0 : 2 : a.y < this.y + this.g / 2 ? 1 : 3
                        },
                        $: function(a, b) {
                            return a.x < this.x + this.j / 2 && (a.y < this.y + this.g / 2 && b(0) || a.y >= this.y + this.g / 2 && b(2)) || a.x >= this.x + this.j / 2 && (a.y <
                                this.y + this.g / 2 && b(1) || a.y >= this.y + this.g / 2 && b(3)) ? !0 : !1
                        },
                        ia: function() {
                            var a = this.depth + 1,
                                c = this.j / 2,
                                d = this.g / 2;
                            this.c.push(new b(this.x, this.y, c, d, a));
                            this.c.push(new b(this.x + c, this.y, c, d, a));
                            this.c.push(new b(this.x, this.y + d, c, d, a));
                            this.c.push(new b(this.x + c, this.y + d, c, d, a));
                            a = this.items;
                            this.items = [];
                            for (c = 0; c < a.length; c++) this.m(a[c])
                        },
                        clear: function() {
                            for (var a = 0; a < this.c.length; a++) this.c[a].clear();
                            this.items.length = 0;
                            this.c.length = 0
                        }
                    };
                    var e = {
                        x: 0,
                        y: 0,
                        j: 0,
                        g: 0
                    };
                    return {
                        root: new b(a.ca, a.da, a.oa - a.ca, a.pa - a.da, 0),
                        m: function(a) {
                            this.root.m(a)
                        },
                        A: function(a, b) {
                            this.root.A(a, b)
                        },
                        ra: function(a, b, c, d, f) {
                            e.x = a;
                            e.y = b;
                            e.j = c;
                            e.g = d;
                            this.root.A(e, f)
                        },
                        H: function(a) {
                            return this.root.H(a)
                        },
                        clear: function() {
                            this.root.clear()
                        }
                    }
                }
            };
            var ac = function() {
                function a(a, b, c, d, e) {
                    var f = b.getContext("2d"),
                        g = b.width;
                    b = b.height;
                    a.color = e;
                    a.B(c);
                    a.size = d;
                    f.save();
                    f.translate(g / 2, b / 2);
                    a.w(f);
                    f.restore()
                }
                for (var b = new X(-1, 0, 0, 32, "#5bc0de", ""), c = new X(-1, 0, 0, 32, "#5bc0de", ""), d =
                        "#0791ff #5a07ff #ff07fe #ffa507 #ff0774 #077fff #3aff07 #ff07ed #07a8ff #ff076e #3fff07 #ff0734 #07ff20 #ff07a2 #ff8207 #07ff0e".split(" "),
                        f = [], g = 0; g < d.length; ++g) {
                    var h = g / d.length * 12,
                        p = 30 * Math.sqrt(g / d.length);
                    f.push(new X(-1, Math.cos(h) * p, Math.sin(h) * p, 10, d[g], ""))
                }
                Yb(f);
                var m = document.createElement("canvas");
                m.getContext("2d");
                m.width = m.height = 70;
                a(c, m, "", 26, "#ebc0de");
                return function() {
                    e(".cell-spinner").filter(":visible").each(function() {
                        var c = e(this),
                            d = Date.now(),
                            f = this.width,
                            g = this.height,
                            h = this.getContext("2d");
                        h.clearRect(0, 0, f, g);
                        h.save();
                        h.translate(f / 2, g / 2);
                        for (var k = 0; 10 > k; ++k) h.drawImage(m, (.1 * d + 80 * k) % (f + 140) - f / 2 - 70 - 35,
                            g / 2 * Math.sin((.001 * d + k) % Math.PI * 2) - 35, 70, 70);
                        h.restore();
                        (c = c.attr("data-itr")) && (c = da(c));
                        a(b, this, c || "", +e(this).attr("data-size"), "#5bc0de")
                    });
                    e("#statsPellets").filter(":visible").each(function() {
                        e(this);
                        var b = this.width,
                            c = this.height;
                        this.getContext("2d").clearRect(0, 0, b, c);
                        for (b = 0; b < f.length; b++) a(f[b], this, "", f[b].size, f[b].color)
                    })
                }
            }();
            var z = [],
                Oa = 0,
                Pa = "#000000",
                T = !1,
                Qa = !1,
                qb = 0,
                rb = 0,
                Sa = 0,
                Ra = 0,
                R = 0,
                sb = !0;
            setInterval(function() {
                Qa && z.push(zb() / 100)
            }, 1E3 / 60);
            setInterval(function() {
                if (Y()) {
                    var a = P(5);
                    a.setUint8(0, 90);
                    a.setUint32(1, 1441210800, !0);
                    latency = new Date;
                    Q(a)
                }
            }, 1000);
            setInterval(function() {
                var a = $b();
                0 != a && (++Sa, 0 == R && (R = a), R = Math.min(R, a))
            }, 1E3);
            d.closeStats = function() {
                T = !1;
                e("#stats").hide();
                Fa(0)
            };
            d.setSkipStats = function(a) {
                sb = !a
            };

            e(function() {
                e(Ib)
            })
        }
    }
})(window, window.jQuery);

$(document).ready(function() {
    $('#chat_textbox').bind("cut copy", function(e) {
        e.preventDefault();
    });

});


function clickIE4() {
    if (event.button == 2) {

        return false;
    }
}

function clickNS4(e) {
    if (document.layers || document.getElementById && !document.all) {
        if (e.which == 2 || e.which == 3) {
            //alert(message);
            return false;
        }
    }
}

if (document.layers) {
    document.captureEvents(Event.MOUSEDOWN);
    document.onmousedown = clickNS4;
} else if (document.all && !document.getElementById) {
    document.onmousedown = clickIE4;
}

document.oncontextmenu = new Function("return false")
logincheck();
$(function () {
  $('[data-tooltip="tooltip"]').tooltip()
})