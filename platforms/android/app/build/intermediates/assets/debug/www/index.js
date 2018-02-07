var app = {
    initialize: function () {
        console.error = window.onerror = function () {
            if (JSON.stringify(arguments).indexOf('iosrtc') !== -1) {
                return;
            }

            if (JSON.stringify(arguments).indexOf('No Content-Security-Policy') !== -1) {
                return;
            }

            if (JSON.stringify(arguments).indexOf('<') !== -1) {
                return;
            }

            alert(JSON.stringify(arguments, null, ' '));
        };

        app.bindEvents();
    },

    bindEvents: function () {
        //        document.addEventListener('deviceready', app.onDeviceReady, false);
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },
    checkAndroidPermissions: function (callback) {
        if (device.platform !== 'Android') {
            callback();
            return;
        }

        var permissions = cordova.plugins.permissions;

        var arr = [
            permissions.CAMERA,
            permissions.RECORD_AUDIO,
            permissions.MODIFY_AUDIO_SETTINGS
        ];

        permissions.hasPermission(arr, function (status) {
            if (status.hasPermission) {
                callback();
                return;
            }

            permissions.requestPermissions(arr, function (status) {
                if (status.hasPermission) {
                    callback();
                    return;
                }
                alert('Please manually enable camera and microphone permissions.');
            }, function () {
                alert('Please manually enable camera and microphone permissions.');
            });
        }, function () {
            alert('Please manually enable camera and microphone permissions.');
        });
    },

    onDeviceReady: function () {
        this.receivedEvent('deviceready');
        // ......................................................
        // .......................UI Code........................
        // ......................................................
        
        document.getElementById('join-room').onclick = function () {
            disableInputButtons();
            connection.join(document.getElementById('room-id').value);
        };
        document.getElementById('open-or-join-room').onclick = function () {
            disableInputButtons();
            app.checkAndroidPermissions(function () {
                connection.openOrJoin(document.getElementById('room-id').value, function (isRoomExist, roomid) {
                    showRoomURL(roomid);
                });
            });
        };
        
        document.getElementById('btn-leave-room').onclick = function () {
            this.disabled = true;
            if (connection.isInitiator) {
                // use this method if you did NOT set "autoCloseEntireSession===true"
                // for more info: https://github.com/muaz-khan/RTCMultiConnection#closeentiresession
                connection.closeEntireSession(function () {
                    document.querySelector('h1').innerHTML = 'Entire session has been closed.';
                });
            } else {
                connection.leave();
            }
        };
        
        // ......................................................
        // ................FileSharing/TextChat Code.............
        // ......................................................
    
        document.getElementById('input-chat').onkeyup = function (e) {
            if (e.keyCode != 13) return;
            // removing trailing/leading whitespace
            this.value = this.value.replace(/^\s+|\s+$/g, '');
            if (!this.value.length) return;
            connection.send(this.value);
            appendDIV(this.value);
            this.value = '';
        };
        var chatContainer = document.querySelector('.chat-content');

        function appendDIV(event) {
            var div = document.createElement('div');
            div.innerHTML = event.data || event;
            chatContainer.insertBefore(div, chatContainer.firstChild);
            div.tabIndex = 0;
            div.focus();
            document.getElementById('input-chat').focus();
        }
        
        // ......................................................
        // ..................RTCMultiConnection Code.............
        // ......................................................

        var connection = new RTCMultiConnection();

        connection.onMediaError = function (error, constraints) {
            alert(JSON.stringify(error, null, ' '));
        };

        // http://www.rtcmulticonnection.org/docs/socketURL/
        //        connection.socketURL = 'https://192.168.8.100:9001/';
        connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

        connection.socketMessageEvent = 'audio-video-file-chat-demo';
        
        connection.enableFileSharing = false; // by default, it is "false".

        connection.session = {
            audio: true,
            video: false,
            data: true
        };

        connection.mediaConstraints = {
            audio: true,
            video: false
        };

        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: false
        };

        connection.audiosContainer = document.getElementById('audios-container');
        connection.onstream = function (event) {
            var width = parseInt(connection.audiosContainer.clientWidth / 2) - 20;
            var mediaElement = getHTMLMediaElement(event.mediaElement, {
                title: event.userid,
                buttons: ['full-screen'],
                width: width,
                showOnMouseEnter: false
            });
            connection.audiosContainer.appendChild(mediaElement);
            setTimeout(function () {
                mediaElement.media.play();
            }, 5000);
            mediaElement.id = event.streamid;
        };
        connection.onstreamended = function (event) {
            var mediaElement = document.getElementById(event.streamid);
            if (mediaElement) {
                mediaElement.parentNode.removeChild(mediaElement);
            }
        };
        
        connection.onmessage = appendDIV;
//        connection.filesContainer = document.getElementById('file-container');
        connection.onopen = function () {
//            document.getElementById('share-file').disabled = false;
            document.getElementById('input-chat').disabled = false;
            document.getElementById('btn-leave-room').disabled = false;
            document.querySelector('h1').innerHTML = 'You are connected with: ' + connection.getAllParticipants().join(', ');
        };
        connection.onclose = function () {
            if (connection.getAllParticipants().length) {
                document.querySelector('h1').innerHTML = 'You are still connected with: ' + connection.getAllParticipants().join(', ');
            } else {
                document.querySelector('h1').innerHTML = 'Seems session has been closed or all participants left.';
            }
        };
        
        connection.onEntireSessionClosed = function (event) {
//                document.getElementById('share-file').disabled = true;
                document.getElementById('input-chat').disabled = true;
                document.getElementById('btn-leave-room').disabled = true;
                document.getElementById('open-or-join-room').disabled = false;
//                document.getElementById('open-room').disabled = false;
                document.getElementById('join-room').disabled = false;
                document.getElementById('room-id').disabled = false;
                connection.attachStreams.forEach(function (stream) {
                    stream.stop();
                });
            // don't display alert for moderator
            if (connection.userid === event.userid) return;
            document.querySelector('h1').innerHTML = 'Entire session has been closed by the moderator: ' + event.userid;
            };
            connection.onUserIdAlreadyTaken = function (useridAlreadyTaken, yourNewUserId) {
                // seems room is already opened
                connection.join(useridAlreadyTaken);
            };

                function disableInputButtons() {
                    document.getElementById('open-or-join-room').disabled = true;
                    document.getElementById('room-id').disabled = true;
                    document.getElementById('join-room').disabled = true;
                    
                };
        // ......................................................
        // ......................Handling Room-ID................
        // ......................................................
        function showRoomURL(roomid) {
            var roomHashURL = '#' + roomid;
            var roomQueryStringURL = '?roomid=' + roomid;
            var html = '<h2>Unique URL for your room:</h2><br>';
            html += 'Hash URL: <a href="' + roomHashURL + '" target="_blank">' + roomHashURL + '</a>';
            html += '<br>';
            html += 'QueryString URL: <a href="' + roomQueryStringURL + '" target="_blank">' + roomQueryStringURL + '</a>';
            var roomURLsDiv = document.getElementById('room-urls');
            roomURLsDiv.innerHTML = html;
            roomURLsDiv.style.display = 'block';
        }
        (function () {
            var params = {},
                r = /([^&=]+)=?([^&]*)/g;

            function d(s) {
                return decodeURIComponent(s.replace(/\+/g, ' '));
            }
            var match, search = window.location.search;
            while (match = r.exec(search.substring(1)))
                params[d(match[1])] = d(match[2]);
            window.params = params;
        })();
        var roomid = '';
        if (localStorage.getItem(connection.socketMessageEvent)) {
            roomid = localStorage.getItem(connection.socketMessageEvent);
        } else {
            roomid = connection.token();
        }
        document.getElementById('room-id').value = roomid;
        document.getElementById('room-id').onkeyup = function () {
            localStorage.setItem(connection.socketMessageEvent, this.value);
        };
        var hashString = location.hash.replace('#', '');
        if (hashString.length && hashString.indexOf('comment-') == 0) {
            hashString = '';
        }
        var roomid = params.roomid;
        if (!roomid && hashString.length) {
            roomid = hashString;
        }
        if (roomid && roomid.length) {
            document.getElementById('room-id').value = roomid;
            localStorage.setItem(connection.socketMessageEvent, roomid);
            // auto-join-room
            (function reCheckRoomPresence() {
                connection.checkPresence(roomid, function (isRoomExist) {
                    if (isRoomExist) {
                        connection.join(roomid);
                        return;
                    }
                    setTimeout(reCheckRoomPresence, 5000);
                });
            })();
            disableInputButtons();

            //        function showRoomURL(roomid) {
            //            var roomHashURL = '#' + roomid;
            //            var html = '<h2>Unique URL for your room:</h2><br>';
            //            html += '<br>';
            //            html += '<ons-button id="callbtnend" onclick="javascript:closeEverything();location.reload();">Disconnect</ons-button>';
            //
            //            var roomURLsDiv = document.getElementById('room-urls');
            //            roomURLsDiv.innerHTML = html;
            //            roomURLsDiv.style.display = 'block';
            //        }
            //
            //        (function () {
            //            var params = {},
            //                r = /([^&=]+)=?([^&]*)/g;
            //
            //            function d(s) {
            //                return decodeURIComponent(s.replace(/\+/g, ' '));
            //            }
            //            var match, search = window.location.search;
            //            while (match = r.exec(search.substring(1)))
            //                params[d(match[1])] = d(match[2]);
            //            window.params = params;
            //        })();
            //        var roomid = '';
            //        if (localStorage.getItem(connection.socketMessageEvent)) {
            //            roomid = localStorage.getItem(connection.socketMessageEvent);
            //        } else {
            //            roomid = connection.token();
            //        }
            //        document.getElementById('room-id').value = roomid;
            //        document.getElementById('room-id').onkeyup = function () {
            //            localStorage.setItem(connection.socketMessageEvent, this.value);
            //        };
            //        var hashString = location.hash.replace('#', '');
            //        if (hashString.length && hashString.indexOf('comment-') == 0) {
            //            hashString = '';
            //        }
            //        var roomid = params.roomid;
            //        if (!roomid && hashString.length) {
            //            roomid = hashString;
            //        }
            //        if (roomid && roomid.length) {
            //            document.getElementById('room-id').value = roomid;
            //            localStorage.setItem(connection.socketMessageEvent, roomid);
            //            // auto-join-room
            //            (function reCheckRoomPresence() {
            //                connection.checkPresence(roomid, function (isRoomExist) {
            //                    if (isRoomExist) {
            //                        connection.join(roomid);
            //                        return;
            //                    }
            //                    setTimeout(reCheckRoomPresence, 5000);
            //                });
            //            })();
            //            disableInputButtons();
            //        }
            //
            //        function removeStreamById(key) {
            //            var event = connection.streamEvents[key];
            //            var div = document.getElementById(key);
            //            if (!div) return;
            //            var video = div.querySelector('video');
            //            if (!video) return;
            //            video.src = null;
            //
            //            div.parentNode.removeChild(div);
            //        }
            //
            //        window.closeEverything = function () {
            //            Object.keys(connection.streamEvents).forEach(function (key) {
            //                removeStreamById(key);
            //            });
            //
            //            connection.close();
            //            connection.closeSocket();
            //            connection.videosContainer.innerHTML = '';
        };

    },
    receivedEvent: function (id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);

    }
};

app.initialize();
