import { GamepadManager, Gamepad, Xbox360Pad, DualShockPad, GenericPad } from "@babylonjs/core";

let _gamepadManager = null;
const _genericPadStates = new WeakMap();

function setupGenericPad(pad) {
  if (_genericPadStates.has(pad)) {
    return _genericPadStates.get(pad);
  }

  var state = { buttons: [] };
  pad.onButtonDownObservable.add(function(buttonIndex) {
    while (state.buttons.length <= buttonIndex) {
      state.buttons.push(0.0);
    }
    state.buttons[buttonIndex] = 1.0;
  });
  pad.onButtonUpObservable.add(function(buttonIndex) {
    while (state.buttons.length <= buttonIndex) {
      state.buttons.push(0.0);
    }
    state.buttons[buttonIndex] = 0.0;
  });

  _genericPadStates.set(pad, state);
  return state;
}

function normalizeValue(value, min, max) {
  value = (value - min) / (max - min);
  if (value > 1.0) {
    value = 1.0;
  }
  if (value < 0.0) {
    value = 0.0;
  }
  return value;
}

function normalizeAxisValue(value, min, max) {
  var minus = false;
  if (value < 0.0) {
    value = 0.0 - value;
    minus = true;
  }
  value = normalizeValue(value, min, max);
  return minus ? -value : value;
}

function getMappedButtonValue(pad, buttonIndex) {
  if (pad instanceof Xbox360Pad) {
    switch (buttonIndex) {
    case  0: return pad.buttonA;
    case  1: return pad.buttonB;
    case  2: return pad.buttonX;
    case  3: return pad.buttonY;
    case  4: return pad.buttonLB;
    case  5: return pad.buttonRB;
    case  6: return pad.leftTrigger;
    case  7: return pad.rightTrigger;
    case  8: return pad.buttonBack;
    case  9: return pad.buttonStart;
    case 10: return pad.buttonLeftStick;
    case 11: return pad.buttonRightStick;
    case 12: return pad.dPadUp;
    case 13: return pad.dPadDown;
    case 14: return pad.dPadLeft;
    case 15: return pad.dPadRight;
    }
  } else if (pad instanceof DualShockPad) {
    switch (buttonIndex) {
    case  0: return pad.buttonCross;
    case  1: return pad.buttonCircle;
    case  2: return pad.buttonSquare;
    case  3: return pad.buttonTriangle;
    case  4: return pad.buttonL1;
    case  5: return pad.buttonR1;
    case  6: return pad.leftTrigger;
    case  7: return pad.rightTrigger;
    case  8: return pad.buttonShare;
    case  9: return pad.buttonOptions;
    case 10: return pad.buttonLeftStick;
    case 11: return pad.buttonRightStick;
    case 12: return pad.dPadUp;
    case 13: return pad.dPadDown;
    case 14: return pad.dPadLeft;
    case 15: return pad.dPadRight;
    }
  } else if (pad instanceof GenericPad) {
    var state = setupGenericPad(pad);
    if (buttonIndex < state.buttons.length) {
      return state.buttons[buttonIndex];
    }
  }
  return 0.0;
}

export class BabylonGamepad {
  static INPUT_TYPE_BUTTON = 0;
  static INPUT_TYPE_STICK  = 1;

  static BUTTON_UP   = 0;
  static BUTTON_DOWN = 1;

  static STICK_L = 0;
  static STICK_R = 1;

  constructor(scene) {
    this._scene = scene;
    this._gamepad = null;
    this._min = 0.0;
    this._max = 1.0;
    this._inputEventCallbacks = [];
    this._eventCleanup = null;
  }

  setTolerance(min, max) {
    this._min = min;
    this._max = max;
  }

