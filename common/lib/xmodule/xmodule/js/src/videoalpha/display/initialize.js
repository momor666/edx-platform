/**
 * @file Initialize module works with the JSON config, and sets up various settings, parameters,
 * variables. After all setup actions are performed, it invokes the video player to play the
 * specified video. This module must be invoked first. It provides several functions which do not
 * fit in with other modules.
 *
 * @external VideoPlayer
 *
 * @module Initialize
 */

(function (requirejs, require, define) {

define(
'videoalpha/display/initialize.js',
['videoalpha/display/video_player.js'],
function (VideoPlayer) {

    /**
     * @function
     *
     * Initialize module exports this function.
     *
     * @param {Object} state A place for all properties, and methods of Video Alpha.
     * @param {DOM element} element Container of the entire Video Alpha DOM element.
     */
    return function (state, element) {
        checkForNativeFunctions();
        makeFunctionsPublic(state);
        renderElements(state, element);
    };

    // ***************************************************************
    // Private functions start here.
    // ***************************************************************

    /**
     * @function makeFunctionsPublic
     *
     * Functions which will be accessible via 'state' object. When called, these functions will get the 'state'
     * object as a context.
     *
     * @param {Object} state A place for all properties, and methods of Video Alpha.
     */
    function makeFunctionsPublic(state) {
        state.setSpeed    = setSpeed.bind(state);
        state.youtubeId   = youtubeId.bind(state);
        state.getDuration = getDuration.bind(state);
        state.trigger     = trigger.bind(state);
    }

    // function renderElements(state)
    //
    //     Create any necessary DOM elements, attach them, and set their initial configuration. Also
    //     make the created DOM elements available via the 'state' object. Much easier to work this
    //     way - you don't have to do repeated jQuery element selects.
    function renderElements(state, element) {
        var onPlayerReadyFunc;

        // The parent element of the video, and the ID.
        state.el = $(element).find('.videoalpha');
        state.id = state.el.attr('id').replace(/video_/, '');

        // We store all settings passed to us by the server in one place. These are "read only", so don't
        // modify them. All variable content lives in 'state' object.
        state.config = {
            'element': element,

            'start':              state.el.data('start'),
            'end':                state.el.data('end'),

            'caption_data_dir':   state.el.data('caption-data-dir'),
            'caption_asset_path': state.el.data('caption-asset-path'),
            'show_captions':      (state.el.data('show-captions').toString().toLowerCase === 'true'),
            'youtubeStreams':     state.el.data('streams'),

            'sub':                state.el.data('sub'),
            'mp4Source':          state.el.data('mp4-source'),
            'webmSource':         state.el.data('webm-source'),
            'oggSource':          state.el.data('ogg-source')
        };

        // Try to parse YouTube stream ID's. If
        if (parseYoutubeStreams(state, state.config.youtubeStreams)) {
            state.videoType = 'youtube';

            fetchMetadata(state);
            parseSpeed(state);
        }

        // If we do not have YouTube ID's, try parsing HTML5 video sources.
        else {
            state.videoType = 'html5';

            parseVideoSources(
                state,
                {
                    'mp4': state.config.mp4Source,
                    'webm': state.config.webmSource,
                    'ogg': state.config.oggSource
                }
            );

            if (!state.config.sub.length) {
                state.config.sub = '';
                state.config.show_captions = false;
            }

            state.speeds = ['0.75', '1.0', '1.25', '1.50'];
            state.videos = {
                '0.75': state.config.sub,
                '1.0':  state.config.sub,
                '1.25': state.config.sub,
                '1.5':  state.config.sub
            };

            state.setSpeed($.cookie('video_speed'));
        }

        // Configure displaying of captions.
        //
        // Option
        //
        //     state.config.show_captions = true | false
        //
        // defines whether to turn off/on the captions altogether. User will not have the ability to turn them on/off.
        //
        // Option
        //
        //     state.hide_captions = true | false
        //
        // represents the user's choice of having the subtitles shown or hidden. This choice is stored in cookies.
        if (state.config.show_captions) {
            state.hide_captions = ($.cookie('hide_captions') === 'true');
        } else {
            state.hide_captions = true;

            $.cookie('hide_captions', state.hide_captions, {
                'expires': 3650,
                'path': '/'
            });

            state.el.addClass('closed');
        }

        // By default we will be forcing HTML5 player mode. Only in the case when, after initializtion, we will
        // get one available playback rate, we will change to Flash player mode. There is a need to store this
        // setting in cookies because otherwise we will have to change from HTML5 to Flash on every page load
        // in a browser that doesn't fully support HTML5. When we have this setting in cookies, we can select
        // the proper mode from the start (not having to change mode later on).
        (function (currentPlayerMode) {
            if ((currentPlayerMode !== 'html5') && (currentPlayerMode !== 'flash')) {
                $.cookie('current_player_mode', 'html5', {
                    'expires': 3650,
                    'path': '/'
                });
                state.currentPlayerMode = 'html5';
            } else  {
                state.currentPlayerMode = currentPlayerMode;
            }
        }($.cookie('current_player_mode')));

        // Possible value are: 'visible', 'hiding', and 'invisible'.
        state.controlState = 'visible';
        state.controlHideTimeout = null;
        state.captionState = 'visible';
        state.captionHideTimeout = null;

        // Launch embedding of actual video content, or set it up so that it will be done as soon as the
        // appropriate video player (YouTube or stand alone HTML5) is loaded, and can handle embedding.
        //
        // Note that the loading of stand alone HTML5 player API is handled by Require JS. At the time
        // when we reach this code, the stand alone HTML5 player is already loaded, so no further testing
        // in that case is required.
        if (
            ((state.videoType === 'youtube') && (window.YT) && (window.YT.Player)) ||
            (state.videoType === 'html5')
        ) {
            VideoPlayer(state);
        } else {
            onPlayerReadyFunc = (state.videoType === 'youtube') ? 'onYouTubePlayerAPIReady' : 'onHTML5PlayerAPIReady';
            window[onPlayerReadyFunc] = VideoPlayer.bind(window, state);
        }
    }

    // function parseYoutubeStreams(state, youtubeStreams)
    //
    //     Take a string in the form:
    //         "iCawTYPtehk:0.75,KgpclqP-LBA:1.0,9-2670d5nvU:1.5"
    //     parse it, and make it available via the 'state' object. If we are not given a string, or
    //     it's length is zero, then we return false.
    //
    //     @return
    //         false: We don't have YouTube video IDs to work with; most likely we have HTML5 video sources.
    //         true: Parsing of YouTube video IDs went OK, and we can proceed onwards to play YouTube videos.


    function parseYoutubeStreams(state, youtubeStreams) {
        if (!youtubeStreams.length) {
            return false;
        }

        state.videos = {};

        $.each(youtubeStreams.split(/,/), function(index, video) {
            var speed;

            video = video.split(/:/);
            speed = parseFloat(video[0]).toFixed(2).replace(/\.00$/, '.0');

            state.videos[speed] = video[1];
        });

        return true;
    }

    // function parseVideoSources(state, mp4Source, webmSource, oggSource)
    //
    //     Take the HTML5 sources (URLs of videos), and make them available explictly for each type
    //     of video format (mp4, webm, ogg).
    function parseVideoSources(state, sources) {
        state.html5Sources = { 'mp4': null, 'webm': null, 'ogg': null };

        $.each(sources, function (name, source) {
            if (source.length) {
                state.html5Sources[name] = source;
            }
        });
    }

    // function fetchMetadata(state)
    //
    //     When dealing with YouTube videos, we must fetch meta data that has certain key facts
    //     not available while the video is loading. For example the length of the video can be
    //     determined from the meta data.
    function fetchMetadata(state) {
        state.metadata = {};

        $.each(state.videos, function (speed, url) {
            $.get('https://gdata.youtube.com/feeds/api/videos/' + url + '?v=2&alt=jsonc', (function(data) {
                state.metadata[data.data.id] = data.data;
            }), 'jsonp');
        });
    }

    // function parseSpeed(state)
    //
    //     Create a separate array of available speeds.
    function parseSpeed(state) {
        state.speeds = ($.map(state.videos, function(url, speed) {
            return speed;
        })).sort();

        state.setSpeed($.cookie('video_speed'));
    }

    function checkForNativeFunctions() {
        // The bind function is a recent addition to ECMA-262, 5th edition; as such it may not be present in all
        // browsers. You can partially work around this by inserting the following code at the beginning of your
        // scripts, allowing use of much of the functionality of bind() in implementations that do not natively support
        // it.
        //
        // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind
        if (!Function.prototype.bind) {
            Function.prototype.bind = function (oThis) {
                var aArgs, fToBind, fNOP, fBound;

                if (typeof this !== 'function') {
                    // closest thing possible to the ECMAScript 5 internal IsCallable function
                    throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
                }

                aArgs = Array.prototype.slice.call(arguments, 1);
                fToBind = this;
                fNOP = function () {};
                fBound = function () {
                    return fToBind.apply(
                        this instanceof fNOP && oThis ? this : oThis,
                        aArgs.concat(Array.prototype.slice.call(arguments))
                    );
                };

                fNOP.prototype = this.prototype;
                fBound.prototype = new fNOP();

                return fBound;
            };
        }
    }

    // ***************************************************************
    // Public functions start here.
    // These are available via the 'state' object. Their context ('this' keyword) is the 'state' object.
    // The magic private function that makes them available and sets up their context is makeFunctionsPublic().
    // ***************************************************************

    function setSpeed(newSpeed, updateCookie) {
        if (this.speeds.indexOf(newSpeed) !== -1) {
            this.speed = newSpeed;
        } else {
            this.speed = '1.0';
        }

        if (updateCookie) {
            $.cookie('video_speed', this.speed, {
                'expires': 3650,
                'path': '/'
            });
        }
    }

    function youtubeId(speed) {
        return this.videos[speed || this.speed];
    }

    function getDuration() {
        return this.metadata[this.youtubeId()].duration;
    }

    /* he function .trigger() expects the parameter @callType one of
     *
     *     'event'
     *     'method'
     *
     *  The default value (if @callType and @eventName are not specified) is 'method'. Based on this parameter, this
     *  function can be used in two ways.
     *
     *
     *
     * First use: A safe way to trigger jQuery events.
     * -----------------------------------------------
     *
     * @callType === 'event'
     *
     * Because jQuery events can be triggered on some jQuery object, we must make sure that
     * we don't trigger an event on an undefined object. For this we will have an in-between
     * method that will check for the existance of an object before triggering an event on it.
     *
     * @objChain is an array that contains the chain of properties on the 'state' object. For
     * example, if
     *
     *     objChain = ['videoPlayer', 'stopVideo'];
     *
     * then we will check for the existance of the
     *
     *     state.videoPlayer.stopVideo
     *
     * object, and, if found to be present, will trigger the specified event on this object.
     *
     * @eventName is a string the name of the event to trigger on the specified object.
     *
     * @extraParameters is an object or an array that should be passed to the triggered method.
     *
     *
     * Second use: A safe way to call methods.
     * ---------------------------------------
     *
     * @callType === 'method'
     *
     * Parameter @eventName is NOT necessary.
     *
     * The trigger() function will assume that the @objChain is a complete chain with a method
     * (function) at the end. It will call this function. So for example, when trigger() is
     * called like so:
     *
     *     state.trigger(['videoPlayer', 'pause'], {'param1': 10}, 'method');
     *
     * Then trigger() will execute:
     *
     *     state.videoPlayer.pause({'param1': 10});
     */
    function trigger(objChain, extraParameters, callType, eventName) {
        var i, tmpObj;

        // Remember that 'this' is the 'state' object.
        tmpObj = this;

        // At the end of the loop the variable 'tmpObj' will either be the correct
        // object/function to trigger/invoke. If the 'objChain' chain of object is
        // incorrect (one of the link is non-existent), then the loop will immediately
        // exit.
        while (objChain.length) {
            i = objChain.shift();

            if (tmpObj.hasOwnProperty(i)) {
                tmpObj = tmpObj[i];
            } else {
                // An incorrect object chain was specified.

                return false;
            }
        }

        if ((typeof callType === 'undefined') && (typeof eventName === 'undefined')) {
            callType = 'method';
        }

        // Based on the type, either trigger, or invoke.
        if (callType === 'event') {
            tmpObj.trigger(eventName, extraParameters);
        } else if (callType === 'method') {
            tmpObj(extraParameters);
        } else {
            return false;
        }

        return true;
    }
});

}(RequireJS.requirejs, RequireJS.require, RequireJS.define));
