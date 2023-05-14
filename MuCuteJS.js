/**
 * Name: MuCuteJS
 * Description: A cute mod for minecraftpe.
 * --------------------------------
 * [Type] MCPE/Mod/ModPE
 * [Author] SuMuCheng
 * [QQ] 3578557729
 * --------------------------------
 * 借鉴部分:
 * MIX - ClickFX, 并使用 AnimatorSet 进行校准优化
 * Creeper UI - GUI
 */

(function() {
    // The global context
    var ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();

    Object.defineProperty(Object.prototype, "copyWith", {
        enumerable: false,
        value: function(obj) {
            if (isUndef(obj)) {
                obj = {};
            }
            var result = {};
            var keys = Object.keys(this);
            for (var index = 0; index < keys.length; index++) {
                var key = keys[index];
                result[key] = this[key];
            }
            var objectKeys = Object.keys(obj);
            for (var index = 0; index < objectKeys.length; index++) {
                var key = objectKeys[index];
                result[key] = obj[key];
            }
            return result;
        }
    });

    function useState(value) {
        var observers = [];
        var current = value;
        return Object.defineProperty({
            addObserver: function(fn) {
                observers.push(fn);
            },
            removeObserver: function(fn) {
                for (var index = 0; index < observers.length; index++) {
                    if (observers[index] === fn) {
                        observers.splice(index, 1);
                        break;
                    }
                }
            },
            clearObservers: function() {
                observers = [];
            }
        }, "value", {
            get: function() {
                return current;
            },
            set: function(value) {
                var old = current;
                current = value;
                for (var i = 0; i < observers.length; i++) {
                    observers[i](current, old);
                }
            }
        });
    }

    // The bind function
    function bind(fn, target) {
        return function() {
            return fn.apply(target, Array.prototype.slice.call(arguments));
        };
    }

    function reduce(array, cb, initialValue) {
        var acc = initialValue || array[0];
        var startIndex = initialValue ? 0 : 1;

        for (var i = startIndex; i < array.length; i++) {
            var cur = array[i];
            acc = cb(acc, cur, i, array);
        }
        return acc;
    }

    // The compose function
    function compose() {
        var funcs = Array.prototype.slice.call(arguments);
        return function() {
            var args = Array.prototype.slice.call(arguments);
            if (funcs.length == 0) {
                return args;
            }
            if (funcs.length == 1) {
                return funcs[0].apply(this, args);
            }
            var that = this;
            return reduce(funcs, function(x, y) {
                return typeof x == "function" ? y(x.apply(that, args)) : y(x);
            });
        }
    }

    function withs(fn, fn2) {
        return function() {
            fn2(fn);
        }
    }

    // The event bus class
    function EventBus() {
        if (!(this instanceof EventBus)) {
            throw new TypeError("Missing 'new' call");
        }
        this.map = Object.create(null);

        // notify listeners
        this.send = bind(function(name, value) {
            var listeners = this.map[name];
            if (listeners != null) {
                for (var index = 0; index < listeners.length; index++) {
                    listeners[index].call(this, value);
                }
            }
            return this;
        }, this);

        // add a listener
        this.register = bind(function(name, listener) {
            var listeners = this.map[name];
            if (listeners == null) {
                this.map[name] = listeners = [];
            }

            listeners.push(listener);
            return this;
        }, this);

        // remove a listener
        this.unregister = bind(function(name, listener) {
            var listeners = this.map[name];
            if (Array.isArray(listeners)) {
                for (var index = 0; index < listeners.length; index++) {
                    if (listeners[index] === listener) {
                        listeners.splice(index, 1);
                        break;
                    }
                }
            }
            return this;
        }, this);

        // remove all listeners
        this.unregisterAll = bind(function(name) {
            if (typeof name != "string") {
                throw new TypeError("The name expected string got " + typeof(name));
            }
            this.map[name] = null;
            return this;
        }, this);
    }

    // The event bus constant types
    var RunOnUiThread = "RunOnUiThread";
    var RunOnUiThreadError = "RunOnUiThreadError";
    var RequireComponent = "RequireComponent";

    // The global event bus
    var GlobalEventBus = new EventBus();
    var send = GlobalEventBus.send;
    var register = GlobalEventBus.register;
    var unregister = GlobalEventBus.unregister;

    // When launch in UI Thread
    GlobalEventBus.register(RunOnUiThread, function(fn) {
        ctx.runOnUiThread(function() {
            try {
                fn();
            } catch (error) {
                GlobalEventBus.send(RunOnUiThreadError, error);
            }
        });
    });

    function delayed(fn, duration) {
        android.os.Handler()
            .postDelayed(withs(function() {
            fn();
        }, Ui), duration);
    }

    // Run on UI thread
    function Ui(fn) {
        return send(RunOnUiThread, fn);
    }

    function dip2px(value) {
        return android.util.TypedValue.applyDimension(
        android.util.TypedValue.COMPLEX_UNIT_DIP,
        value,
        ctx.getResources()
            .getDisplayMetrics());
    }

    function W() {
        return ctx.getResources()
            .getDisplayMetrics()
            .widthPixels;
    }

    function H() {
        return ctx.getResources()
            .getDisplayMetrics()
            .heightPixels;
    }

    function writeText(fileName, text) {
        var output = ctx.openFileOutput(fileName, android.content.Context.MODE_PRIVATE);
        var writer = java.io.BufferedWriter(java.io.OutputStreamWriter(output));
        writer.write(text);
        writer.flush();
        writer.close();
    }

    function readText(fileName) {
        var arr = [];
        var input = ctx.openFileInput(fileName);
        var reader = java.io.BufferedReader(java.io.InputStreamReader(input));
        var next = null;
        do {
            next = reader.readLine();
            if (next != null) {
                arr.push(next);
            }
        } while (next != null);
        reader.close();
        return arr.join("\n");
    }

    function exists(fileName) {
        try {
            ctx.openFileInput(fileName)
                .close();
            return true;
        } catch (e) {
            return false;
        }
    }

    function writeTextSD(filePath, text) {
        var output = java.io.FileWriter(filePath);
        var writer = java.io.BufferedWriter(java.io.OutputStreamWriter(output));
        writer.write(text);
        writer.flush();
        writer.close();
    }

    function readTextSD(filePath) {
        var arr = [];
        var input = java.io.FileReader(filePath);
        var reader = java.io.BufferedReader(java.io.InputStreamReader(input));
        var next = null;
        do {
            next = reader.readLine();
            if (next != null) {
                arr.push(next);
            }
        } while (next != null);
        reader.close();
        return arr.join("\n");
    }

    function existsSD(filePath) {
        return java.io.File(filePath)
            .exists();
    }

    function isUndef(value) {
        return value === undefined;
    }

    function isNotUndef(value) {
        return !isUndef(value);
    }

    function defFunc(value) {
        return isUndef(value) ? function() {} : value;
    }

    function requireComponent(eventBus) {
        if (!(eventBus instanceof EventBus)) {
            throw new TypeError("You must input EventBus");
        }
        var result = null;
        var registerFunc = function(component) {
            result = component;
            eventBus.unregister(RequireComponent, registerFunc);
        }
        eventBus.send(RequireComponent, registerFunc);
        return result;
    }

    function parseColor(color) {
        return android.graphics.Color.parseColor(color);
    }

    function parseHtml(html) {
        return android.text.Html.fromHtml(html);
    }

    var PopupProps = "PopupProps";

    function Popup(props) {
        var popup = android.widget.PopupWindow(ctx);
        var gravity = android.view.Gravity.LEFT | android.view.Gravity.TOP;
        var x = 0;
        var y = 0;

        var eventBus = new EventBus();

        defineRequireComponent(eventBus, popup);
        eventBus.register(PopupProps, function(props) {
            var widthProp = props.width;
            var heightProp = props.height;
            var focusableProp = props.focusable;
            var touchableProp = props.touchable;
            var animationProp = props.animation;
            var backgroundProp = props.background;
            var contentViewProp = props.contentView;
            var gravityProp = props.gravity;
            var posProp = props.pos;
            var updatePosProp = props.updatePos;
            if (isNotUndef(widthProp)) {
                popup.setWidth(widthProp);
            }
            if (isNotUndef(heightProp)) {
                popup.setHeight(heightProp);
            }
            if (isNotUndef(focusableProp)) {
                popup.setFocusable(focusableProp);
            }
            if (isNotUndef(touchableProp)) {
                popup.setTouchable(touchableProp);
            }
            if (isNotUndef(animationProp)) {
                var style = android.R.style;
                var animation = props.animation;
                if (animation == "Dialog") {
                    animation = style.Animation_Dialog;
                } else if (animation == "InputMethod") {
                    animation = style.Animation_InputMethod;
                } else if (animation == "Toast") {
                    animation = style.Animation_Toast;
                } else if (animation == "Activity") {
                    animation = style.Animation_Activity;
                } else if (animation == "Translucent") {
                    animation = style.Animation_Translucent;
                }
                popup.setAnimationStyle(animation);
            }
            if (isNotUndef(backgroundProp)) {
                popup.setBackgroundDrawable(backgroundProp);
            }
            if (isNotUndef(contentViewProp)) {
                popup.setContentView(requireComponent(props.contentView));
            }
            if (isNotUndef(gravityProp)) {
                gravity = gravityProp;
            }
            if (isNotUndef(posProp)) {
                x = posProp[0];
                y = posProp[1];
            }
            if (props.dismiss === true) {
                popup.dismiss();
            } else {
                popup.showAtLocation(ctx.getWindow()
                    .getDecorView(), gravity, x, y);
            }
            if (isNotUndef(updatePosProp)) {
                popup.update(updatePosProp[0], updatePosProp[1], -1, -1);
            }
        });
        eventBus.send(PopupProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    function LinearGradient(props) {
        props = isUndef(props) ? {} : props;
        var shaderClass = android.graphics.Shader;
        var linearGradientClass = android.graphics.LinearGradient;
        var startX = props.startX;
        var startY = props.startY;
        var endX = props.endX;
        var endY = props.endY;
        var colors = props.colors;
        var positions = null;
        var tile = shaderClass.TileMode.CLAMP;
        if (isUndef(startX)) {
            startX = 0;
        }
        if (isUndef(startY)) {
            startY = 0;
        }
        if (isNotUndef(props.positions)) {
            positions = props.positions;
        }
        switch (props.tile) {
            case "MIRROR":
                tile = shaderClass.MIRROR;
                break;

            case "REPEAT":
                tile = shaderClass.REPEAT;
                break;
        }
        var array = java.lang.reflect.Array.newInstance(
        java.lang.Integer.TYPE,
        colors.length);
        for (var index = 0; index < colors.length; index++) {
            array[index] = colors[index];
        }
        return linearGradientClass(
        startX, startY, endX, endY, array, positions, tile);
    }

    function GradientDrawable(props) {
        props = isUndef(props) ? {} : props;
        var gradientDrawableClass = android.graphics.drawable.GradientDrawable;
        var orientationPackage = gradientDrawableClass.Orientation;
        var orientation = null;
        var type = null;
        var shape = null;
        var color = props.color;
        var colors = props.colors;
        var radius = props.radius;
        var drawable = null;
        switch (props.orientation) {
            case "BL_TR":
                orientation = orientationPackage.BL_TR;
                break;

            case "BT":
                orientation = orientationPackage.BOTTOM_TOP;
                break;

            case "BR_TL":
                orientation = orientationPackage.BR_TL;
                break;

            case "LR":
                orientation = orientationPackage.LEFT_RIGHT;
                break;

            case "RL":
                orientation = orientationPackage.RIGHT_LEFT;
                break;

            case "TL_BR":
                orientation = orientationPackage.TL_BR;
                break;

            case "TB":
                orientation = orientationPackage.TOP_BOTTOM;
                break;

            case "TR_BL":
                orientation = orientationPackage.TR_BL;
                break;
        }
        switch (props.type) {
            case "Linear":
                type = gradientDrawableClass.LINEAR_GRADIENT;
                break;

            case "Ridial":
                type = gradientDrawableClass.RIDIAL_GRADIENT;
                break;

            case "Sweep":
                type = gradientDrawableClass.SWEEP_GRADIENT;
                break;
        }
        switch (props.shape) {
            case "Rect":
                shape = gradientDrawableClass.RECTANGLE;
                break;

            case "Oval":
                shape = gradientDrawableClass.OVAL;
                break;

            case "Line":
                shape = gradientDrawableClass.LINE;
                break;

            case "Ring":
                shape = gradientDrawableClass.RING;
                break;
        }
        if (orientation !== null) {
            drawable = gradientDrawableClass();
            drawable.setOrientation(orientation);
        } else {
            drawable = gradientDrawableClass();
        }
        if (type !== null) {
            drawable.setGradientType(type);
        }
        if (shape !== null) {
            drawable.setShape(shape);
        }
        if (isNotUndef(color)) {
            drawable.setColor(color);
        }
        if (isNotUndef(colors)) {
            drawable.setColors(colors);
        }
        if (Array.isArray(radius)) {
            drawable.setCornerRadii([radius[0], radius[0], radius[1], radius[1], radius[2], radius[2], radius[3], radius[3]]);
        } else if (isNotUndef(radius)) {
            drawable.setCornerRadius(radius);
        }
        return drawable;
    }

    var LayoutProps = "LayoutProps";

    var LEFT = android.view.Gravity.LEFT;
    var TOP = android.view.Gravity.TOP;
    var CENTER = android.view.Gravity.CENTER;
    var CENTER_HORIZONTAL = android.view.Gravity.CENTER_HORIZONTAL;
    var CENTER_VERTICAL = android.view.Gravity.CENTER_VERTICAL;
    var RIGHT = android.view.Gravity.RIGHT;
    var BOTTOM = android.view.Gravity.BOTTOM;

    var OnClickProps = "OnClickProps";
    var OnLayoutProps = "OnLayoutProps";

    function defineView(eventBus, name, view, container) {
        var isLayoutInited = false;
        var events = eventBus.register(name, function(props) {
            var gravityProp = props.gravity;
            var debugProp = props.debug;
            var backgroundProp = props.background;
            var alphaProp = props.alpha;
            var paddingsProp = props.paddings;
            var blur = props.blur;
            var layoutParams = props.layoutParams;
            var onClick = props.onClick;
            var focusableProp = props.focusable;
            var clickableProp = props.clickable;
            var visibility = props.visibility;
            var minWidth = props.minWidth;
            var minHeight = props.minHeight;
            var elevation = props.elevation;
            if (isNotUndef(gravityProp)) {
                view.setGravity(gravityProp);
            }
            if (debugProp === true) {
                view.setBackground(GradientDrawable({
                    color: parseColor("#FFE5E5E5")
                }));
            }
            if (isNotUndef(backgroundProp)) {
                view.setBackground(backgroundProp);
            }
            if (isNotUndef(alphaProp)) {
                view.setAlpha(alphaProp);
            }
            if (isNotUndef(paddingsProp)) {
                view.setPadding(paddingsProp[0], paddingsProp[1], paddingsProp[2], paddingsProp[3]);
            }
            if (isNotUndef(focusableProp)) {
                view.setFocusable(focusableProp);
            }
            if (isNotUndef(clickableProp)) {
                view.setClickable(clickableProp);
            }
            if (isNotUndef(onClick)) {
                view.setOnClickListener(withs(onClick, Ui));
            }
            if (isNotUndef(visibility)) {
                view.setVisibility(visibility);
            }
            if (isNotUndef(minWidth)) {
                view.setMinWidth(minWidth);
            }
            if (isNotUndef(minHeight)) {
                view.setMinHeight(minHeight);
            }
            if (isNotUndef(elevation)) {
                try {
                    view.setElevation(elevation);
                } catch (e) {}
            }
            if (isNotUndef(layoutParams)) {
                var width = isUndef(layoutParams.width) ? container.width : layoutParams.width;
                var height = isUndef(layoutParams.height) ? container.height : layoutParams.height;

                function layout(params) {
                    var gravityProp = layoutParams.gravity;
                    var marginsProp = layoutParams.margins;
                    var weight = layoutParams.weight;
                    if (isNotUndef(gravityProp)) {
                        params.gravity = gravityProp;
                    }
                    if (isNotUndef(marginsProp)) {
                        params.setMargins(marginsProp[0], marginsProp[1], marginsProp[2], marginsProp[3]);
                    }
                    if (isNotUndef(weight)) {
                        params.weight = weight;
                    }
                }
                if (isLayoutInited) {
                    var params = view.getLayoutParams();
                    params.width = width;
                    params.height = height;
                    container.width = width;
                    container.height = height;
                    layout(params);
                    view.setLayoutParams(params);
                } else {
                    var fn = function(theProps) {
                        var theParams = theProps.layoutParams(width, height);
                        container.width = width;
                        container.height = height;
                        layout(theParams);
                        view.setLayoutParams(theParams);
                        events.unregister(LayoutProps, fn);
                        isLayoutInited = true;
                    }
                    this.register(LayoutProps, fn);
                }
            }
            if (isNotUndef(blur)) {
                view.post(bind(function() {
                    this.send(name, {
                        background: Blur({
                            view: this,
                            radius: blur.radius
                        })
                    });
                }, this));
            }
        });
        var listener = android.view.ViewTreeObserver.OnGlobalLayoutListener(function() {
            requireComponent(events)
                .getViewTreeObserver()
                .removeOnGlobalLayoutListener(listener);
            withs(function() {
                events.send(OnLayoutProps);
            }, Ui)();
            requireComponent(events)
                .getViewTreeObserver()
                .addOnGlobalLayoutListener(listener);
        });
        requireComponent(events)
            .getViewTreeObserver()
            .addOnGlobalLayoutListener(listener);
        return events;
    }

    function defineViewGroup(eventBus, name, viewGroup, container) {
        return eventBus.register(name, function(props) {
            var children = props.children;
            var appendChildren = props.appendChildren;
            var insertChildren = props.insertChildren;
            var removeChildren = props.removeChildren;
            var gravity = props.gravity;
            if (isNotUndef(gravity)) {
                viewGroup.setGravity(gravity);
            }
            if (Array.isArray(children)) {
                viewGroup.removeAllViews();
                for (var index = 0; index < children.length; index++) {
                    var child = children[index];
                    if (isUndef(child)) {
                        continue;
                    }
                    viewGroup.addView(requireComponent(child));
                    try {
                        child.send(LayoutProps, {
                            layoutParams: getClass(viewGroup)
                                .LayoutParams,
                            parent: eventBus
                        });
                    } catch (e) {
                        child.send(LayoutProps, {
                            layoutParams: android.widget.FrameLayout.LayoutParams,
                            parent: eventBus
                        });
                    }
                }
            }
            if (Array.isArray(appendChildren)) {
                for (var index = 0; index < appendChildren.length; index++) {
                    var child = appendChildren[index];
                    if (isUndef(child)) {
                        continue;
                    }
                    viewGroup.addView(requireComponent(child));
                    try {
                        child.send(LayoutProps, {
                            layoutParams: getClass(viewGroup)
                                .LayoutParams,
                            parent: eventBus
                        });
                    } catch (e) {
                        child.send(LayoutProps, {
                            layoutParams: android.widget.FrameLayout.LayoutParams,
                            parent: eventBus
                        });
                    }
                }
            }
            if (Array.isArray(insertChildren)) {
                for (var index = 0; index < insertChildren.length; index++) {
                    var child = insertChildren[index];
                    if (isUndef(child)) {
                        continue;
                    }
                    if (viewGroup.getChildCount() == 0) {
                        viewGroup.addView(requireComponent(child));
                    } else {
                        viewGroup.addView(requireComponent(child), 0);
                    }
                    try {
                        child.send(LayoutProps, {
                            layoutParams: getClass(viewGroup)
                                .LayoutParams,
                            parent: eventBus
                        });
                    } catch (e) {
                        child.send(LayoutProps, {
                            layoutParams: android.widget.FrameLayout.LayoutParams,
                            parent: eventBus
                        });
                    }
                }
            }
            if (Array.isArray(removeChildren)) {
                for (var index = 0; index < removeChildren.length; index++) {
                    var child = removeChildren[index];
                    if (isUndef(child)) {
                        continue;
                    }
                    viewGroup.removeView(requireComponent(child));
                }
            }
        });
    }

    function defineRequireComponent(eventBus, obj) {
        return eventBus.register(RequireComponent, function(callback) {
            callback(obj);
        });
    }

    var ColumnProps = "ColumnProps";

    function Column(props) {
        var column = android.widget.LinearLayout(ctx);
        column.setOrientation(1);

        var container = {
            width: -2,
            height: -2
        };
        var eventBus = new EventBus();

        defineRequireComponent(eventBus, column);
        defineView(eventBus, ColumnProps, column, container);
        defineViewGroup(eventBus, ColumnProps, column, container);
        eventBus.send(ColumnProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    var RowProps = "RowProps";

    function Row(props) {
        var row = android.widget.LinearLayout(ctx);
        row.setOrientation(0);

        var container = {
            width: -2,
            height: -2
        };
        var eventBus = new EventBus();

        defineRequireComponent(eventBus, row);
        defineView(eventBus, RowProps, row, container);
        defineViewGroup(eventBus, RowProps, row, container);
        eventBus.send(RowProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    var StackProps = "StackProps";

    function Stack(props) {
        var stack = android.widget.FrameLayout(ctx);

        var container = {
            width: -2,
            height: -2
        };
        var eventBus = new EventBus();

        defineRequireComponent(eventBus, stack);
        defineView(eventBus, StackProps, stack, container);
        defineViewGroup(eventBus, StackProps, stack, container);
        eventBus.send(StackProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    var TextProps = "TextProps";

    function Text(props) {
        var text = android.widget.TextView(ctx);

        var container = {
            width: -2,
            height: -2
        };

        var eventBus = new EventBus();

        defineRequireComponent(eventBus, text);
        defineView(eventBus, TextProps, text, container);
        eventBus.register(TextProps, function(props) {
            var textProp = props.text;
            var textSizeProp = props.textSize;
            var isSelectableProp = props.isSelectable;
            var colorProp = props.color;
            var shaderProp = props.shader;
            var shadowLayer = props.shadowLayer;
            var singleLineProp = props.singleLine;
            if (isNotUndef(textProp)) {
                text.setText(textProp);
            }
            if (isNotUndef(textSizeProp)) {
                text.setTextSize(textSizeProp);
            }
            if (isNotUndef(colorProp)) {
                text.setTextColor(colorProp);
            }
            if (isNotUndef(shaderProp)) {
                text.getPaint()
                    .setShader(shaderProp);
            }
            if (isNotUndef(isSelectableProp)) {
                text.setTextIsSelectable(isSelectableProp);
            }
            if (isNotUndef(singleLineProp)) {
                text.setSingleLine(singleLineProp);
                text.setEllipsize(android.text.TextUtils.TruncateAt.END);
            }
            if (isNotUndef(shadowLayer)) {
                var radius = isUndef(shadowLayer.radius) ? 0 : shadowLayer.radius;
                var x = isUndef(shadowLayer.x) ? 0 : shadowLayer.x;
                var y = isUndef(shadowLayer.y) ? 0 : shadowLayer.y;
                var color = isUndef(shadowLayer.color) ? 0 : shadowLayer.color;
                text.setShadowLayer(radius, x, y, color);
            }
        });
        eventBus.send(TextProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    var ViewProps = "ViewProps";

    function View(props) {
        var view = android.view.View(ctx);

        var container = {
            width: -2,
            height: -2
        };

        var eventBus = new EventBus();
        defineRequireComponent(eventBus, view);
        defineView(eventBus, ViewProps, view, container);
        eventBus.send(ViewProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    var ColumnScrollProps = "ScrollProps";

    function ColumnScroll(props) {
        var scroll = android.widget.ScrollView(ctx);
        scroll.setVerticalScrollBarEnabled(false);

        var container = {
            width: -2,
            height: -2
        };

        var eventBus = new EventBus();

        defineRequireComponent(eventBus, scroll);
        defineView(eventBus, ColumnScrollProps, scroll, container);
        eventBus.register(ColumnScrollProps, function(props) {
            var fillViewport = props.fillViewport;
            var fadingEdgeOrientation = props.fadingEdgeOrientation;
            var fadingEdgeLength = props.fadingEdgeLength;
            if (fillViewport === true || fillViewport === false) {
                scroll.setFillViewport(fillViewport);
            }
            if (fadingEdgeOrientation == "vertical") {
                scroll.setVerticalFadingEdgeEnabled(true);
            } else if (fadingEdgeOrientation == "horizontal") {
                scroll.setHorizontalFadingEdgeEnabled(true);
            } else if (fadingEdgeOrientation == "full") {
                scroll.setVerticalFadingEdgeEnabled(true);
                scroll.setHorizontalFadingEdgeEnabled(true);
            }
            if (isNotUndef(fadingEdgeLength)) {
                scroll.setFadingEdgeLength(fadingEdgeLength);
            }
        });
        defineViewGroup(eventBus, ColumnScrollProps, scroll, container);
        eventBus.send(ColumnScrollProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    var RowScrollProps = "RowScroll";

    function RowScroll(props) {
        var scroll = android.widget.HorizontalScrollView(ctx);
        scroll.setHorizontalScrollBarEnabled(false);

        var container = {
            width: -2,
            height: -2
        };

        var eventBus = new EventBus();

        defineRequireComponent(eventBus, scroll);
        defineView(eventBus, RowScrollProps, scroll, container);
        eventBus.register(RowScrollProps, function(props) {
            var fillViewport = props.fillViewport;
            var fadingEdgeOrientation = props.fadingEdgeOrientation;
            var fadingEdgeLength = props.fadingEdgeLength;
            if (fillViewport === true || fillViewport === false) {
                scroll.setFillViewport(fillViewport);
            }
            if (fadingEdgeOrientation == "vertical") {
                scroll.setVerticalFadingEdgeEnabled(true);
            } else if (fadingEdgeOrientation == "horizontal") {
                scroll.setHorizontalFadingEdgeEnabled(true);
            } else if (fadingEdgeOrientation == "full") {
                scroll.setVerticalFadingEdgeEnabled(true);
                scroll.setHorizontalFadingEdgeEnabled(true);
            }
            if (isNotUndef(fadingEdgeLength)) {
                scroll.setFadingEdgeLength(fadingEdgeLength);
            }
        });
        defineViewGroup(eventBus, RowScrollProps, scroll, container);
        eventBus.send(RowScrollProps, isUndef(props) ? {} : props);
        return eventBus;
    }

    function Blur(props) {
        props = isUndef(props) ? {} : props;
        var renderScriptClass = android.renderscript.RenderScript;
        var allocationClass = android.renderscript.Allocation;
        if (isNotUndef(props.view)) {
            var view = requireComponent(props.view);
            var renderScript = renderScriptClass.create(view.getContext());
            view.setDrawingCacheEnabled(true);
            var origin = view.getDrawingCache();
            var input = allocationClass.createFromBitmap(renderScript, origin);
            var output = allocationClass.createTyped(renderScript, input.getType());
            var scriptIntrinsicBlur = android.renderscript.ScriptIntrinsicBlur.create(renderScript, android.renderscript.Element.U8_4(renderScript));
            scriptIntrinsicBlur.setRadius(props.radius);
            scriptIntrinsicBlur.setInput(input);
            scriptIntrinsicBlur.forEach(output);
            output.copyTo(origin)
            var bg = android.graphics.Bitmap.createBitmap(origin)
            view.setDrawingCacheEnabled(false);
            return android.graphics.drawable.BitmapDrawable(bg)
        }
    }

    function ValueAnimator(props) {
        props = isUndef(props) ? {} : props;
        var animatorClass = android.animation.ValueAnimator;
        var ofProp = props.ofProp;
        if (isUndef(props.params)) {
            throw new TypeError("Animator params cannot be undefined");
        }
        var params = props.params;
        var animator = animatorClass[ofProp](params);
        var duration = 1000;
        var interpolator = props.interpolator;
        var startDelay = props.startDelay;
        var evaluator = props.evaluator;
        if (props.autoCancel === true) {
            animator.setAutoCancel(true);
        }
        if (isNotUndef(props.duration)) {
            duration = props.duration;
        }
        animator.setDuration(duration);
        if (isNotUndef(startDelay)) {
            animator.setStartDelay(startDelay);
        }
        if (isNotUndef(interpolator)) {
            animator.setInterpolator(interpolator);
        }
        if (isNotUndef(evaluator)) {
            animator.setEvaluator(evaluator);
        }
        animator.addListener({
            onAnimationStart: defFunc(props.onStarted),
            onAnimationEnd: defFunc(props.onFinished)
        });
        if (isNotUndef(props.onUpdate)) {
            animator.addUpdateListener({
                onAnimationUpdate: props.onUpdate
            });
        }
        if (props.start !== false) {
            animator.start();
        }
        return animator;
    }

    function ObjectAnimator(props) {
        props = isUndef(props) ? {} : props;
        var animatorClass = android.animation.ObjectAnimator;
        var ofProp = props.ofProp;
        if (isUndef(props.target)) {
            throw new TypeError("Animator target cannot be undefined");
        }
        if (isUndef(props.prop)) {
            throw new TypeError("Animator prop cannot be undefined");
        }
        if (isUndef(props.params)) {
            throw new TypeError("Animator params cannot be undefined");
        }
        var target = requireComponent(props.target);
        var prop = props.prop;
        var params = props.params;
        var animator = animatorClass[ofProp](target, prop, params);
        var duration = 1000;
        var startDelay = props.startDelay;
        var interpolator = props.interpolator;
        if (props.autoCancel === true) {
            animator.setAutoCancel(true);
        }
        if (isNotUndef(props.duration)) {
            duration = props.duration;
        }
        animator.setDuration(duration);
        if (isNotUndef(startDelay)) {
            animator.setStartDelay(startDelay);
        }
        if (isNotUndef(interpolator)) {
            animator.setInterpolator(interpolator);
        }
        animator.addListener({
            onAnimationStart: defFunc(props.onStarted),
            onAnimationEnd: defFunc(props.onFinished)
        });
        if (props.start !== false) {
            animator.start();
        }
        return animator;
    }

    function RevealAnimator(props) {
        props = isUndef(props) ? {} : props;
        var animatorClass = android.view.ViewAnimationUtils.createCircularReveal;
        var centerX = isNotUndef(props.centerX) ? props.centerX : 0;
        var centerY = isNotUndef(props.centerY) ? props.centerY : 0;
        var startRadius = isNotUndef(props.startRadius) ? props.startRadius : 0;
        var endRadius = isNotUndef(props.endRadius) ? props.endRadius : 0;
        if (isUndef(props.target)) {
            throw new TypeError("Animator target cannot be undefined");
        }
        var target = requireComponent(props.target);
        var animator = animatorClass(target, centerX, centerY, startRadius, endRadius);
        var duration = 1000;
        var startDelay = props.startDelay;
        var interpolator = props.interpolator;
        if (props.autoCancel === true) {
            animator.setAutoCancel(true);
        }
        if (isNotUndef(props.duration)) {
            duration = props.duration;
        }
        animator.setDuration(duration);
        if (isNotUndef(startDelay)) {
            animator.setStartDelay(startDelay);
        }
        if (isNotUndef(interpolator)) {
            animator.setInterpolator(interpolator);
        }
        animator.addListener({
            onAnimationStart: defFunc(props.onStarted),
            onAnimationEnd: defFunc(props.onFinished)
        });
        if (props.start !== false) {
            animator.start();
        }
        return animator;
    }

    function AnimatorSet(props) {
        props = isUndef(props) ? {} : props;
        var animatorSetClass = android.animation.AnimatorSet;
        var animatorSet = animatorSetClass();
        var queue = isUndef(props.queue) ? [] : props.queue;
        var together = isUndef(props.together) ? [] : props.together;
        var startDelay = isUndef(props.startDelay) ? 0 : props.startDelay;
        var delay = props.delay;
        var builder = null;
        for (var index = 0; index < queue.length; index++) {
            if (builder === null) {
                builder = animatorSet.play(queue[index]);
            } else {
                builder.before(queue[index]);
                builder = animatorSet.play(queue[index]);
            }
        }
        animatorSet.playTogether(together);
        animatorSet.setStartDelay(startDelay);
        if (isNotUndef(delay)) {
            animatorSet.setDuration(delay);
        }
        if (props.start === false) {
            return animatorSet;
        } else {
            animatorSet.start();
            return animatorSet;
        }
    }

    function Button(props) {
        props = isUndef(props) ? {} : props;
        var buttonProps = isUndef(props.button) ? {} : props.button;
        var textProps = isUndef(props.text) ? {} : props.text;
        var specialProp = props.special;
        var releaseBackground = GradientDrawable({
            color: parseColor("#FFEFEFEF"),
            radius: dip2px(15)
        });
        var eventBus = Column({
            layoutParams: {
                width: -2,
                height: -2
            },
            focusable: true,
            clickable: true,
            onClick: props.onClick,
            gravity: CENTER,
            background: releaseBackground,
            children: [
            Text({
                text: "",
                textSize: 13,
                paddings: [dip2px(15), dip2px(5), dip2px(15), dip2px(5)],
                gravity: CENTER
            }.copyWith(textProps))
                .register(OnLayoutProps, function() {
                var colors = [parseColor("#828282"), parseColor("#828282"), parseColor("#828282")];
                if (specialProp === true) {
                    colors = [parseColor("#FF9A8B"), parseColor("#FF6A88"), parseColor("#FF99AC")];
                }
                this.send(TextProps, {
                    shader: LinearGradient({
                        colors: colors,
                        endX: requireComponent(this)
                            .getMeasuredWidth(),
                        endY: 0,
                        positions: [0, 0.5, 1]
                    }),
                });
            })]
        }.copyWith(buttonProps));
        return eventBus;
    }

    function Dialog(props) {
        props = isUndef(props) ? {} : props;
        var titleText = props.titleText;
        var titleProp = props.title;
        var children = props.children;
        var leftText = props.leftText;
        var rightText = props.rightText;
        var leftOnClick = props.leftOnClick;
        var rightOnClick = props.rightOnClick;
        var leftButtonProp = props.leftButton;
        var rightButtonProp = props.rightButton;
        var popupProp = props.popup;
        var leftButton = Button({
            button: {
                layoutParams: {
                    width: -1,
                    height: dip2px(35),
                    weight: 1,
                    margins: [dip2px(5), 0, dip2px(5), 0]
                },
                onClick: leftOnClick
            },
            text: {
                color: parseColor("#FF828282"),
                shader: null,
                text: leftText
            },
            special: isUndef(leftButtonProp) ? undefined : leftButtonProp.special
        }.copyWith(leftButtonProp));
        var rightButton = Button({
            button: {
                layoutParams: {
                    width: -1,
                    height: dip2px(35),
                    weight: 1,
                    margins: [dip2px(5), 0, dip2px(5), 0]
                },
                onClick: rightOnClick,
            },
            text: {
                color: parseColor("#FF828282"),
                shader: null,
                text: rightText
            },
            special: isUndef(rightButtonProp) ? undefined : rightButtonProp.special
        }.copyWith(rightButtonProp));
        var buttons = [];
        var minusHeight = 0;
        var contentHeight = 0;
        var buttonLayout = undefined;
        if (isNotUndef(leftText) && isNotUndef(rightText)) {
            buttons.push(leftButton);
            buttons.push(rightButton);
            buttonLayout = Row({
                layoutParams: {
                    width: -1,
                    height: -1,
                    margins: [dip2px(15), dip2px(10), dip2px(15), dip2px(10)]
                },
                children: buttons,
            });
        } else if (isNotUndef(leftText)) {
            buttons.push(leftButton);
            buttonLayout = Row({
                layoutParams: {
                    width: -1,
                    height: -1,
                    margins: [dip2px(15), dip2px(10), dip2px(15), dip2px(10)]
                },
                children: buttons,
            });
        } else if (isNotUndef(rightText)) {
            buttons.push(rightButton);
            buttonLayout = Row({
                layoutParams: {
                    width: -1,
                    height: -1,
                    margins: [dip2px(15), dip2px(10), dip2px(15), dip2px(10)]
                },
                children: buttons,
                // debug: true
            });
        } else {
            minusHeight = dip2px(20);
            contentHeight = dip2px(30);
        }

        return Popup({
            width: W(),
            height: H(),
            focusable: false,
            dismiss: false,
            background: GradientDrawable({
                color: parseColor("#22000000")
            }),
            animation: "Toast",
            contentView: Stack({
                layoutParams: {
                    width: -1,
                    height: -1
                },
                children: [
                Column({
                    layoutParams: {
                        width: W() * 0.45,
                        height: H() * 0.8 - minusHeight,
                        gravity: CENTER
                    },
                    background: GradientDrawable({
                        radius: dip2px(18),
                        color: parseColor("#FFF5F5F7")
                    }),
                    elevation: dip2px(4)
                })
                    .send(ColumnProps, {
                    children: [
                    Text({
                        text: titleText,
                        textSize: 14,
                        color: parseColor("#FF7f7fd5"),
                        gravity: CENTER,
                        layoutParams: {
                            width: -1,
                            height: dip2px(25),
                            margins: [0, dip2px(5), 0, 0]
                        }
                    }.copyWith(titleProp)),
                    View({
                        layoutParams: {
                            width: -1,
                            height: dip2px(2),
                            margins: [dip2px(15), dip2px(5), dip2px(15), 0]
                        },
                        background: GradientDrawable({
                            color: parseColor("#FFE5E5E5"),
                        })
                    }),
                    Column({
                        layoutParams: {
                            width: -1,
                            height: H() * 0.8 - dip2px(97) + contentHeight,
                            margins: [dip2px(20), 0, dip2px(20), dip2px(5)]
                        },
                        children: [
                        Column({
                            layoutParams: {
                                width: -1,
                                height: -1
                            },
                            children: children
                        })]
                    }),
                    buttonLayout]
                })]
            })
        }.copyWith(popupProp));
    }

    var LinearIndicatorProps = "LinearIndicatorProps";

    function LinearIndicator(props) {
        props = isUndef(props) ? {} : props;
        var isGlobalLayout = false;
        var progress = isUndef(props.progress) ? function() {
                return 0;
            } : props.progress;
        var progressValue = 0;
        var width = 0;
        var height = 0;
        var maxWidth = 0;
        var duration = props.duration;
        var isUpdating = false;
        var stack = null;
        var mask = View({
            layoutParams: {
                width: -1,
                height: -1
            },
            background: GradientDrawable({
                radius: [dip2px(10), dip2px(10), dip2px(10), dip2px(10)],
                color: parseColor("#FF7f7fd5")
            })
        })
            .register(OnLayoutProps, function() {
            isGlobalLayout = true;
            var view = requireComponent(mask);
            if (width != view.getWidth()) {
                width = view.getWidth();
                if (maxWidth == 0) {
                    maxWidth = width;
                }
                if (!isUpdating) {
                    stack.send(LinearIndicatorProps, {
                        progress: progress,
                        onProgressed: props.onProgressed,
                        duration: duration
                    });
                }
                isUpdating = false;
            }
            height = view.getHeight();
        });

        stack = Stack({
            layoutParams: {
                width: -1,
                height: dip2px(10)
            }.copyWith(props.layoutParams),
            background: GradientDrawable({
                radius: dip2px(10),
                color: parseColor("#FFEFEFEF")
            }),
            children: [
            mask]
        })
            .register(LinearIndicatorProps, function(props) {
            function handleProps() {
                var progress = props.progress;
                var onProgressed = props.onProgressed;
                var duration = props.duration;
                if (isNotUndef(progress)) {
                    var toWidth = progress(maxWidth);
                    var startRadius = progressValue;
                    if (duration == 0) {
                        if (startRadius < toWidth) {
                            isUpdating = true;
                            mask.send(ViewProps, {
                                layoutParams: {
                                    width: toWidth
                                }
                            });
                        }
                        isUpdating = true;
                        mask.send(ViewProps, {
                            layoutParams: {
                                width: toWidth
                            }
                        });
                        progressValue = toWidth;
                        if (isNotUndef(onProgressed)) {
                            onProgressed();
                        }
                        return;
                    }
                    RevealAnimator({
                        centerX: 0,
                        centerY: height / 2,
                        startRadius: startRadius,
                        endRadius: toWidth,
                        target: mask,
                        duration: duration,
                        interpolator: android.view.animation.AccelerateDecelerateInterpolator(),
                        onStarted: function() {
                            if (startRadius < toWidth) {
                                isUpdating = true;
                                mask.send(ViewProps, {
                                    layoutParams: {
                                        width: toWidth
                                    }
                                });
                            }
                        },
                        onFinished: function() {
                            isUpdating = true;
                            mask.send(ViewProps, {
                                layoutParams: {
                                    width: toWidth
                                }
                            });
                            progressValue = toWidth;
                            if (isNotUndef(onProgressed)) {
                                onProgressed();
                            }
                        }
                    });
                }
            }
            if (isGlobalLayout) {
                handleProps();
            } else {
                var fn = function() {
                    handleProps();
                    mask.unregister(OnLayoutProps, fn);
                }
                mask.register(OnLayoutProps, fn);
            }
        });
        return stack;
    }

    function Ripple(props) {
        props = isUndef(props) ? {} : props;
        var x = isUndef(props.x) ? W() / 2 : props.x;
        var y = isUndef(props.y) ? H() / 2 : props.y;
        var duration = isUndef(props.duration) ? 1000 : props.duration;
        var popup = null;
        var view = Column({
            background: GradientDrawable({
                color: parseColor("#afffffff")
            })
        })
            .register(OnLayoutProps, function() {
            AnimatorSet({
                together: [
                RevealAnimator({
                    centerX: x,
                    centerY: y,
                    startRadius: 0,
                    endRadius: H() * 1.2,
                    duration: duration,
                    target: view,
                    start: false
                }),
                ObjectAnimator({
                    ofProp: "ofFloat",
                    prop: "alpha",
                    params: [1, 0],
                    duration: duration,
                    target: view,
                    start: false,
                    onFinished: function() {
                        popup.send(PopupProps, {
                            dismiss: true
                        });
                    }
                })],
                start: true
            });
        });
        popup = Popup({
            width: W(),
            height: H(),
            focusable: false,
            background: null,
            contentView: view
        });
        return popup;
    }

    var runOnUiThreadErrorFn = function(error) {
        function getErrorType() {
            if (error instanceof EvalError) {
                return "EvalError";
            }
            if (error instanceof RangeError) {
                return "RangeError";
            }
            if (error instanceof ReferenceError) {
                return "ReferenceError";
            }
            if (error instanceof SyntaxError) {
                return "SyntaxError";
            }
            if (error instanceof TypeError) {
                return "TypeError";
            }
            if (error instanceof URIError) {
                return "URIError";
            }
            if (error instanceof Error) {
                return "Error";
            }
            return "UnknownError";
        }
        var eventBus = Dialog({
            titleText: "预料之外的错误",
            children: [
            ColumnScroll({
                fadingEdgeOrientation: "vertical",
                fadingEdgeLength: dip2px(15),
                children: [
                Text({
                    text: [
                        "An unexpected error happened in Main Thread: ",
                        "Type: " + getErrorType(),
                        "Messages: " + error.message,
                        "LineNumber: " + error.lineNumber,
                        "File: " + error.fileName,
                        "Stack: " + error.stack,
                        "Please report to the developer."].join("\n"),
                    textSize: 12,
                    color: parseColor("#FF212121")
                })]
            })],
            leftText: "Sure",
            leftOnClick: function() {
                eventBus.send(PopupProps, {
                    dismiss: true
                });
            },
            rightText: "Throw",
            rightOnClick: function() {
                eventBus.send(PopupProps, {
                    dismiss: true
                });
                (new java.lang.Thread(function() {
                    throw error;
                }))
                    .start();
            },
        });
    }
    register(RunOnUiThreadError, runOnUiThreadErrorFn);

    var prepare = withs(function() {
        var text = Text({
            color: parseColor("#FFFFFF"),
            textSize: 18,
            gravity: CENTER,
            alpha: 1,
            text: "MuCuteJS",
            paddings: [dip2px(5), 0, dip2px(5), 0],
            blur: {
                radius: 3
            },
            shadowLayer: {
                x: 1,
                y: 1,
                radius: 5,
                color: parseColor("#FFFFFFFF")
            }
        });

        var layout = Column({
            children: [text],
            gravity: CENTER,
            background: GradientDrawable({
                colors: [parseColor("#FF9A8B"), parseColor("#FF6A88"), parseColor("#FF99AC")],
                orientation: "TL_BR"
            })
        });

        var popup = Popup({
            width: W(),
            height: H(),
            gravity: CENTER,
            contentView: layout,
            animation: "InputMethod",
            background: null,
            dismiss: false
        });

        function fade(fromAlpha, toAlpha, onFinished, startDelay) {
            return ObjectAnimator({
                ofProp: "ofFloat",
                target: text,
                prop: "alpha",
                params: [fromAlpha, toAlpha],
                duration: 1000,
                onFinished: onFinished,
                startDelay: startDelay,
                start: false
            });
        }

        function crossFades(textArray, onFinished) {
            var queue = [];
            for (var index = 0; index < textArray.length; index++) {
                queue.push(fade(1, 0, (function(curr) {
                    return function() {
                        text.send(TextProps, {
                            text: textArray[curr],
                            background: null,
                            blur: {
                                radius: 3
                            }
                        });

                    }
                })(index), 1500));
                if (index + 1 >= textArray.length) {
                    queue.push(fade(0, 1, onFinished, 0));
                } else {
                    queue.push(fade(0, 1, undefined, 0));
                }
            }
            return AnimatorSet({
                queue: queue,
                start: true
            });
        }

        crossFades([
            "A cute mod for minecraftpe",
            "2023 SuMuCheng All Rights Reserved",
            "For code, for every",
            "Welcome"], function() {
            // When complete
            delayed(function() {
                writeText("init", "");
                popup.send(PopupProps, {
                    dismiss: true
                });

                // launch main
                send("Tips");
            }, 800);
        });
    }, Ui);

    register("Tips", withs(function() {
        var indicator = LinearIndicator({
            duration: 0,
            progress: function(width) {
                return 0;
            }
        });

        var progressText = Text({
            text: "Loading core....",
            textSize: 14,
            color: parseColor("#FFCFCFCF"),
            gravity: LEFT | CENTER,
            layoutParams: {
                weight: 1,
                width: -1,
                height: -2,
                gravity: CENTER
            }
        });

        var stepText = Text({
            text: "0/4",
            textSize: 14,
            color: parseColor("#FFCFCFCF"),
            gravity: RIGHT | CENTER,
            layoutParams: {
                weight: 1,
                width: -1,
                height: -2,
                gravity: CENTER
            }
        });

        var dialog = Dialog({
            titleText: "正在注入 MuCuteJS",
            children: [
            Column({
                layoutParams: {
                    width: -1,
                    height: -1
                },
                children: [
                Stack({
                    layoutParams: {
                        width: -1,
                        height: -1,
                        weight: 0.1
                    },
                    children: [ColumnScroll({
                        fillViewport: true,
                        fadingEdgeOrientation: "vertical",
                        fadingEdgeLength: dip2px(15),
                        children: [
                        Text({
                            text: parseHtml([
                                "关于用户界面: <font color=#7f7fd5>MuCuteUI</font>（又名: 萌萌 UI）是一个 ModPE 的用户界面",
                                "它的优势: 最先进的声明式写法, 通过 EventBus + Composable 实现组件的任意组合与一键更新状态",
                                "介绍: MuCuteJS 是一款 ModPE, 它未使用任何以前的 ModPE 封装调用与算法, 并且使用了新的 Android 界面技术",
                                "MuCuteJS x MuCuteUI 官方群: 204677717, 欢迎加入交流",
                                "作者: 苏沐橙（SuMuCheng）",
                                "联系我: QQ > 3578557729",
                                "<strong><font color=#7f7fd5>2023 SuMuCheng All Rights Reserved</font></strong>"].join("<br/>")),
                            textSize: 12,
                            color: parseColor("#FF212121")
                        })]
                    })]
                }),
                Column({
                    layoutParams: {
                        width: -1,
                        height: -1,
                        weight: 0.45,
                        margins: [0, dip2px(5), 0, 0]
                    },
                    children: [
                    indicator,
                    Row({
                        layoutParams: {
                            width: -1,
                            height: -2,
                        },
                        children: [
                        progressText,
                        stepText]
                    })]
                })]
            })],
        });

        // Skip the animation
        var debug = false;
        if (!debug) {
            delayed(function() {
                indicator.send(LinearIndicatorProps, {
                    progress: function(width) {
                        return width * 0.25;
                    }
                })
                stepText.send(TextProps, {
                    text: "1/4"
                })
            }, 1000);

            delayed(function() {
                indicator.send(LinearIndicatorProps, {
                    progress: function(width) {
                        return width * 0.5;
                    }
                })
                stepText.send(TextProps, {
                    text: "2/4"
                })
            }, 3000);

            delayed(function() {
                indicator.send(LinearIndicatorProps, {
                    progress: function(width) {
                        return width * 0.75;
                    }
                })
                stepText.send(TextProps, {
                    text: "3/4"
                })
            }, 5000);

            delayed(function() {
                indicator.send(LinearIndicatorProps, {
                    progress: function(width) {
                        return width;
                    }
                })
                stepText.send(TextProps, {
                    text: "4/4"
                })
            }, 7000);

            delayed(function() {
                openFloatButton();
            }, 9000);
        } else {
            openFloatButton();
        }

        function openFloatButton() {
            dialog.send(PopupProps, {
                dismiss: true
            });
            send("FloatButtonProps");
            Tip({
                text: "长按浮动按钮进行拖动, 轻点浮动按钮开启 ClickGUI"
            });
        }
    }, Ui));

    // If is first launch
    if (!exists("init")) {
        prepare();
    } else {
        withs(function() {
            send("FloatButtonProps");
            Tip({
                text: "长按浮动按钮进行拖动, 轻点浮动按钮开启 ClickGUI"
            });
        }, Ui)();
    }

    var TipProps = "TipProps";
    register(TipProps, function(props) {
        var popup = null;
        var view = Column({
            gravity: CENTER,
            alpha: 0,
            children: [Column({
                layoutParams: {
                    width: -1,
                    height: -1,
                    gravity: CENTER,
                    margins: [dip2px(15), dip2px(15), dip2px(15), dip2px(15)]
                },
                background: GradientDrawable({
                    color: parseColor("#FFF5F5F7"),
                    radius: dip2px(40)
                }),
                elevation: dip2px(6),
                children: [
                RowScroll({
                    layoutParams: {
                        width: -2,
                        height: -1,
                        margins: [dip2px(15), dip2px(10), dip2px(15), dip2px(10)]
                    },
                    fadingEdgeOrientation: "horizontal",
                    fadingEdgeLength: dip2px(15),
                    children: [
                    Text({
                        layoutParams: {
                            gravity: CENTER,
                            width: -2,
                            height: -1
                        },
                        text: props.text,
                        textSize: 10,
                        minWidth: dip2px(200),
                        color: parseColor("#FF212121"),
                        gravity: CENTER
                    })]
                })]
            })]
        });

        ObjectAnimator({
            ofProp: "ofFloat",
            prop: "alpha",
            params: [0, 1],
            target: view,
            duration: 500,
            onFinished: function() {
                delayed(function() {
                    ObjectAnimator({
                        ofProp: "ofFloat",
                        prop: "alpha",
                        params: [1, 0],
                        target: view,
                        duration: 500,
                        onFinished: function() {
                            popup.send(PopupProps, {
                                dismiss: true
                            });
                        }
                    })
                }, 2000);
            }
        });

        popup = Popup({
            width: -2,
            height: -2,
            focusable: false,
            contentView: view,
            background: null,
            gravity: TOP | CENTER
        });
    });

    function Tip(props) {
        send(TipProps, props);
    }

    var VibratorProps = "VibratorProps";
    register(VibratorProps, function(props) {
        props = isUndef(props) ? {} : props;
        var value = isUndef(props.value) ? 50 : props.value;
        var vibrator = ctx.getSystemService(android.content.Context.VIBRATOR_SERVICE);
        vibrator.vibrate(value);
    })

    register("FloatButtonProps", function() {
        var popup = null;
        var x = W() - dip2px(50);
        var y = H() - H() / 1.5;
        var container = {
            openGUI: false
        };
        var contentView = Column({
            background: GradientDrawable({
                color: parseColor("#FFF5F5F7"),
                radius: dip2px(35)
            }),
            focusable: true,
            clickable: true,
            onClick: function() {
                if (!container.openGUI) {
                    container.popup = popup;
                    container.x = x;
                    container.y = y;
                    send("OpenGUIProps", container);
                    popup.send(PopupProps, {
                        dismiss: true
                    });
                }
            },
            children: [
            Column({
                layoutParams: {
                    width: -1,
                    height: -1,
                    margins: [dip2px(5), dip2px(5), dip2px(5), dip2px(5)]
                },
                background: GradientDrawable({
                    colors: [parseColor("#b993d6"), parseColor("#8ca6db")],
                    radius: dip2px(25),
                    orientation: "BR_TL",
                    type: "Linear"
                }),
                children: [
                View({
                    layoutParams: {
                        width: -1,
                        height: -1,
                        margins: [dip2px(8), dip2px(8), dip2px(8), dip2px(8)]
                    },
                    background: GradientDrawable({
                        color: parseColor("#FFF5F5F7"),
                        radius: dip2px(10),
                        orientation: "BR_TL",
                        type: "Linear"
                    })
                })]
            })]
        });

        var downX = 0;
        var downY = 0;
        var moveX = 0;
        var moveY = 0;
        var vector = 0.3;
        var longClickDown = false;
        var popupComponent = null;
        var contentViewComponent = requireComponent(contentView);
        contentViewComponent.setOnTouchListener(function(view, event) {
            if (!longClickDown) {
                downX = event.getX();
                downY = event.getY();
            }
            if (longClickDown) {
                switch (event.getAction()) {

                    case 1:
                        longClickDown = false;
                        break;

                    case 2:
                        moveX = parseInt(event.getX() - downX) * vector;
                        moveY = parseInt(event.getY() - downY) * vector;
                        x = x + moveX;
                        y = y + moveY;
                        if (popupComponent === null) {
                            popupComponent = requireComponent(popup);
                        }
                        popupComponent.update(x, y, -1, -1);
                        break;
                }
            }
            return false;
        });

        contentViewComponent.setOnLongClickListener(function() {
            send(VibratorProps);
            longClickDown = true;
            Ripple({
                x: x + dip2px(17.5),
                y: y + dip2px(15.5)
            });
            return true;
        });

        popup = Popup({
            width: dip2px(35),
            height: dip2px(35),
            background: null,
            contentView: contentView,
            gravity: LEFT | TOP,
            pos: [x, y],
            animation: "Dialog"
        });
    });

    var GroupProps = "GroupProps";

    function Group(props) {
        props = isUndef(props) ? {} : props;
        var animatedText = props.animatedText;
        var textProp = {
            textSize: 12,
            color: parseColor("#828282"),
            layoutParams: {
                gravity: CENTER,
                margins: [dip2px(5), dip2px(5), dip2px(5), dip2px(5)]
            }
        }.copyWith(props.text);
        var text = Text(textProp);
        var buttonProp = {
            layoutParams: {
                width: -1,
                height: dip2px(30),
                margins: [dip2px(5), 0, dip2px(5), dip2px(15)]
            },
            gravity: CENTER,
            focusable: true,
            clickable: true,
            background: GradientDrawable({
                color: parseColor("#FFEFEFEF"),
                radius: dip2px(10)
            }),
            children: [text]
        }.copyWith(props.button);

        return Column(buttonProp)
            .register(GroupProps, function(props) {
            if (isNotUndef(props.text)) {
                if (animatedText) {
                    ObjectAnimator({
                        ofProp: "ofFloat",
                        prop: "alpha",
                        params: [1, 0],
                        target: text,
                        duration: 100,
                        onFinished: function() {
                            text.send(TextProps, textProp.copyWith(props.text));
                            ObjectAnimator({
                                ofProp: "ofFloat",
                                prop: "alpha",
                                params: [0, 1],
                                target: text,
                                duration: 100
                            });
                        }
                    });
                } else {
                    text.send(TextProps, textProp.copyWith(props.text));
                }
            }
            if (isNotUndef(props.button)) {
                this.send(ColumnProps, buttonProp.copyWith(props.button));
            }
        });
    }

    register("OpenGUIProps", function(container) {
        var popup = null;
        var page = Column({
            layoutParams: {
                width: -1,
                height: -1
            }
        });
        var title = Text({
            text: "Player",
            textSize: 16,
            color: parseColor("#FF9696D5"),
            singleLine: true
        });
        var root = Column({
            layoutParams: {
                width: -1,
                height: -1,
                margins: [dip2px(10), dip2px(15), dip2px(10), dip2px(15)]
            },
            children: [
            title,
            ColumnScroll({
                layoutParams: {
                    width: -1,
                    height: -1,
                    margins: [0, dip2px(15), 0, 0]
                },
                fadingEdgeOrientation: "vertical",
                fadingEdgeLength: dip2px(15),
                children: [
                page]
            })]
        });

        function updateClickGUIGroup(type) {
            ObjectAnimator({
                ofProp: "ofFloat",
                prop: "alpha",
                params: [1, 0],
                target: root,
                duration: 80,
                onFinished: function() {
                    title.send(TextProps, {
                        text: type
                    });
                    send("ClickGUIGroup", {
                        type: type,
                        content: page
                    });
                    ObjectAnimator({
                        ofProp: "ofFloat",
                        prop: "alpha",
                        params: [0, 1],
                        target: root,
                        duration: 80
                    });
                }
            });
        }

        var content = Row({
            layoutParams: {
                width: W() * 0.7,
                height: H() * 0.75,
                gravity: CENTER
            },
            alpha: 0,
            background: GradientDrawable({
                color: parseColor("#FFF5F5F7"),
                radius: dip2px(8)
            }),
            elevation: dip2px(4),
            children: [
            Column({
                layoutParams: {
                    width: W() * 0.7 * 0.25,
                    height: -1,
                    margins: [dip2px(10), dip2px(15), 0, dip2px(15)]
                },
                children: [
                Text({
                    text: "ClickGUI",
                    textSize: 16,
                    color: parseColor("#FF7f7fd5"),
                    focsuable: true,
                    clickable: true,
                    singleLine: true,
                    layoutParams: {
                        width: -2,
                        height: -2,
                        gravity: CENTER | TOP
                    },
                    paddings: [dip2px(5), 0, dip2px(5), 0],
                    shadowLayer: {
                        x: 0,
                        y: 0,
                        color: parseColor("#FF7f7fd5"),
                        radius: 3
                    },
                    onClick: function() {
                        container.popup.send(PopupProps, {
                            dismiss: false,
                            updatePos: [container.x, container.y]
                        });
                        ObjectAnimator({
                            ofProp: "ofFloat",
                            prop: "alpha",
                            params: [1, 0],
                            duration: 200,
                            target: content,
                            onFinished: function() {
                                popup.send(PopupProps, {
                                    dismiss: true
                                });
                                container.openGUI = false;
                            }
                        });
                    }
                }),
                ColumnScroll({
                    layoutParams: {
                        width: -1,
                        height: -1,
                        margins: [0, dip2px(15), 0, 0]
                    },
                    fadingEdgeOrientation: "vertical",
                    fadingEdgeLength: dip2px(15),
                    children: [
                    Column({
                        children: [
                        Group({
                            text: {
                                text: "Player",
                                singleLine: true
                            },
                            button: {
                                onClick: function() {
                                    updateClickGUIGroup("Player");
                                }
                            }
                        }),
                        Group({
                            text: {
                                text: "PVP",
                                singleLine: true
                            },
                            button: {
                                onClick: function() {
                                    updateClickGUIGroup("PVP");
                                }
                            }
                        }),
                        Group({
                            text: {
                                text: "World",
                                singleLine: true
                            },
                            button: {
                                onClick: function() {
                                    updateClickGUIGroup("World");
                                }
                            }
                        }),
                        Group({
                            text: {
                                text: "Common",
                                singleLine: true
                            },
                            button: {
                                onClick: function() {
                                    updateClickGUIGroup("Common");
                                }
                            }
                        }),
                        Group({
                            text: {
                                text: "Extra",
                                singleLine: true
                            },
                            button: {
                                onClick: function() {
                                    updateClickGUIGroup("Extra");
                                }
                            }
                        }),
                        Group({
                            text: {
                                text: "Settings",
                                singleLine: true
                            },
                            button: {
                                onClick: function() {
                                    updateClickGUIGroup("Settings");
                                }
                            }
                        })]
                    })]
                })]
            }),
            View({
                layoutParams: {
                    width: dip2px(2),
                    height: -1,
                    margins: [dip2px(10), dip2px(10), 0, dip2px(10)],
                },
                background: GradientDrawable({
                    color: parseColor("#FFE5E5E5"),
                })
            }),
            root]
        });

        title.send(TextProps, {
            text: "Player"
        });
        send("ClickGUIGroup", {
            type: "Player",
            content: page
        });

        ObjectAnimator({
            ofProp: "ofFloat",
            prop: "alpha",
            params: [0, 1],
            duration: 200,
            target: content
        });

        var view = Column({
            gravity: CENTER,
            children: [
            content]
        });

        popup = Popup({
            width: W(),
            height: H(),
            focusable: false,
            background: GradientDrawable({
                color: parseColor("#22000000")
            }),
            contentView: view,
            gravity: CENTER | CENTER
        });
    });

    register("ClickGUIGroup", function(props) {
        var type = props.type;
        var content = props.content;
        if (isUndef(props[type])) {
            send("GUIGroup" + type, {
                content: content,
                container: props
            });
        }
        content.send(ColumnProps, {
            children: [props[type]]
        });
    });

    function ButtonItem(props) {
        props = isUndef(props) ? {} : props;

        var stateful = props.stateful;
        var onClick = props.onClick;
        var onChecked = props.onChecked;
        var isChecked = isUndef(props.isChecked) ? false : props.isChecked;
        var button = null;
        var buttonProps = {
            layoutParams: {
                width: dip2px(60),
                height: dip2px(30),
                gravity: CENTER | RIGHT
            },
            focusable: true,
            clickable: true,
            onClick: function() {
                if (stateful === true) {
                    isChecked = !isChecked;
                    button.send(GroupProps, {
                        text: {
                            text: isChecked ? "On" : "Off",
                            color: isChecked ? parseColor("#FF7f7fd5") : parseColor("#828282")
                        }
                    });

                    if (isNotUndef(onChecked)) {
                        onChecked(isChecked);
                    }
                }
                if (isNotUndef(onClick)) {
                    onClick();
                }
            }
        };

        button = Group({
            text: {
                text: stateful === true ? (isChecked ? "On" : "Off") : props.buttonText,
                color: isChecked ? parseColor("#FF7f7fd5") : parseColor("#828282"),
                singleLine: true
            },
            button: buttonProps,
            animatedText: true
        });
        return Row({
            layoutParams: {
                width: -1,
                height: -2,
                margins: [0, 0, 0, dip2px(15)]
            },
            children: [
            Column({
                layoutParams: {
                    width: -1,
                    height: -2,
                    weight: 1
                },
                children: [
                Text({
                    text: props.title,
                    textSize: 12,
                    singleLine: true,
                    color: parseColor("#6E6E6E") // #828282
                }),
                Text({
                    layoutParams: {
                        margins: [0, dip2px(3), 0, 0]
                    },
                    text: props.description,
                    textSize: 10,
                    singleLine: true,
                    color: parseColor("#828282") // #828282
                }), ]
            }),
            Column({
                layoutParams: {
                    width: -1,
                    height: -2,
                    weight: 3,
                    margins: [dip2px(15), 0, 0, 0],
                    gravity: CENTER
                },
                children: [
                button]
            })]
        });
    }

    function SwitchItem(props) {
        props = isUndef(props) ? {} : props;

        var switchInstance = null
        var switchProps = {
            layoutParams: {
                width: dip2px(60),
                height: dip2px(30),
                gravity: CENTER | RIGHT
            },
            focusable: true,
            clickable: true,
            onChecked: function(isChecked) {
                if (isNotUndef(props.onChecked)) {
                    props.onChecked(isChecked);
                }
            }
        };
        switchInstance = Switch({
            button: switchProps,
            isChecked: props.isChecked,
            onChecked: props.onChecked
        });

        return Row({
            layoutParams: {
                width: -1,
                height: -2,
                margins: [0, 0, 0, dip2px(15)]
            },
            children: [
            Column({
                layoutParams: {
                    width: -1,
                    height: -2,
                    weight: 1
                },
                children: [
                Text({
                    text: props.title,
                    textSize: 12,
                    singleLine: true,
                    color: parseColor("#6E6E6E") // #828282
                }),
                Text({
                    layoutParams: {
                        margins: [0, dip2px(3), 0, 0]
                    },
                    text: props.description,
                    textSize: 10,
                    singleLine: true,
                    color: parseColor("#828282") // #828282
                }), ]
            }),
            Column({
                layoutParams: {
                    width: -1,
                    height: -2,
                    weight: 3,
                    margins: [dip2px(15), 0, 0, 0],
                    gravity: CENTER
                },
                children: [
                switchInstance]
            })]
        });
    }

    var SliderProps = "SliderProps";

    function Slider(props) {
        props = isUndef(props) ? {} : props;

        var SeekBarProps = "SeekBarProps";

        function SeekBar(props) {
            var seekBar = android.widget.SeekBar(ctx);
            seekBar.setProgressDrawable(null);
            seekBar.setThumb(null);
            seekBar.setBackground(null);

            var container = {
                width: -1,
                height: -2
            };

            var eventBus = new EventBus();
            defineRequireComponent(eventBus, seekBar);
            defineView(eventBus, SeekBarProps, seekBar, container);
            eventBus.register(SeekBarProps, function(props) {
                if (isNotUndef(props.max)) {
                    seekBar.setMax(props.max);
                }
                if (isNotUndef(props.progress)) {
                    seekBar.setProgress(props.progress);
                }
                if (isNotUndef(props.onChange)) {
                    seekBar.setOnSeekBarChangeListener(android.widget.SeekBar.OnSeekBarChangeListener({
                        onProgressChanged: props.onChange
                    }));
                }
            });
            eventBus.send(SeekBarProps, isUndef(props) ? {} : props);
            return eventBus;
        }

        var normalMax = props.max;
        var normalProgress = props.progress;
        if (isNotUndef(props.max) && isNotUndef(props.min)) {
            normalMax = props.max - props.min;
            if (isNotUndef(props.progress) && props.progress < props.min) {
                normalProgress = 0;
            } else if (isNotUndef(props.progress)) {
                normalProgress = props.progress - props.min;
            }
        }

        var seekBar = SeekBar({
            max: normalMax,
            progress: normalProgress,
            onChange: function(seekBar, progress) {
                linearIndicator.send(LinearIndicatorProps, {
                    duration: 0,
                    progress: function(width) {
                        return width * seekBar.getProgress() / seekBar.getMax();
                    }
                });
                if (isNotUndef(props.onProgress)) {
                    if (isNotUndef(props.min)) {
                        props.onProgress(progress + props.min);
                    } else {
                        props.onProgress(progress);
                    }
                }
            },
            layoutParams: {
                width: -1,
                height: -1
            }
        });
        var seekBarView = requireComponent(seekBar);
        var linearIndicator = LinearIndicator({
            duration: 0,
            progress: function(width) {
                return width * seekBarView.getProgress() / seekBarView.getMax();
            }
        });
        return Stack({
            layoutParams: {
                width: -1,
                height: -2,
                margins: [0, dip2px(5), 0, 0]
            },
            children: [
            linearIndicator,
            seekBar]
        }.copyWith(props));
    }

    function Switch(props) {
        props = isUndef(props) ? {} : props;
        var rootWidth = 0;
        var isChecked = props.isChecked;
        var root = null;
        var cached = {};
        var view = View({
            background: GradientDrawable({
                color: parseColor("#FFFFFFFF"),
                radius: dip2px(30)
            }),
            layoutParams: {
                width: dip2px(12),
                height: -1,
                gravity: CENTER,
                margins: [dip2px(10), dip2px(9), dip2px(10), dip2px(9)]
            }
        });

        function updateState() {
            if (isChecked) {
                AnimatorSet({
                    together: [
                    ValueAnimator({
                        ofProp: "ofArgb",
                        params: [parseColor("#FFEFEFEF"), parseColor("#FF7f7fd5")],
                        duration: 200,
                        interpoator: android.view.animation.AccelerateDecelerateInterpolator(),
                        onUpdate: function(animator) {
                            cached.background = GradientDrawable({
                                color: animator.animatedValue,
                                radius: dip2px(15)
                            });
                            root.send(RowProps, cached);
                        },
                        start: false
                    }),
                    ValueAnimator({
                        ofProp: "ofInt",
                        params: [dip2px(12), rootWidth - dip2px(22)],
                        duration: 200,
                        interpoator: android.view.animation.AccelerateDecelerateInterpolator(),
                        onUpdate: function(animator) {
                            requireComponent(view)
                                .setX(animator.animatedValue)
                        },
                        start: false
                    })]
                });
            } else {
                AnimatorSet({
                    together: [
                    ValueAnimator({
                        ofProp: "ofArgb",
                        params: [parseColor("#FF7f7fd5"), parseColor("#FFEFEFEF")],
                        duration: 200,
                        interpoator: android.view.animation.AccelerateDecelerateInterpolator(),
                        onUpdate: function(animator) {
                            cached.background = GradientDrawable({
                                color: animator.animatedValue,
                                radius: dip2px(15)
                            });
                            root.send(RowProps, cached);
                        },
                        start: false
                    }),
                    ValueAnimator({
                        ofProp: "ofInt",
                        params: [rootWidth - dip2px(22), dip2px(12)],
                        duration: 200,
                        interpoator: android.view.animation.AccelerateDecelerateInterpolator(),
                        onUpdate: function(animator) {
                            requireComponent(view)
                                .setX(animator.animatedValue)
                        },
                        start: false
                    })]
                });
            }
        }

        var fn = function() {
            rootWidth = requireComponent(this)
                .getWidth();
            this.unregister(OnLayoutProps);
        }

        root = Row({
            layoutParams: {
                width: -1,
                height: dip2px(30),
                margins: [dip2px(5), 0, dip2px(5), dip2px(15)]
            },
            gravity: isChecked ? RIGHT : LEFT,
            background: GradientDrawable({
                color: isChecked ? parseColor("#FF7f7fd5") : parseColor("#FFEFEFEF"),
                radius: dip2px(15)
            }),
            onClick: function() {
                isChecked = !isChecked;
                updateState();
                if (isNotUndef(props.onChecked)) {
                    props.onChecked(isChecked);
                }
            },
            children: [
            view],
        }.copyWith(props.button))
            .register(OnLayoutProps, fn);
        return root;
    }

    var Config = (function() {
        if (!exists("config.conf")) {
            writeText("config.conf", "");
        }

        var text = readText("config.conf");
        var configs = text.split("\n");
        var copiedWithObject = {};

        for (var index = 0; index < configs.length; index++) {
            var lineText = configs[index];
            var splitCharIndex = lineText.indexOf("=");
            if (splitCharIndex < 0) {
                continue;
            }
            var key = lineText.substring(0, splitCharIndex);
            var value = lineText.substring(splitCharIndex + 1, lineText.length);

            if (value == "true") {
                copiedWithObject[key] = true;
            } else if (value == "false") {
                copiedWithObject[key] = false;
            } else {
                var num = Number(value);
                if (!isNaN(num)) {
                    copiedWithObject[key] = num;
                } else {
                    copiedWithObject[key] = value;
                }
            }
        }

        return {
            airJump: 0.6,
            autoClick: 30,
            jet: 30,
            walk: 30,
            speed: 40,
            suprtSpeed: 3,
            aimbot: 30,
            aimbotOptions: 0,
            aimbotRadius: 6,
            serverMode: true,
            exp: 32000,
            reachDiameter: 12,
            reachHeight: 6,
            notification: true,
        }.copyWith(copiedWithObject);
    })();

    var ConfigUtils = {
        save: function() {
            java.lang.Thread(function() {
                try {
                    var arr = [];
                    for (key in Config) {
                        arr.push(key + "=" + Config[key]);
                    }
                    writeText("config.conf", arr.join("\n"));
                } catch (e) {}
            })
                .start();
        },
        exports: function(callback) {
            callback = callback ? callback : function() {};
            java.lang.Thread(function() {
                try {
                    var arr = [];
                    for (key in Config) {
                        arr.push(key + "=" + Config[key]);
                    }
                    writeTextSD("/storage/emulated/0/MuCuteJS.conf", arr.join("\n"));
                    callback();
                } catch (e) {
                    callback(e);
                }
            })
                .start();
        },
        imports: function(callback) {
            callback = callback ? callback : function() {};
            java.lang.Thread(function() {
                try {
                    var conf = readTextSD("/storage/emulated/0/MuCuteJS.conf");
                    writeText("config.conf", conf);
                    callback();
                } catch (e) {
                    callback(e);
                }
            })
                .start();
        },
        clear: function() {
            writeText("config.conf", "");
        }
    };

    var playerContainer = {};
    register("GUIGroupPlayer", function(props) {
        var content = props.content;

        props.container.Player = Column({
            children: [
            SwitchItem({
                title: "一键飞行",
                description: "启用一键飞行浮动按钮",
                isChecked: playerContainer.flyChecked,
                onChecked: function(isChecked) {
                    addNotification({
                        title: "Player Module",
                        message: "Easy fly - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            type: "fly",
                            text: "飞",
                            container: playerContainer,
                            onClick: function() {
                                Entity.setVelY(getPlayerEnt(), 1);
                                Player.setFlying(true);
                            }
                        });
                    } else {
                        playerContainer.fly.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.flyChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键踏空",
                description: "启用一键踏空浮动按钮",
                isChecked: playerContainer.jumpChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "Player Module",
                        message: "Air Jump - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            type: "jump",
                            text: "踏",
                            container: playerContainer,
                            onClick: function() {
                                Entity.setVelY(getPlayerEnt(), Config.airJump);
                            }
                        });
                    } else {
                        playerContainer.jump.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.jumpChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键冲刺",
                description: "启用一键冲刺按钮",
                isChecked: playerContainer.suprtChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "Player Module",
                        message: "Suprt - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            type: "suprt",
                            text: "冲",
                            container: playerContainer,
                            onClick: function() {
                                var player = getPlayerEnt();
                                setVelX(player, getFaceXSpeed() * Config.suprtSpeed);
                                setVelY(player, getFaceYSpeed() * Config.suprtSpeed);
                                setVelZ(player, getFaceZSpeed() * Config.suprtSpeed);
                            }
                        });
                    } else {
                        playerContainer.suprt.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.suprtChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键喷气",
                description: "启用一键喷气按钮",
                isChecked: playerContainer.jetChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "Player Module",
                        message: "Jet Pack - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            stateful: true,
                            type: "jet",
                            text: "喷",
                            container: playerContainer,
                            isChecked: playerContainer.jetFloatButtonIsChecked,
                            onChecked: function(isChecked) {
                                if (isChecked) {
                                    var player = getPlayerEnt();
                                    pvpContainer.jetThread = java.lang.Thread(function() {
                                        while (!java.lang.Thread.currentThread()
                                            .isInterrupted()) {
                                            try {
                                                java.lang.Thread.currentThread()
                                                    .sleep(Config.jet);
                                            } catch (e) {
                                                return;
                                            }

                                            if (playerContainer.noFallChecked && getTile(getPlayerX(),
                                            getPlayerY() - 3.5,
                                            getPlayerZ()) != 0) {
                                                continue;
                                            }

                                            setVelX(player, getFaceXSpeed() * Config.suprtSpeed);
                                            setVelY(player, getFaceYSpeed() * Config.suprtSpeed);
                                            setVelZ(player, getFaceZSpeed() * Config.suprtSpeed);

                                        }
                                    });
                                    pvpContainer.jetThread.start();
                                } else {
                                    pvpContainer.jetThread.interrupt();
                                }
                                playerContainer.jetFloatButtonIsChecked = isChecked;
                            }
                        });
                    } else {
                        if (pvpContainer.jetThread != null) {
                            pvpContainer.jetThread.interrupt();
                        }
                        playerContainer.jetFloatButtonIsChecked = false;
                        playerContainer.jet.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.jetChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键行走",
                description: "启用一键行走按钮",
                isChecked: playerContainer.walkChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "Player Module",
                        message: "Auto Walk - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            stateful: true,
                            type: "walk",
                            text: "走",
                            container: playerContainer,
                            isChecked: playerContainer.walkFloatButtonIsChecked,
                            onChecked: function(isChecked) {
                                if (isChecked) {
                                    var player = getPlayerEnt();
                                    pvpContainer.walkThread = java.lang.Thread(function() {
                                        while (!java.lang.Thread.currentThread()
                                            .isInterrupted()) {
                                            try {
                                                java.lang.Thread.currentThread()
                                                    .sleep(Config.walk);
                                            } catch (e) {
                                                return;
                                            }

                                            setVelX(player, getFaceXSpeed() * Config.suprtSpeed);
                                            setVelZ(player, getFaceZSpeed() * Config.suprtSpeed);
                                        }
                                    });
                                    pvpContainer.walkThread.start();
                                } else {
                                    pvpContainer.walkThread.interrupt();
                                }
                                playerContainer.walkFloatButtonIsChecked = isChecked;
                            }
                        });
                    } else {
                        if (pvpContainer.walkThread != null) {
                            pvpContainer.walkThread.interrupt();
                        }
                        playerContainer.walkFloatButtonIsChecked = false;
                        playerContainer.walk.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.walkChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "双击跳跃飞行",
                description: "启用双击跳跃飞行",
                isChecked: playerContainer.doubleFlyChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "Player Module",
                        message: "Double Fly - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        Player.setCanFly(true);
                    } else {
                        Player.setCanFly(false);
                    }
                    playerContainer.doubleFlyChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "弹性掉落",
                description: "启用弹性衰落",
                isChecked: playerContainer.noFallChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "Player Module",
                        message: "Flex Fall - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        pvpContainer.noFallThread = java.lang.Thread(function() {
                            while (!java.lang.Thread.currentThread()
                                .isInterrupted()) {
                                try {
                                    java.lang.Thread.currentThread()
                                        .sleep(30);
                                } catch (e) {
                                    return;
                                }

                                var id = getTile(getPlayerX(), getPlayerY() - 3.5, getPlayerZ());
                                if (id != 0) {
                                    setVelY(getPlayerEnt(), 0);
                                    setVelY(getPlayerEnt(), 0.3);
                                }

                            }
                        });
                        pvpContainer.noFallThread.start();
                    } else {
                        pvpContainer.noFallThread.interrupt();
                    }
                    playerContainer.noFallChecked = isChecked;
                }
            })]
        });
    });

    var pvpContainer = {};
    register("GUIGroupPVP", function(props) {
        var content = props.content;

        props.container.PVP = Column({
            children: [
            SwitchItem({
                title: "一键点击",
                description: "启用一键点击浮动按钮",
                isChecked: playerContainer.clickChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "PvP Module",
                        message: "Auto Click - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            stateful: true,
                            type: "click",
                            text: "点",
                            container: playerContainer,
                            isChecked: playerContainer.clickFloatButtonIsChecked,
                            onChecked: function(isChecked) {
                                if (isChecked) {
                                    pvpContainer.clickThread = java.lang.Thread(function() {
                                        var instrumentation = android.app.Instrumentation();
                                        while (!java.lang.Thread.currentThread()
                                            .isInterrupted()) {
                                            try {
                                                java.lang.Thread.currentThread()
                                                    .sleep(Config.autoClick);
                                            } catch (e) {
                                                return;
                                            }

                                            try {
                                                instrumentation.sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_F5);
                                            } catch (e) {}
                                        }
                                    });
                                    pvpContainer.clickThread.start();
                                } else {
                                    pvpContainer.clickThread.interrupt();
                                }
                                playerContainer.clickFloatButtonIsChecked = isChecked;
                            }
                        });
                    } else {
                        if (pvpContainer.clickThread != null) {
                            pvpContainer.clickThread.interrupt();
                        }
                        playerContainer.clickFloatButtonIsChecked = false;
                        playerContainer.click.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.clickChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键自瞄",
                description: "启用一键自瞄",
                isChecked: playerContainer.aimbotChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "PvP Module",
                        message: "Aimbot - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            stateful: true,
                            type: "aimbot",
                            text: "瞄",
                            container: playerContainer,
                            isChecked: playerContainer.aimbotFloatButtonIsChecked,
                            onChecked: function(isChecked) {
                                if (isChecked) {
                                    pvpContainer.aimbotThread = createAimbotThread();
                                    pvpContainer.aimbotThread.start();
                                } else {
                                    pvpContainer.aimbotThread.interrupt();
                                }
                                playerContainer.aimbotFloatButtonIsChecked = isChecked;
                            }
                        });
                    } else {
                        if (pvpContainer.aimbotThread != null) {
                            pvpContainer.aimbotThread.interrupt();
                        }
                        playerContainer.aimbotFloatButtonIsChecked = false;
                        playerContainer.aimbot.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.aimbotChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键背瞄",
                description: "启用一键背瞄",
                isChecked: playerContainer.rideChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "PvP Module",
                        message: "Ride - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            stateful: true,
                            type: "ride",
                            text: "背",
                            container: playerContainer,
                            isChecked: playerContainer.rideFloatButtonIsChecked,
                            onChecked: function(isChecked) {
                                if (isChecked) {
                                    pvpContainer.rideThread = createRideThread();
                                    pvpContainer.rideThread.start();
                                } else {
                                    pvpContainer.rideThread.interrupt();
                                }
                                playerContainer.rideFloatButtonIsChecked = isChecked;
                            }
                        });
                    } else {
                        if (pvpContainer.rideThread != null) {
                            pvpContainer.rideThread.interrupt();
                        }
                        playerContainer.rideFloatButtonIsChecked = false;
                        playerContainer.ride.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.rideChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "一键环绕",
                description: "启用一键环绕",
                isChecked: playerContainer.aroundChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "PvP Module",
                        message: "Around - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        send("SmallFloatButton", {
                            stateful: true,
                            type: "around",
                            text: "绕",
                            container: playerContainer,
                            isChecked: playerContainer.aroundFloatButtonIsChecked,
                            onChecked: function(isChecked) {
                                if (isChecked) {
                                    pvpContainer.aroundThread = createAroundThread();
                                    pvpContainer.aroundThread.start();
                                } else {
                                    pvpContainer.aroundThread.interrupt();
                                }
                                playerContainer.aroundFloatButtonIsChecked = isChecked;
                            }
                        });
                    } else {
                        if (pvpContainer.aroundThread != null) {
                            pvpContainer.aroundThread.interrupt();
                        }
                        playerContainer.aroundFloatButtonIsChecked = false;
                        playerContainer.around.send(PopupProps, {
                            dismiss: true
                        });
                    }
                    playerContainer.aroundChecked = isChecked;
                }
            })]
        });
    });

    var worldContainer = {};
    register("GUIGroupWorld", function(props) {
        var content = props.content;

        props.container.World = Column({
            children: [
            SwitchItem({
                title: "变速",
                description: "对游戏进行变速",
                isChecked: worldContainer.speedChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "World Module",
                        message: "Speed - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        ModPE.setGameSpeed(Config.speed);
                    } else {
                        ModPE.setGameSpeed(20);
                    }
                    worldContainer.speedChecked = isChecked;
                }
            }),
            SwitchItem({
                title: "服务器模式",
                description: "开启则使用 Server.getAllPlayers 获取玩家",
                isChecked: Config.serverMode,
                onChecked: function(isChecked) {
					addNotification({
                        title: "World Module",
                        message: "Server Mode - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    Config.serverMode = isChecked;
                    ConfigUtils.save();
                }
            }),
            SwitchItem({
                title: "Reach",
                description: "设置碰撞箱大小",
                isChecked: worldContainer.reachChecked,
                onChecked: function(isChecked) {
					addNotification({
                        title: "World Module",
                        message: "Reach - " + getStateText(isChecked),
                        type: getStateType(isChecked)
                    });
                    if (isChecked) {
                        worldContainer.reachThread = java.lang.Thread(function() {
                            while (!java.lang.Thread.currentThread()
                                .isInterrupted()) {
                                try {
                                    java.lang.Thread.currentThread()
                                        .sleep(30);
                                } catch (e) {
                                    return;
                                }

                                var entity = getNearestByMode(Config.aimbotRadius);
                                Entity.setCollisionSize(entity, Config.reachDiameter, Config.reachHeight);
                            }
                        });
                    } else {
                        if (worldContainer.reachThread != null) {
                            worldContainer.reachThread.interrupt();
                        }
                    }
                    worldContainer.reachChecked = isChecked;
                }
            })]
        });
    });

    var commonContainer = {};
    register("GUIGroupCommon", function(props) {
        var content = props.content;

        props.container.Common = Column({
            children: [
            ButtonItem({
                title: "经验配置",
                description: "对玩家的经验进行快速增加",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "经验配置",
                        description: [
                            "Exp",
                            "一般设置满就够用了"].join("\n"),
                        displayText: "经验",
                        min: 1,
                        max: 32000,
                        progress: Config.exp,
                        onConfigure: function(progress) {
                            Config.exp = progress;
                            ConfigUtils.save();
                            Player.addExp(progress);
                        }
                    });
                }
            }), ]
        });
    });

    var extraContainer = {};
    register("GUIGroupExtra", function(props) {
        var content = props.content;

        props.container.Extra = Column({
            children: [
            SwitchItem({
                title: "Notification",
                description: "在游戏右侧显示气泡通知",
                isChecked: Config.notification,
                onChecked: function(isChecked) {
                    Config.notification = isChecked;
                    ConfigUtils.save();
                    addNotification({
                        title: "Notification",
                        message: "Bubble Notification - " + getStateText(isChecked),
                        type: getStateType(isChecked),
                        force: true
                    });
                }
            })]
        });
    });

    var settingsContainer = {};
    register("GUIGroupSettings", function(props) {
        var content = props.content;

        props.container.Settings = Column({
            children: [
            ButtonItem({
                title: "踏空设置",
                description: "对踏空进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "踏空配置",
                        description: [
                            "Air Jump",
                            "缩放比 10%, 一般设置成 6 就够了"].join("\n"),
                        displayText: "增量",
                        min: 1,
                        max: 20,
                        progress: Config.airJump * 10,
                        onConfigure: function(progress) {
                            Config.airJump = progress / 10;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "点击设置",
                description: "对自动点击进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "点击配置",
                        description: [
                            "Auto Clicker",
                            "设置点击间隔 (ms), 一般设置成 30 就够了"].join("\n"),
                        displayText: "点击延迟",
                        min: 30,
                        max: 1000,
                        progress: Config.autoClick,
                        onConfigure: function(progress) {
                            Config.autoClick = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "变速设置",
                description: "对变速进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "变速配置",
                        description: [
                            "Timer",
                            "数值为 30 时最佳"].join("\n"),
                        displayText: "速度",
                        max: 40,
                        min: 21,
                        progress: Config.speed,
                        onConfigure: function(progress) {
                            Config.speed = progress;
                            ConfigUtils.save();
                            if (worldContainer.speedChecked) {
                                ModPE.setGameSpeed(Config.speed);
                            }
                        }
                    });
                }
            }),
            ButtonItem({
                title: "冲刺设置",
                description: "对冲刺进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "冲刺配置",
                        description: [
                            "Suprt",
                            "数值为 3 时最佳"].join("\n"),
                        displayText: "速度",
                        max: 12,
                        min: 1,
                        progress: Config.suprtSpeed,
                        onConfigure: function(progress) {
                            Config.suprtSpeed = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "喷气设置",
                description: "对喷气进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "喷气配置",
                        description: [
                            "Jet Air",
                            "设置喷气间隔 (ms), 一般设置成 30 就够了"].join("\n"),
                        displayText: "喷气延迟",
                        min: 30,
                        max: 1000,
                        progress: Config.jet,
                        onConfigure: function(progress) {
                            Config.jet = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "行走设置",
                description: "对行走进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "行走配置",
                        description: [
                            "Auto Walk",
                            "设置行走间隔 (ms), 一般设置成 30 就够了"].join("\n"),
                        displayText: "行走延迟",
                        min: 30,
                        max: 1000,
                        progress: Config.walk,
                        onConfigure: function(progress) {
                            Config.walk = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "自瞄设置",
                description: "对自瞄进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "自瞄配置",
                        description: [
                            "Aimbot",
                            "设置校准间隔 (ms), 一般设置成 30 就够了"].join("\n"),
                        displayText: "自瞄延迟",
                        min: 1,
                        max: 1000,
                        progress: Config.aimbot,
                        onConfigure: function(progress) {
                            Config.aimbot = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "自瞄选项设置",
                description: "对自瞄选项进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "自瞄选项配置",
                        description: [
                            "Aimbot Options",
                            "0 为玩家, 1 为生物, 3 为玩家和生物"].join("\n"),
                        displayText: "模式",
                        min: 0,
                        max: 3,
                        progress: Config.aimbotOptions,
                        onConfigure: function(progress) {
                            Config.aimbotOptions = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "自瞄半径设置",
                description: "对自瞄半径进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "自瞄半径配置",
                        description: [
                            "Aimbot Radius",
                            "默认 6 就够了"].join("\n"),
                        displayText: "半径",
                        min: 6,
                        max: 40,
                        progress: Config.aimbotRadius,
                        onConfigure: function(progress) {
                            Config.aimbotRadius = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "Reach 直径设置",
                description: "对 Reach 直径进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "Reach 直径配置",
                        description: [
                            "Reach Diameter",
                            "默认 12 就够了"].join("\n"),
                        displayText: "直径",
                        min: 6,
                        max: 48,
                        progress: Config.reachDiameter,
                        onConfigure: function(progress) {
                            Config.reachDiameter = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "Reach 高度设置",
                description: "对 Reach 高度进行配置",
                buttonText: "配置",
                onClick: function() {
                    send("Configure", {
                        title: "Reach 高度配置",
                        description: [
                            "Reach Height",
                            "默认 6 就够了"].join("\n"),
                        displayText: "直径",
                        min: 4,
                        max: 48,
                        progress: Config.reachHeight,
                        onConfigure: function(progress) {
                            Config.reachHeight = progress;
                            ConfigUtils.save();
                        }
                    });
                }
            }),
            ButtonItem({
                title: "导出配置",
                description: "对当前的配置进行导出",
                buttonText: "导出",
                onClick: function() {
                    ConfigUtils.exports(function(err) {
                        Ui(function() {
                            if (err) {
                                Tip({
                                    text: "保存失败: " + err
                                });
                            } else {
                                Tip({
                                    text: "保存成功, 在: /storage/emulated/0/MuCuteJS.conf"
                                });
                            }
                        });
                    });
                }
            }),
            ButtonItem({
                title: "导入配置",
                description: "对外部配置 (/storage/emulated/0/MuCuteJS.conf) 进行导入",
                buttonText: "导入",
                onClick: function() {
                    ConfigUtils.imports(function(err) {
                        Ui(function() {
                            if (err) {
                                Tip({
                                    text: "导入失败: " + err
                                });
                            } else {
                                Dialog({
                                    titleText: "重启游戏",
                                    children: [
                                    Text({
                                        text: "重启游戏以生效",
                                        textSize: 12,
                                        color: parseColor("#FF828282"),
                                        layoutParams: {
                                            width: -1,
                                            height: -1
                                        },
                                        gravity: CENTER
                                    })],
                                    leftText: "确定",
                                    leftOnClick: function() {
                                        ctx.finish();
                                    }
                                });
                                Tip({
                                    text: "导入成功, 重启以生效"
                                });
                            }
                        });
                    });
                }
            }),
            ButtonItem({
                title: "清空配置",
                description: "还原至默认配置",
                buttonText: "清空",
                onClick: function() {
                    var dialog = Dialog({
                        titleText: "清空配置",
                        children: [
                        Text({
                            text: "你确定要清空配置吗?",
                            textSize: 12,
                            color: parseColor("#FF828282"),
                            layoutParams: {
                                width: -1,
                                height: -1
                            },
                            gravity: CENTER
                        })],
                        leftText: "确定",
                        rightText: "取消",
                        leftOnClick: function() {
                            try {
                                ConfigUtils.clear();
                                Dialog({
                                    titleText: "重启游戏",
                                    children: [
                                    Text({
                                        text: "重启游戏以生效",
                                        textSize: 12,
                                        color: parseColor("#FF828282"),
                                        layoutParams: {
                                            width: -1,
                                            height: -1
                                        },
                                        gravity: CENTER
                                    })],
                                    leftText: "确定",
                                    leftOnClick: function() {
                                        ctx.finish();
                                    }
                                });
                                Tip({
                                    text: "清空配置成功, 重启游戏以生效"
                                });
                            } catch (err) {
                                Tip({
                                    text: "清空配置失败: " + err
                                });
                            }
                            dialog.send(PopupProps, {
                                dismiss: true
                            });
                        },
                        rightOnClick: function() {
                            dialog.send(PopupProps, {
                                dismiss: true
                            });
                        }
                    });
                }
            }),
            ButtonItem({
                title: "关于",
                description: "关于本 ModPE 以及其版权",
                buttonText: "查看",
                onClick: function() {
                    send("AboutProps");
                }
            })]
        });
    });

    register("AboutProps", function() {
        var popup = Dialog({
            titleText: "MuCuteJS",
            children: [
            ColumnScroll({
                layoutParams: {
                    width: -1,
                    height: -1
                },
                fadingEdgeOrientation: "vertical",
                fadingEdgeLength: dip2px(15),
                paddings: [0, dip2px(15), 0, 0],
                children: [
                Text({
                    text: parseHtml([
                        "<font color=#7f7fd5>SuMuCheng is very very cute!</font>",
                        "My modpe opus: Your Hack，Color Hack、苦小帕,、AmodLite",
                        "For before, to future.",
                        "Borrowed Part: MIX - ClickFX, use AnimatorSet for calibration optimization",
                        "CreeperUI - GUI (Also called guibox?)",
                        "Author: SuMuCheng (Also called xiaoHan)",
                        "QQ: 3578557729",
                        "QQ Group: 1031450748",
                        "MuCuteJS Version: v1.0",
                        "MuCuteUI Version: v1.0",
                        "For code, for every",
                        "Copyright: MuCuteUI is free using, you must not opensource your modified code.",
                        "<strong><font color=#7f7fd5>2023 SuMuCheng All Rights Reserved</font></strong>"].join("<br/>")),
                    textSize: 12,
                    color: parseColor("#FF828282")
                })]
            })],
            leftText: "确定",
            leftOnClick: function() {
                popup.send(PopupProps, {
                    dismiss: true
                });
            }
        });
    });

    register("Configure", function(props) {
        props = isUndef(props) ? {} : props;
        var savedProgress = props.progress;
        var progressText = Text({
            text: props.displayText + ": " + props.progress,
            color: parseColor("#828282"),
            gravity: CENTER,
            textSize: 12,
            layoutParams: {
                width: -2,
                height: -2,
            }
        });

        var dialog = Dialog({
            titleText: isUndef(props.title) ? "功能配置" : props.title,
            children: [
            Column({
                layoutParams: {
                    width: -1,
                    height: -1
                },
                gravity: CENTER,
                children: [
                Text({
                    text: props.description,
                    color: parseColor("#828282"),
                    gravity: CENTER,
                    textSize: 12,
                    layoutParams: {
                        width: -2,
                        height: -2
                    }
                }),
                Slider({
                    layoutParams: {
                        width: -1,
                        height: dip2px(10),
                        margins: [0, dip2px(5), 0, dip2px(5)]
                    },
                    max: props.max,
                    min: props.min,
                    progress: props.progress,
                    onProgress: function(progress) {
                        savedProgress = progress;
                        progressText.send(TextProps, {
                            text: props.displayText + ": " + progress
                        });
                    }
                }),
                progressText]
            })],
            leftText: "确定",
            rightText: "取消",
            leftOnClick: function() {
                dialog.send(PopupProps, {
                    dismiss: true
                });
                if (isNotUndef(props.onConfigure)) {
                    props.onConfigure(savedProgress);
                }
            },
            rightOnClick: function() {
                dialog.send(PopupProps, {
                    dismiss: true
                });
            }
        });

    });

    function getYawRad() {
        return getYaw() * Math.PI / 180;
    }

    function getPitchRad() {
        return getPitch() * Math.PI / 180;
    }

    function getFaceXSpeed() {
        return -Math.sin(getYawRad()) * Math.cos(getPitchRad());
    }

    function getFaceYSpeed() {
        return -Math.sin(getPitchRad());
    }

    function getFaceZSpeed() {
        return Math.cos(getYawRad()) * Math.cos(getPitchRad());
    }

    function getNearestEntity(radius, onlyPlayer) {
        var entities = Entity.getAll();
        var minDistance = radius;
        var nearestEntity = null;
        for (var index = 0; index < entities.length; index++) {
            var entity = entities[index];
            var distanceX = Entity.getX(entity) - getPlayerX();
            var distanceY = Entity.getY(entity) - getPlayerY();
            var distanceZ = Entity.getZ(entity) - getPlayerZ();

            // 三维两点间坐标公式 — distance = sqrt((x2-x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
            var distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2) + Math.pow(distanceZ, 2));

            /* distance < radius 代表在指定半径内, 而不越界
             * distance > 0 代表玩家和当前实体没有重叠
             * Entity.getHealth(entity) > 0 代表实体具有生命
             */
            if (onlyPlayer) {
                if (distance < minDistance && distance > 0 && Entity.getHealth(entity) >= 1 && Player.isPlayer(entity)) {
                    // 进行距离最短交换
                    minDistance = distance;
                    nearestEntity = entity;
                }
                continue;
            }
            if (distance < minDistance && distance > 0 && Entity.getHealth(entity) >= 1 && !Player.isPlayer(entity)) {
                // 进行距离最短交换
                minDistance = distance;
                nearestEntity = entity;
            }
        }
        return nearestEntity;
    }

    function getNearestPlayer(radius) {
        if (!Config.serverMode) {
            return getNearestEntity(radius, true);
        }
        var players = Server.getAllPlayers();
        var minDistance = radius;
        var nearestPlayer = null;
        for (var index = 0; index < players.length; index++) {
            var player = players[index];
            var distanceX = Entity.getX(player) - getPlayerX();
            var distanceY = Entity.getY(player) - getPlayerY();
            var distanceZ = Entity.getZ(player) - getPlayerZ();

            // 三维两点间坐标公式 — distance = sqrt((x2-x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
            var distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2) + Math.pow(distanceZ, 2));

            /* distance < radius 代表在指定半径内, 而不越界
             * distance > 0 代表玩家和当前实体没有重叠
             * Entity.getHealth(entity) > 0 代表实体具有生命
             */
            if (distance < minDistance && distance > 0 && Entity.getHealth(player) >= 1) {
                // 进行距离最短交换
                minDistance = distance;
                nearestPlayer = player;
            }
        }
        return nearestPlayer;
    }

    function getNearestByMode(radius) {
        if (Config.aimbotOptions == 0) {
            return getNearestPlayer(radius);
        } else if (Config.aimbotOptions == 1) {
            return getNearestEntity(radius);
        } else {
            var nearestPlayer = getNearestPlayer(radius);
            var nearestEntity = getNearestEntity(radius);

            if (nearestPlayer && !nearestEntity) {
                return nearestPlayer;
            }

            if (nearestEntity && !nearestPlayer) {
                return nearestEntity;
            }

            var playerDistanceX = Entity.getX(nearestPlayer) - getPlayerX();
            var playerDistanceY = Entity.getY(nearestPlayer) - getPlayerY();
            var playerDistanceZ = Entity.getZ(nearestPlayer) - getPlayerZ();
            var entityDistanceX = Entity.getX(nearestEntity) - getPlayerX();
            var entityDistanceY = Entity.getY(nearestEntity) - getPlayerY();
            var entityDistanceZ = Entity.getZ(nearestEntity) - getPlayerZ();

            // 三维两点间坐标公式 — distance = sqrt((x2-x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
            var playerDistance = Math.sqrt(Math.pow(playerDistanceX, 2) + Math.pow(playerDistanceY, 2) + Math.pow(playerDistanceZ, 2));
            var entityDistance = Math.sqrt(Math.pow(entityDistanceX, 2) + Math.pow(entityDistanceY, 2) + Math.pow(entityDistanceZ, 2));
            if (playerDistance < entityDistance && playerDistance > 0 && Entity.getHealth(nearestPlayer) >= 1) {
                return nearestPlayer;
            } else if (entityDistance < playerDistance && entityDistance > 0 && Entity.getHealth(nearestEntity) >= 1) {
                return nearestEntity;
            } else {
                return null;
            }
        }
    }

    function createAimbotThread() {
        return java.lang.Thread(function() {
            while (!java.lang.Thread.currentThread()
                .isInterrupted()) {
                try {
                    java.lang.Thread.currentThread()
                        .sleep(Config.aimbot);
                } catch (e) {
                    return;
                }

                var entity = getNearestByMode(Config.aimbotRadius);
                if (entity == null) {
                    continue;
                }


                var x = Entity.getX(entity) - getPlayerX();
                var y = Entity.getY(entity) - getPlayerY();
                var z = Entity.getZ(entity) - getPlayerZ();

                if (Entity.getEntityTypeId(entity) != 63) {
                    y += 0.5;
                }
                var a = 0.5 + Entity.getX(entity);
                var b = Entity.getY(entity);
                var c = 0.5 + Entity.getZ(entity);
                var len = Math.sqrt(x * x + y * y + z * z);
                var y = y / len;
                var pitch = Math.asin(y);
                pitch = pitch * 180.0 / Math.PI;
                pitch = -pitch;
                var yaw = -Math.atan2(a - (Player.getX() + 0.5), c - (Player.getZ() + 0.5)) * (180 / Math.PI);
                if (pitch < 89 && pitch > -89) {
                    setRot(Player.getEntity(), yaw, pitch - 2);
                }

            }
        });
    }

    function createRideThread() {
        return java.lang.Thread(function() {
            var currentEntity = null;
            while (!java.lang.Thread.currentThread()
                .isInterrupted()) {
                try {
                    java.lang.Thread.currentThread()
                        .sleep(Config.aimbot);
                } catch (e) {
                    return;
                }

                var entity = currentEntity;
                if (entity == null || (entity != null && Entity.getHealth(currentEntity) == 0)) {
                    entity = getNearestByMode(Config.aimbotRadius);
                }
                if (entity == null) {
                    continue;
                }
                currentEntity = entity;

                var yaw = Entity.getYaw(entity) - 180;
                var pointX = Entity.getX(entity) - Math.sin(yaw * Math.PI / 180) * 2;
                var pointY = Entity.getY(entity) + 2.5;
                var pointZ = Entity.getZ(entity) + Math.cos(yaw * Math.PI / 180) * 2;
                Entity.setRot(Player.getEntity(), yaw + 180, 30);
                Entity.setPosition(Player.getEntity(), pointX, pointY, pointZ);
                Entity.setVelY(getPlayerEnt(), 0);
            }
        });
    }

    function createAroundThread() {
        return java.lang.Thread(function() {
            var currentEntity = null;
            while (!java.lang.Thread.currentThread()
                .isInterrupted()) {
                try {
                    java.lang.Thread.currentThread()
                        .sleep(Config.aimbot + 500);
                } catch (e) {
                    return;
                }

                var entity = currentEntity;
                if (entity == null || (entity != null && Entity.getHealth(currentEntity) == 0)) {
                    entity = getNearestByMode(Config.aimbotRadius);
                }
                if (entity == null) {
                    continue;
                }
                currentEntity = entity;

                var yaw = Math.random() * 360 - 180;
                var pointX = Entity.getX(entity) - Math.sin(yaw * Math.PI / 180) * 2;
                var pointY = Entity.getY(entity) + 2.5;
                var pointZ = Entity.getZ(entity) + Math.cos(yaw * Math.PI / 180) * 2;
                Entity.setRot(Player.getEntity(), yaw + 180, 30);
                Entity.setPosition(Player.getEntity(), pointX, pointY, pointZ);
                Entity.setVelY(getPlayerEnt(), 0);
            }
        });
    }

    register("SmallFloatButton", function(props) {
        props = isUndef(props) ? {} : props;
        var stateful = props.stateful;
        var isChecked = props.isChecked;
        var onChecked = props.onChecked;
        var onClick = props.onClick;
        var popup = null;
        var x = W() - dip2px(50);
        var y = H() - H() / 2;
        var text = Text({
            layoutParams: {
                width: -2,
                height: -2,
                gravity: CENTER
            },
            text: props.text,
            textSize: 12,
            color: stateful === true ? (isChecked ? parseColor("#FF7f7fd5") : parseColor("#FF212121")) : parseColor("#FF212121"),
            gravity: CENTER
        });

        var content = Column({
            focusable: true,
            clickable: true,
            layoutParams: {
                width: -1,
                height: -1
            },
            gravity: CENTER,
            background: GradientDrawable({
                color: parseColor("#FFF5F5F7"),
                radius: dip2px(7)
            }),
            onClick: function() {
                if (stateful === true) {
                    var fromColor = isChecked ? parseColor("#FF7f7fd5") : parseColor("#FF212121");
                    var toColor = 0;
                    isChecked = !isChecked;
                    toColor = isChecked ? parseColor("#FF7f7fd5") : parseColor("#FF212121");
                    ValueAnimator({
                        ofProp: "ofArgb",
                        params: [fromColor, toColor],
                        duration: 150,
                        onUpdate: function(animator) {
                            text.send(TextProps, {
                                color: animator.animatedValue
                            });
                        }
                    });

                    if (isNotUndef(onChecked)) {
                        onChecked(isChecked);
                    }
                }
                if (isNotUndef(onClick)) {
                    onClick();
                }
            },
            children: [
            text]
        });

        var contentView = Column({
            gravity: CENTER,
            children: [
            content]
        });

        var downX = 0;
        var downY = 0;
        var moveX = 0;
        var moveY = 0;
        var vector = 0.3;
        var longClickDown = false;
        var popupComponent = null;
        var contentViewComponent = requireComponent(content);
        contentViewComponent.setOnTouchListener(function(view, event) {
            if (!longClickDown) {
                downX = event.getX();
                downY = event.getY();
            }
            if (longClickDown) {
                switch (event.getAction()) {

                    case 1:
                        longClickDown = false;
                        break;

                    case 2:
                        moveX = parseInt(event.getX() - downX) * vector;
                        moveY = parseInt(event.getY() - downY) * vector;
                        x = x + moveX;
                        y = y + moveY;
                        if (popupComponent === null) {
                            popupComponent = requireComponent(popup);
                        }
                        popupComponent.update(x, y, -1, -1);
                        break;
                }
            }
            return false;
        });

        contentViewComponent.setOnLongClickListener(function() {
            send(VibratorProps);
            longClickDown = true;
            return true;
        });

        popup = Popup({
            width: dip2px(35),
            height: dip2px(35),
            focusable: false,
            gravity: TOP | LEFT,
            pos: [x, y],
            contentView: contentView,
            background: null,
            animation: "Toast"
        });
        props.container[props.type] = popup;
    });

    var NotificationProps = "NotificationProps";
    var Notifications = [];
    var Root = null;
    var Container = null;
    var ContainerArray = null;
    var ContainerPopup = null;
    register(NotificationProps, function(props) {
        props = isUndef(props) ? {} : props;
        var title = isUndef(props.title) ? "Module" : props.title;
        var message = props.message;
        var target = null;
        switch (props.type) {
            case "error":
                target = "#FFFF6464";
                break;

            case "warning":
                target = "#FF7f7fd5";
                break;

            default:
                target = "#FF64BE96";
                break;
        }

        var contentView = Column({
            layoutParams: {
                width: -2,
                height: -2
            },
            children: [
            Row({
                layoutParams: {
                    width: -2,
                    height: -2,
                    margins: [dip2px(10), dip2px(10), dip2px(10), dip2px(10)]
                },
                paddings: [0, dip2px(10), 0, dip2px(10)],
                background: GradientDrawable({
                    color: parseColor("#FFFFFFFF"),
                    radius: dip2px(12)
                }),
                elevation: dip2px(6),
                children: [
                View({
                    layoutParams: {
                        width: dip2px(10),
                        height: dip2px(10),
                        margins: [dip2px(10), 0, 0, 0],
                        gravity: CENTER
                    },
                    background: GradientDrawable({
                        color: parseColor(target),
                        radius: dip2px(10)
                    })
                }),
                Column({
                    layoutParams: {
                        width: -2,
                        height: -2,
                        margins: [dip2px(10), 0, dip2px(10), 0],
                        gravity: CENTER
                    },
                    children: [
                    Text({
                        text: title,
                        textSize: 14,
                        color: parseColor("#FF7f7fd5"),
                        singleLine: true
                    }),
                    Text({
                        text: message,
                        textSize: 12,
                        color: parseColor("#FF828282"),
                        singleLine: true
                    })]
                })]
            })]
        });

        if (Root == null) {
            ContainerArray = [];
            Container = Column({
                children: ContainerArray
            });
            Root = Column({
				gravity: BOTTOM,
                children: [
                ColumnScroll({
                    children: [
                    Container]
                })]
            });
        }
        var contentViewComponent = requireComponent(contentView);
        contentViewComponent.post(function() {
            var animateX = ValueAnimator({
                ofProp: "ofFloat",
                params: [contentViewComponent.getWidth(), 0],
                duration: 150,
                onUpdate: function(animator) {
                    var value = animator.animatedValue;
                    contentViewComponent.setX(value);
                },
                start: false
            });
            var animateY = ValueAnimator({
                ofProp: "ofFloat",
                params: [contentViewComponent.getHeight(), 0],
                duration: 150,
                onUpdate: function(animator) {
                    var value = animator.animatedValue;
                    contentViewComponent.setTranslationY(value);
                },
                start: false
            });
            AnimatorSet({
                together: [animateX, animateY]
            });
        });

        Container.send(ColumnProps, {
            appendChildren: [contentView]
        });
        ContainerArray.push(contentView);

        delayed(function() {
            if (ContainerArray.length > 0) {
                var thisView = ContainerArray[ContainerArray.length - 1];
                var thisComponent = requireComponent(thisView);
                var animateX = ValueAnimator({
                    ofProp: "ofFloat",
                    params: [0, thisComponent.getWidth()],
                    duration: 150,
                    onUpdate: function(animator) {
                        var value = animator.animatedValue;
                        thisComponent.setX(value);
                    },
                    start: false
                });
                var animateY = ValueAnimator({
                    ofProp: "ofFloat",
                    params: [0, thisComponent.getHeight()],
                    duration: 150,
                    onUpdate: function(animator) {
                        var value = animator.animatedValue;
                        thisComponent.setTranslationY(value);
                    },
                    onFinished: function() {
                        Container.send(ColumnProps, {
                            removeChildren: [
                            ContainerArray[ContainerArray.length - 1]]
                        });
                        ContainerArray.splice(ContainerArray.length - 1, 1);
                    },
                    start: false
                });
                AnimatorSet({
                    together: [animateX, animateY]
                });
            }
            if (ContainerArray.length == 0) {
                ContainerPopup.send(PopupProps, {
                    dismiss: true
                });
                Root = null;
                ContainerPopup = null;
            }
        }, 2500 * ContainerArray.length);


        if (ContainerPopup != null) {
            return;
        }
        ContainerPopup = Popup({
            width: -2,
            height: -2,
            focusable: false,
            gravity: BOTTOM | RIGHT,
            pos: [0, 0],
            contentView: Root,
            background: null,
            animation: "Translucent"
        });
    });

    function addNotification(props) {
        if (!props.force && !Config.notification) {
            return;
        }
        withs(function() {
            send(NotificationProps, props);
        }, Ui)();
    }

    function getStateText(bool) {
        return bool ? "On" : "Off";
    }

    function getStateType(bool) {
        return bool ? "success" : "error";
    }

})();