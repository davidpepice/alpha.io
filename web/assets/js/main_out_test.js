(function() {
    "use strict";
    if (typeof WebSocket === 'undefined' || typeof DataView === 'undefined' ||
        typeof ArrayBuffer === 'undefined' || typeof Uint8Array === 'undefined') {
        alert('Your browser does not support required features, please update your browser or get a new one.');
        window.stop();
    }

    function byId(id) {return document.getElementById(id);}
    function byClass(clss, parent) {return (parent || document).getElementsByClassName(clss);}


    function init() {
        var mainCanvas = document.getElementById("canvas");
        var mainCtx = mainCanvas.getContext("2d");
        var chatBox = byId("chat_textbox");
        var soundsVolume = byId("soundsVolume");
        mainCanvas.focus();

        //loadSettings();
        window.addEventListener("beforeunload", storeSettings);
        document.addEventListener("wheel", handleScroll, {passive: true});
        byId("play-btn").addEventListener("click", function() {
            if (settings.skin) {
                sendPlay("{" + settings.skin + "}" + settings.nick);
            } else {
                sendPlay(settings.nick);
            }
            hideESCOverlay();
            
        });
        window.onkeydown = keydown;
        window.onkeyup = keyup;
        chatBox.onblur = function() {
            isTyping = false;
            drawChat();
        };
        chatBox.onfocus = function() {
            isTyping = true;
            drawChat();
        };
        mainCanvas.onmousemove = function(event) {
            mouseX = event.clientX;
            mouseY = event.clientY;
        };
        setInterval(function() {
            sendMouseMove(
                (mouseX - mainCanvas.width / 2) / camera.scale + camera.x,
                (mouseY - mainCanvas.height / 2) / camera.scale + camera.y
            );
        }, 40);
        window.onresize = function() {
            var width = mainCanvas.width = window.innerWidth;
            var height = mainCanvas.height = window.innerHeight;
            camera.viewportScale = Math.max(width / 1920, height / 1080);
        };
        window.onresize(); 
        var mobileStuff = byId("mobileStuff");
        var touchpad = byId("touchpad");
        var touchCircle = byId("touchCircle");
        var touchSize = .2;
        var touched = false;
        var touchmove = function(event) {
            var touch = event.touches[0];
            var width = innerWidth * touchSize;
            var height = innerHeight * touchSize;
            if (touch.pageX < width && touch.pageY > innerHeight - height) {
                mouseX = innerWidth / 2 + (touch.pageX - width / 2) * innerWidth / width;
                mouseY = innerHeight / 2 + (touch.pageY - (innerHeight - height / 2)) * innerHeight / height;
            } else {
                mouseX = touch.pageX;
                mouseY = touch.pageY;
            }
            var r = innerWidth * .02;
            touchCircle.style.left = mouseX - r + "px";
            touchCircle.style.top = mouseY - r + "px";
        };
        window.addEventListener("touchmove", touchmove);
        window.addEventListener("touchstart", function(event) {
            if (!touched) {
                touched = true;
                mobileStuff.show();
            }
            if (event.target.id == "splitBtn") {
                wsSend(UINT8_CACHE[17]);
            } else if (event.target.id == "ejectBtn") {
                wsSend(UINT8_CACHE[21]);
            } else {
                touchmove(event);
            }
            touchCircle.show();
        });
        window.addEventListener("touchend", function(event) {
            if (event.touches.length === 0) {
                touchCircle.hide();
            }
        });

        gameReset();
        showESCOverlay();

        var regex = /ip=([\w\W]+:[0-9]+)/;
        var args = window.location.search;
        var div;
        if (args && (div = regex.exec(args.slice(1)))) {
            window.setserver(div[1]);
        } else window.setserver(byId("gamemode").value);

        drawGame();
        log.info("init done in " + (Date.now() - LOAD_START) + "ms");
    }
    window.setserver = function(url) {
        if (url == wsUrl && ws && ws.readyState <= WebSocket.OPEN) return;
        wsInit(url);
    };

 window.addEventListener("DOMContentLoaded", init);
})();