  fetch(index) {
    if (_gamepadManager == null) {
      _gamepadManager = new GamepadManager(this._scene);
    }
    var previousPad = this._gamepad;
    var pad = _gamepadManager.gamepads[index];

    if (pad != null && pad.isConnected) {
      this._gamepad = pad;
      if (pad instanceof GenericPad) {
        setupGenericPad(pad);
      }
    } else {
      this._gamepad = null;
    }

    if (this._gamepad !== previousPad) {
      this._setupEventListeners();
    }
    return this._gamepad;
  }

  addEventListener(callback) {
    this._inputEventCallbacks.push(callback);
    this._setupEventListeners();
    return this;
  }

  removeEventListener(callback) {
    var index = this._inputEventCallbacks.indexOf(callback);
    if (index >= 0) {
      this._inputEventCallbacks.splice(index, 1);
    }
    if (this._inputEventCallbacks.length === 0) {
      this._clearEventListeners();
    }
    return this;
  }

  _notifyInputEvent(inputType, index, value1, value2) {
    for (var i = 0; i < this._inputEventCallbacks.length; i++) {
      this._inputEventCallbacks[i](inputType, index, value1, value2);
    }
  }

  _clearEventListeners() {
    if (this._eventCleanup != null) {
      this._eventCleanup();
      this._eventCleanup = null;
    }
  }

  _setupEventListeners() {
    this._clearEventListeners();
    if (!this.isConnected() || this._inputEventCallbacks.length === 0) {
      return;
    }

    var pad = this._gamepad;
    var self = this;
    var cleanups = [];

    if (pad.onButtonDownObservable != null) {
      var downObserver = pad.onButtonDownObservable.add(function(buttonIndex) {
        self._notifyInputEvent(BabylonGamepad.INPUT_TYPE_BUTTON, buttonIndex, BabylonGamepad.BUTTON_DOWN);
      });
      cleanups.push(function() {
        pad.onButtonDownObservable.remove(downObserver);
      });
    }

    if (pad.onButtonUpObservable != null) {
      var upObserver = pad.onButtonUpObservable.add(function(buttonIndex) {
        self._notifyInputEvent(BabylonGamepad.INPUT_TYPE_BUTTON, buttonIndex, BabylonGamepad.BUTTON_UP);
      });
      cleanups.push(function() {
        pad.onButtonUpObservable.remove(upObserver);
      });
    }

    // DualShock / Xbox の方向キーは onButton* ではなく onPad* で通知される
    if (pad.onPadDownObservable != null) {
      var padDownObserver = pad.onPadDownObservable.add(function(buttonIndex) {
        self._notifyInputEvent(BabylonGamepad.INPUT_TYPE_BUTTON, buttonIndex, BabylonGamepad.BUTTON_DOWN);
      });
      cleanups.push(function() {
        pad.onPadDownObservable.remove(padDownObserver);
      });
    }

    if (pad.onPadUpObservable != null) {
      var padUpObserver = pad.onPadUpObservable.add(function(buttonIndex) {
        self._notifyInputEvent(BabylonGamepad.INPUT_TYPE_BUTTON, buttonIndex, BabylonGamepad.BUTTON_UP);
      });
      cleanups.push(function() {
        pad.onPadUpObservable.remove(padUpObserver);
      });
    }

    // L2/R2 はアナログトリガーのため、押下/離しをボタン 6/7 のエッジとして通知する
    function isTriggerPressed(rawValue) {
      return normalizeValue(rawValue, self._min, self._max) >= 1.0;
    }

    if (typeof pad.onlefttriggerchanged === "function") {
      self._leftTriggerPressed = isTriggerPressed(pad.leftTrigger);
      pad.onlefttriggerchanged(function(value) {
        var pressed = isTriggerPressed(value);
        if (pressed !== self._leftTriggerPressed) {
          self._leftTriggerPressed = pressed;
          self._notifyInputEvent(BabylonGamepad.INPUT_TYPE_BUTTON, 6, pressed ? BabylonGamepad.BUTTON_DOWN : BabylonGamepad.BUTTON_UP);
        }
      });
      cleanups.push(function() {
        pad.onlefttriggerchanged(function() {});
      });
    }

    if (typeof pad.onrighttriggerchanged === "function") {
      self._rightTriggerPressed = isTriggerPressed(pad.rightTrigger);
      pad.onrighttriggerchanged(function(value) {
        var pressed = isTriggerPressed(value);
        if (pressed !== self._rightTriggerPressed) {
          self._rightTriggerPressed = pressed;
          self._notifyInputEvent(BabylonGamepad.INPUT_TYPE_BUTTON, 7, pressed ? BabylonGamepad.BUTTON_DOWN : BabylonGamepad.BUTTON_UP);
        }
      });
      cleanups.push(function() {
        pad.onrighttriggerchanged(function() {});
      });
    }

    pad.onleftstickchanged(function(values) {
      self._notifyInputEvent(
        BabylonGamepad.INPUT_TYPE_STICK,
        BabylonGamepad.STICK_L,
        normalizeAxisValue(values.x, self._min, self._max),
        normalizeAxisValue(values.y, self._min, self._max)
      );
    });

    pad.onrightstickchanged(function(values) {
      self._notifyInputEvent(
        BabylonGamepad.INPUT_TYPE_STICK,
        BabylonGamepad.STICK_R,
        normalizeAxisValue(values.x, self._min, self._max),
        normalizeAxisValue(values.y, self._min, self._max)
      );
    });

    cleanups.push(function() {
      pad.onleftstickchanged(function() {});
      pad.onrightstickchanged(function() {});
    });

    this._eventCleanup = function() {
      for (var i = 0; i < cleanups.length; i++) {
        cleanups[i]();
      }
    };
  }

