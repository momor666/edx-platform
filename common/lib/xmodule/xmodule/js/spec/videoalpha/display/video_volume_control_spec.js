(function() {
  describe('VideoVolumeControlAlpha', function() {
    var state, videoControl, videoVolumeControl;

    describe('constructor', function() {
      beforeEach(function() {
        spyOn($.fn, 'slider').andCallThrough();
        //TODO: modify jasmine.stubVideoPlayerAlpha by incorporating the changes below
        //state = jasmine.stubVideoPlayerAlpha(this);
        loadFixtures('videoalpha_all.html');
        state = new VideoAlpha('#example');
        videoControl = state.videoControl;
        videoVolumeControl = state.videoVolumeControl;
      });

      it('initialize currentVolume to 100', function() {
        expect(state.videoVolumeControl.currentVolume).toEqual(1);
      });

      it('render the volume control', function() {
        expect(videoControl.secondaryControlsEl.html()).toContain("<div class=\"volume\">\n"); //toContain("<div class=\"volume\">\n  <a href=\"#\"></a>\n  <div class=\"volume-slider-container\">\n    <div class=\"volume-slider\"></div>\n  </div>\n</div>");
      });

      it('create the slider', function() {
        expect($.fn.slider).toHaveBeenCalledWith({
          orientation: "vertical",
          range: "min",
          min: 0,
          max: 100,
          value: 100,
          value: videoVolumeControl.currentVolume,
          change: videoVolumeControl.onChange,
          slide: videoVolumeControl.onChange
        });
      });

      it('bind the volume control', function() {
        expect($('.volume>a')).toHandleWith('click', videoVolumeControl.toggleMute);
        expect($('.volume')).not.toHaveClass('open');
        $('.volume').mouseenter();
        expect($('.volume')).toHaveClass('open');
        $('.volume').mouseleave();
        expect($('.volume')).not.toHaveClass('open');
      });
    });

    describe('onChange', function() {
      beforeEach(function() {
        loadFixtures('videoalpha_all.html');
        state = new VideoAlpha('#example');
        videoControl = state.videoControl;
        videoVolumeControl = state.videoVolumeControl;
      });

      describe('when the new volume is more than 0', function() {
        beforeEach(function() {
          videoVolumeControl.onChange(void 0, {
            value: 60
          });
        });

        it('set the player volume', function() {
          expect(videoVolumeControl.currentVolume).toEqual(60);
        });

        it('remote muted class', function() {
          expect($('.volume')).not.toHaveClass('muted');
        });
      });

      describe('when the new volume is 0', function() {
        beforeEach(function() {
          videoVolumeControl.onChange(void 0, {
            value: 0
          });
        });

        it('set the player volume', function() {
          expect(videoVolumeControl.currentVolume).toEqual(0);
        });

        it('add muted class', function() {
          expect($('.volume')).toHaveClass('muted');
        });
      });
    });
    
    describe('toggleMute', function() {
      beforeEach(function() {
        loadFixtures('videoalpha_all.html');
        state = new VideoAlpha('#example');
        videoControl = state.videoControl;
        videoVolumeControl = state.videoVolumeControl;
      });

      describe('when the current volume is more than 0', function() {
        beforeEach(function() {
          videoVolumeControl.currentVolume = 60;
          videoVolumeControl.buttonEl.trigger('click');
        });

        it('save the previous volume', function() {
          expect(videoVolumeControl.previousVolume).toEqual(60);
        });

        it('set the player volume', function() {
          expect(videoVolumeControl.currentVolume).toEqual(0);
        });
      });
      
      describe('when the current volume is 0', function() {
        beforeEach(function() {
          videoVolumeControl.currentVolume = 0;
          videoVolumeControl.previousVolume = 60;
          videoVolumeControl.buttonEl.trigger('click');
        });
        
        it('set the player volume to previous volume', function() {
          expect(videoVolumeControl.currentVolume).toEqual(60);
        });
      });
    });
  });

}).call(this);
