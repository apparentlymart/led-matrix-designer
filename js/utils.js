
// Some general utility stuff used all over the place. Probably best
// to load this guy before the others.

function Listenable() {
    this.listeners = [];
}
Listenable.prototype = {};
Listenable.prototype.addListener = function (cb) {
    this.listeners.push(cb);
}
Listenable.prototype.notifyListeners = function (emitter, args) {
    if (args == null) args = [];
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].apply(emitter, args);
    }
}
