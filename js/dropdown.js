var DropDown = function(ele) {
  this._init(ele);
};

DropDown.prototype = new (function() {
  this._init = function(ele) {
    this.stack = [];
    this.freepool = [];
    this.ele = ele;
    this._drag_target = null;
    this._drag_delta = null;

    document.addEventListener('mousedown', this._mousedown.bind(this));
    document.addEventListener('mousemove', this._mousemove.bind(this));
    document.addEventListener('mouseup', this._mouseup.bind(this));
  };

  this.addItem = function(setting) {
    var item = new Item(this.ele, setting);
    return this._addToStack(item, true);
  };

  this._mousedown = function(event) {
    if (!event.target) return;
    //find parent li-element if event is triggered from label
    var target =
      event.target.tagName === 'LABEL'
        ? event.target.parentElement
        : event.target;

    if (target.parentElement.classList.contains('item') && event.button === 0) {
      this._drag_target = this._mapEleToItem(target.parentElement);
      this._drag_target.ele.classList.add('drag');
      if (!this._drag_target.free) this._drag_target.createShadow();

      var style = this._drag_target.ele.style;
      this._drag_delta = {
        x: event.clientX - parseInt(style.left || 0),
        y: event.clientY - parseInt(style.top || 0)
      };

      event.preventDefault();
    }
  };

  this._mousemove = function(event) {
    if (this._drag_target) {
      this._drag_target.x0 = event.clientX - this._drag_delta.x;
      this._drag_target.y0 = event.clientY - this._drag_delta.y;

      if (this._drag_target.free) {
        this._drag_target.removeShadow();
        this._removeFromStack(this._drag_target);
      } else {
        if (this.stack.indexOf(this._drag_target) === -1) {
          //re-enter to stack
          this._addToStack(this._drag_target, false);
          this._drag_target.createShadow();

          //remove from freepool
          var index = this.freepool.indexOf(this._drag_target);
          this.freepool.splice(index, 1);
        }

        var swap = this._neighbourOverlap();

        if (swap) {
          this._swapStackItems(this._drag_target, swap.item);

          if (swap.direction === 'right') {
            this._drag_target.updateShadowX(swap.item.x0);
            swap.item.animateTo({ x: swap.item.x0 + this._drag_target.width });
          } else if (swap.direction === 'left') {
            swap.item.animateTo({ x: swap.item.x0 - this._drag_target.width });
            this._drag_target.updateShadowX(swap.item.x0 + swap.item.width);
          }
        }
      }
    }
  };

  this._mouseup = function(event) {
    if (this._drag_target) {
      this._drag_target.ele.classList.remove('drag');

      if (!this._drag_target.free) {
        if (this._drag_target.prev === null) {
          //move to start
          this._drag_target.animateTo({ x: 0, y: 0 });
        } else {
          this._drag_target.positionRightOf(this._drag_target.prev, true);
        }
      }

      this._drag_target.removeShadow();
      this._drag_start = null;
      this._drag_target = null;
    }
  };

  this._mapEleToItem = function(ele) {
    var filter = this.stack.filter(function(item) {
      return item.ele == ele;
    });
    if (filter.length > 0) return filter[0];

    //if not in stack, check freepool
    filter = this.freepool.filter(function(item) {
      return item.ele == ele;
    });
    return filter.length > 0 ? filter[0] : null;
  };

  this._addToStack = function(item, animate) {
    if (this.stack.length > 0) {
      var last = this.stack[0];

      while (last.next !== null) {
        last = last.next;
      }

      item.positionRightOf(last, animate);
      item.prev = last;
      last.next = item;
    }

    this.stack.push(item);

    return item;
  };

  this._swapStackItems = function(item1, item2) {
    var tmp = { next: item1.next, prev: item1.prev };

    item1.next = item2.next === item1 ? item2 : item2.next;
    item1.prev = item2.prev === item1 ? item2 : item2.prev;
    item2.next = tmp.next === item2 ? item1 : tmp.next;
    item2.prev = tmp.prev === item2 ? item1 : tmp.prev;

    if (item1.next) item1.next.prev = item1;
    if (item1.prev) item1.prev.next = item1;
    if (item2.next) item2.next.prev = item2;
    if (item2.prev) item2.prev.next = item2;
  };

  this._removeFromStack = function(item) {
    var index = this.stack.indexOf(item);

    if (index >= 0) {
      this.freepool.push(this.stack.splice(index, 1)[0]);

      //tie up new neighbours
      if (item.prev) item.prev.next = item.next;
      if (item.next) item.next.prev = item.prev;

      //fix positions
      var next = this._drag_target.next;

      while (next !== null) {
        if (next.prev) next.positionRightOf(next.prev, true);
        else next.animateTo({ x: 0 });
        next = next.next;
      }

      //clean up
      item.next = null;
      item.prev = null;
    }
  };

  /* Checks neighbour collisions
   * returns {item, direction}
   */
  this._neighbourOverlap = function() {
    var prev = this._drag_target.prev,
      next = this._drag_target.next,
      x0 = this._drag_target.x0,
      x1 = this._drag_target.x1,
      center = 0;

    if (prev) {
      center = prev.x0 + (prev.width >> 1);

      if (x0 <= center) {
        return {
          item: prev,
          direction: 'right'
        };
      }
    }

    if (next) {
      center = next.x0 + (next.width >> 1);
      if (x1 >= center) {
        return {
          item: next,
          direction: 'left'
        };
      }
    }
  };
})();
