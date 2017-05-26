
/**
 * This module is in charge of displaying the file information in a popover when
 * the user lets his mouse over the icon of the file.
 * For now we only display the thumbnail of files being an image.
 */

const ARROW_TOP_OFFSET       = 17  // top offset in pixels for the arrow of the popover
const POPOVER_DEFAULT_HEIGHT = 110 // height of thumbnails in px

const StateMachine = require('./finite-state-machine.js')

const filePopover  = {
    init : function(){

        // A] DOM of the Popover
        var elmt   = document.createElement('div')
        this.el    = elmt
        this.img   = document.createElement('img')
        this.a     = document.createElement('a')
        this.arrow = document.createElement('div')
        elmt.appendChild(this.a).appendChild(this.img)
        elmt.appendChild(this.arrow)
        elmt.classList.add('filePopover')
        // TODO : put the styles in css, not inlined...
        elmt.setAttribute('style',`background-color:red;
            border:1px solid black;
            height:${POPOVER_DEFAULT_HEIGHT}px;
            width:${POPOVER_DEFAULT_HEIGHT}px;
            position:absolute;
            cursor:pointer;
            transition: top .2s ease;`)
        elmt.style.display = 'none'
        this.arrow.setAttribute('style',`position: absolute;
            left: -9px;
            border-bottom: 9px solid transparent;
            border-top: 9px solid transparent;
            border-right: 9px solid black;
            transition: top .2s ease;`)
        document.body.appendChild(this.el)
        elmt = this.el

        // B] EVENTS LISTENERS ON POPOVER
        elmt.addEventListener( 'mouseenter', (event) =>{
            this._isIntoPopover = true
            this.stateMachine.E3_enterPopo()
            }
        )
        elmt.addEventListener( 'mouseleave', (event) =>{
            this._isIntoPopover = false
            this.stateMachine.E4_exitPopo()
            }
        )
        this.a.addEventListener( 'click', (event) =>{
            if (not (event.ctrlKey)){
                // Show the gallery TODO
                console.log('click on the photo : I need a gallery ! ! :-)');
                //window.app.gallery.show(this._currentTarget.model)
                event.preventDefault()
                }
            }
        )

        // C] EVENTS LISTENERS ON IMG
        this._previousPopoverHeight = POPOVER_DEFAULT_HEIGHT
        this.img.onload = (event) =>{
            dim = this.el.getBoundingClientRect()
            if (this._previousPopoverHeight != dim.height){
                this._previousPopoverHeight = dim.height
                }
            }

        // D] TRACK MOUSE POSITION to check it is in the column of the files icons,
        // or it goes out of the column (+-10px)
        this._columnGardian.init(this)
        this.stateMachine = StateMachine.create({
            initial: 'S1_Init',
              events: [
                {
                  from: 'S1_Init',
                  to: 'S2_WaitingToShow',
                  name: 'E1_enterLink'
                }, {
                  from: 'S1_Init',
                  to: 'S1_Init',
                  name: 'E4_exitPopo'
                }, {
                  from: 'S2_WaitingToShow',
                  to: 'S3_Visible',
                  name: 'E5_showTimer'
                }, {
                  from: 'S2_WaitingToShow',
                  to: 'S1_Init',
                  name: 'E8_exitCol'
                }, {
                  from: 'S2_WaitingToShow',
                  to: 'S1_Init',
                  name: 'E2_exitLink'
                }, {
                  from: 'S2_WaitingToShow',
                  to: 'S2_WaitingToShow',
                  name: 'E1_enterLink'
                }, {
                  from: 'S3_Visible',
                  to: 'S4_WaitingToHide',
                  name: 'E4_exitPopo'
                }, {
                  from: 'S3_Visible',
                  to: 'S4_WaitingToHide',
                  name: 'E8_exitCol'
                }, {
                  from: 'S3_Visible',
                  to: 'S4_WaitingToHide',
                  name: 'E9_linkNoData'
                }, {
                  from: 'S3_Visible',
                  to: 'S3_Visible',
                  name: 'E1_enterLink'
                }, {
                  from: 'S3_Visible',
                  to: 'S3_Visible',
                  name: 'E3_enterPopo'
                }, {
                  from: 'S3_Visible',
                  to: 'S3_Visible',
                  name: 'E7_enterCol'
                }, {
                  from: 'S4_WaitingToHide',
                  to: 'S3_Visible',
                  name: 'E1_enterLink'
                }, {
                  from: 'S4_WaitingToHide',
                  to: 'S3_Visible',
                  name: 'E3_enterPopo'
                }, {
                  from: 'S4_WaitingToHide',
                  to: 'S3_Visible',
                  name: 'E7_enterCol'
                }, {
                  from: 'S4_WaitingToHide',
                  to: 'S1_Init',
                  name: 'E6_hideTimer'
                }, {
                  from: 'S4_WaitingToHide',
                  to: 'S4_WaitingToHide',
                  name: 'E4_exitPopo'
                }
              ],

              callbacks: {
                onenterS2_WaitingToShow: (event, from, to) => {
                    if (from === 'S1_Init') {
                      this._startShowTimer();
                      this._lastEnteredTarget.el.style.cursor = 'wait';
                      return this._columnGardian.start();
                    }
                 },

                onleaveS2_WaitingToShow: (event, from, to) => {
                    return this._lastEnteredTarget.el.style.cursor = '';
                },

                onenterS3_Visible: (event, from, to) => {
                    if (from === 'S2_WaitingToShow') {
                      this._setNewTarget();
                      return this._show();
                    } else if (from === 'S4_WaitingToHide') {
                      window.clearTimeout(this.hideTimeout);
                      if (this._lastEnteredTarget !== this._currentTarget) {
                        return this._setNewTarget();
                      }
                    }
                },

                onenterS4_WaitingToHide: (event, from, to) => {
                    return this._startHideTimer();
                },

                onenterS1_Init: (event, from, to) => {
                    if (from === 'S4_WaitingToHide') {
                      this._hide();
                      return this._columnGardian.stop();
                    } else if (from === 'S2_WaitingToShow') {
                      window.clearTimeout(this.showTimeout);
                      return this._columnGardian.stop();
                    }
                },

                onbeforeE1_enterLink: (event, from, to) => {
                    if (this._hasInfoToDisplay(this._lastEnteredTarget)) {
                      if (from === to && to === 'S3_Visible') {
                        this._setNewTarget();
                      }
                      return true;
                    } else {
                      if (from === 'S3_Visible') {
                        this.stateMachine.E9_linkNoData();
                      }
                      return false;
                    }
                },

                onbeforeE2_exitLink: (event, from, to) => {
                    if (!this._hasInfoToDisplay(this._lastEnteredTarget)) {
                      return false;
                    }
                },

                onbeforeE8_exitCol: (event, from, to) => {
                    return !this._isIntoPopover;
                }
            }
        });
    },


    onEnterLink : function(targetView) {
        this._lastEnteredTarget = {
            el: targetView,
            model: targetView.model // TODO : move from backbone logic to react
        };
        return this.stateMachine.E1_enterLink();
    },


    onExitLink : function(targetView) {
        if (this.stateMachine.current === 'S2_WaitingToShow') {
            return this.stateMachine.E2_exitLink();
        }
    },


    /**
    * Moves the popover on its corresponding thumbnail target and
    * updates the popover content
    */
    _setNewTarget : function() {
        var arrowTop, el, popoverBottom, popoverTop, scrollTop, target, topFileInfo, targetDimensions;

        /** A] update position (takes care if the thumbnail is too low in the window) */
        target              = this._lastEnteredTarget
        this._currentTarget = target
        el                  = target.el
        targetDimensions    = el.getBoundingClientRect()
        topFileInfo         = targetDimensions.top
        scrollTop           = el.offsetParent.scrollTop
        popoverTop          = topFileInfo - scrollTop
        popoverBottom       = popoverTop + this._previousPopoverHeight
        if (popoverBottom < this.columnDimensions.bottom) {
            if (this.columnDimensions.top < popoverTop ){
                this.el.style.top = popoverTop + 'px';
                this.arrow.style.top = ARROW_TOP_OFFSET + 'px';
            }else{
                this.el.style.top = this.columnDimensions.top + 'px';
                arrowTop = - this.columnDimensions.top + popoverTop + ARROW_TOP_OFFSET;
                arrowTop = Math.max(arrowTop, 0);
                this.arrow.style.top = arrowTop + 'px';
            }
        } else {
            this.el.style.top = (this.columnDimensions.bottom - this._previousPopoverHeight) + 'px';
            arrowTop = popoverTop + this._previousPopoverHeight - this.columnDimensions.bottom  + ARROW_TOP_OFFSET;
            arrowTop = Math.min(arrowTop, this._previousPopoverHeight - 12);
            this.arrow.style.top = arrowTop + 'px';
        }

        /** b] update the image displayed in the popover  : TODO  */
        // this.img.src = target.model.getThumbUrl();
        // return this.a.href = target.model.getAttachmentUrl();
    },


    _show : function() {
        this.el.style.display = 'block';
    },

    _hide : function() {
        this.el.style.display = 'none';
    },


    _startShowTimer : function() {
        this.showTimeout = window.setTimeout( () => {
                return this.stateMachine.E5_showTimer();
            }, 700);
    },

    _startHideTimer : function() {
        this.hideTimeout = window.setTimeout( () => {
            return this.stateMachine.E6_hideTimer();
        }, 300);
    },


    /**
     * Return false if the model corresponds to a file which has no info to
     * display in the popover. For now only files with thumbnails are concerned.
     * @param  {View}  targetView Backbone view of the file
     * @return {Boolean}  True if the file has info to display in the
     *                    popover, false otherwise.
     */

    _hasInfoToDisplay : function(targetView) {
        // TODO : implement the correct tests
        return true;
    },

    /**
    In charge of supervising the column of thumbnails : modification of size and
    if the mouse enters or exits the column.
    */
    _columnGardian : {
        init: function(filePopover) {
            var computeColAfterResize;
            this.filePopover = filePopover;
            this._computeColumnWidth();
            // update the col positions when the window is resized
            // TODO : implement the debounced version (little optimization)
            // computeColAfterResize = _.debounce((function(_this) {
            //   return function() {
            //     return _this._computeColumnWidth();
            //   };
            // })(this), 1000);
            computeColAfterResize = () => {
                    return this._computeColumnWidth();
                };
            window.addEventListener("resize", computeColAfterResize, false);

            // callback to track if the mouse remains or not in the column of the
            // thumbnails.
            this.mouseMoved = (ev) => {
                var isInCol;
                isInCol = this.col_left < ev.pageX
                isInCol = isInCol && ev.pageX < this.col_right
                isInCol = isInCol && this.col_top < ev.pageY
                isInCol = isInCol && ev.pageY < this.col_bottom
                if (this.isInCol !== isInCol) {
                  if (isInCol) {
                    this.filePopover.stateMachine.E7_enterCol()
                  } else {
                    this.filePopover.stateMachine.E8_exitCol()
                  }
                  this.isInCol = isInCol
                }
                console.log("  = mouseMoved, isInCol:", isInCol)
            };
        },

         _computeColumnWidth: function() {
            var captionWrapper, thumbDim, viewPortDim;
            if (this.columElmt == null) {
                parent             = document.querySelector('div[role="contentinfo"]').firstChild
                this.columElmt     = parent.firstChild.childNodes[1],
                this.filesViewport = parent.childNodes[1]
            }
            thumbDim        = this.columElmt.getBoundingClientRect();
            this.col_left   = thumbDim.left - 10
            this.col_right  = thumbDim.left + thumbDim.width + 10
            viewPortDim     = this.filesViewport.getBoundingClientRect()
            this.col_top    = viewPortDim.top
            this.col_bottom = viewPortDim.bottom
            this.filePopover.columnDimensions = {
                top   : this.col_top,
                bottom: this.col_bottom,
                left  : this.col_left,
                right : this.col_right
            }
            this.filePopover.el.style.left = (thumbDim.left + thumbDim.width) + 'px'
            console.log("_columnGardian._computeColumnWidth()", this.col_right, this.col_left);
        },

        start: function() {
            console.log("_columnGardian.start()");
            document.body.addEventListener("mousemove", this.mouseMoved, false)
            this.isInCol = true
        },

        stop: function() {
            console.log("_columnGardian.stop()");
            document.body.removeEventListener("mousemove", this.mouseMoved, false)
        }

    }

}

export default filePopover