  isConnected() {
    return this._gamepad != null && this._gamepad.isConnected;
  }

  id() {
    try {
      return this._gamepad.id;
    } catch(e) {}
    return "";
  }

  type() {
    try {
      return this._gamepad.type;
    } catch(e) {}
    return -1;
  }

  getBabylonGamepad() {
    return this._gamepad;
  }

  axisNum() {
    if (!this.isConnected()) {
      return 0;
    }
    return 4;
  }

  axisValue(axisIndex) {
    if (!this.isConnected()) {
      return 0.0;
    }

    var value = 0.0;
    switch (axisIndex) {
    case 0:
      value = this._gamepad.leftStick.x;
      break;
    case 1:
      value = this._gamepad.leftStick.y;
      break;
    case 2:
      value = this._gamepad.rightStick.x;
      break;
    case 3:
      value = this._gamepad.rightStick.y;
      break;
    default:
      return 0.0;
    }
    var minus = false;
    if (value < 0.0) {
      value = 0.0 - value;
      minus = true;
    }
    value = normalizeValue(value, this._min, this._max);
    return minus ? -value : value;
  }

  leftTrigger() {
    if (this._gamepad instanceof Xbox360Pad || this._gamepad instanceof DualShockPad) {
      return normalizeValue(this._gamepad.leftTrigger, this._min, this._max);
    }
    return 0.0;
  }

  rightTrigger() {
    if (this._gamepad instanceof Xbox360Pad || this._gamepad instanceof DualShockPad) {
      return normalizeValue(this._gamepad.rightTrigger, this._min, this._max);
    }
    return 0.0;
  }

  buttonNum() {
    if (!this.isConnected()) {
      return 0;
    }

    if (this._gamepad instanceof Xbox360Pad || this._gamepad instanceof DualShockPad) {
      return 16;
    }

    if (this._gamepad instanceof GenericPad) {
      var state = setupGenericPad(this._gamepad);
      return Math.max(16, state.buttons.length);
    }

    return 0;
  }

  buttonValue(buttonIndex) {
    if (!this.isConnected()) {
      return 0.0;
    }
    return normalizeValue(
      getMappedButtonValue(this._gamepad, buttonIndex),
      this._min,
      this._max
   );
  }

  isButtonPressed(buttonIndex) {
    return this.buttonValue(buttonIndex) >= 1.0;
  }
}
